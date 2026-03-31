"""QBO → DB seeding service. Pulls data from QBO and populates all tables needed for form filling."""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from .client import QBOReadOnlyClient

logger = logging.getLogger(__name__)


@dataclass
class SeedResult:
    """Result of a seeding operation."""
    entity_id: str
    tax_year: int
    accounts_synced: int = 0
    trial_balance_lines: int = 0
    facts_derived: int = 0
    balance_sheet_lines: int = 0
    errors: list[str] = field(default_factory=list)
    seeded_at: str = ""

    def __post_init__(self):
        if not self.seeded_at:
            self.seeded_at = datetime.now(timezone.utc).isoformat()

    @property
    def success(self) -> bool:
        return len(self.errors) == 0


class QBOSeeder:
    """Orchestrates QBO → DB population for one entity + tax year.

    The seeding pipeline:
      1. Pull CompanyInfo → entity_profiles
      2. Pull Chart of Accounts → canonical_ledger_accounts
      3. Pull Trial Balance report → trial_balance_lines
      4. Pull Balance Sheet report → balance_sheet_periods (BOY + EOY)
      5. Return structured data for TS-side engines to compute tax_facts

    NOTE: The actual tax_facts derivation happens on the TS side
    (TaxFactsEngine + ScheduleKEngine + BalanceSheetEngine + ReconciliationEngine).
    This service provides the raw QBO data those engines consume.
    """

    def __init__(self, client: QBOReadOnlyClient):
        self.client = client

    def seed_company_info(self, realm_id: str) -> dict[str, Any]:
        """Pull CompanyInfo and return entity_profiles-compatible dict."""
        data = self.client.get(f"companyinfo/{realm_id}")
        info = data.get("CompanyInfo", {})

        addr = info.get("CompanyAddr", {})
        return {
            "legal_name": info.get("CompanyName", ""),
            "ein": info.get("EIN", ""),
            "address_line1": addr.get("Line1", ""),
            "address_city": addr.get("City", ""),
            "address_state": addr.get("CountrySubDivisionCode", ""),
            "address_zip": addr.get("PostalCode", ""),
            "fiscal_year_end_month": info.get("FiscalYearStartMonth", 1),
            "accounting_method": "Cash",  # QBO doesn't expose this directly
        }

    def seed_accounts(self) -> list[dict[str, Any]]:
        """Pull all accounts from QBO Chart of Accounts."""
        data = self.client.query("SELECT * FROM Account MAXRESULTS 1000")
        accounts = data.get("QueryResponse", {}).get("Account", [])

        result = []
        for acct in accounts:
            result.append({
                "account_id": acct.get("Id"),
                "account_name": acct.get("Name", ""),
                "account_number": acct.get("AcctNum", ""),
                "account_type": acct.get("AccountType", ""),
                "account_subtype": acct.get("AccountSubType", ""),
                "normal_balance": "credit" if acct.get("AccountType", "") in (
                    "Income", "Other Income", "Equity", "Accounts Payable",
                    "Credit Card", "Other Current Liability", "Long Term Liability",
                ) else "debit",
                "is_active": acct.get("Active", True),
                "current_balance": acct.get("CurrentBalance", 0),
            })
        return result

    def seed_trial_balance(self, tax_year: int) -> list[dict[str, Any]]:
        """Pull Trial Balance report for the given tax year."""
        data = self.client.get("reports/TrialBalance", {
            "start_date": f"{tax_year}-01-01",
            "end_date": f"{tax_year}-12-31",
        })
        return self._parse_report_rows(data)

    def seed_balance_sheet_eoy(self, tax_year: int) -> list[dict[str, Any]]:
        """Pull Balance Sheet as of year-end (EOY)."""
        data = self.client.get("reports/BalanceSheet", {
            "date": f"{tax_year}-12-31",
        })
        return self._parse_report_rows(data)

    def seed_balance_sheet_boy(self, tax_year: int) -> list[dict[str, Any]]:
        """Pull Balance Sheet as of prior year-end (BOY = prior year EOY)."""
        data = self.client.get("reports/BalanceSheet", {
            "date": f"{tax_year - 1}-12-31",
        })
        return self._parse_report_rows(data)

    def seed_profit_and_loss(self, tax_year: int) -> list[dict[str, Any]]:
        """Pull P&L report for cross-checking."""
        data = self.client.get("reports/ProfitAndLoss", {
            "start_date": f"{tax_year}-01-01",
            "end_date": f"{tax_year}-12-31",
        })
        return self._parse_report_rows(data)

    def seed_all(
        self,
        entity_id: str,
        realm_id: str,
        tax_year: int,
    ) -> SeedResult:
        """Run the complete seeding pipeline. Returns structured data for TS engines."""
        result = SeedResult(entity_id=entity_id, tax_year=tax_year)

        try:
            # 1. Company info
            company = self.seed_company_info(realm_id)
            logger.info("Seeded company info: %s", company.get("legal_name"))

            # 2. Chart of accounts
            accounts = self.seed_accounts()
            result.accounts_synced = len(accounts)
            logger.info("Seeded %d accounts", len(accounts))

            # 3. Trial balance
            tb_rows = self.seed_trial_balance(tax_year)
            result.trial_balance_lines = len(tb_rows)
            logger.info("Seeded %d trial balance lines", len(tb_rows))

            # 4. Balance sheet (EOY + BOY)
            bs_eoy = self.seed_balance_sheet_eoy(tax_year)
            bs_boy = self.seed_balance_sheet_boy(tax_year)
            result.balance_sheet_lines = len(bs_eoy) + len(bs_boy)
            logger.info("Seeded %d balance sheet lines (EOY: %d, BOY: %d)",
                        result.balance_sheet_lines, len(bs_eoy), len(bs_boy))

        except Exception as exc:
            result.errors.append(str(exc))
            logger.error("Seeding failed for %s/%d: %s", entity_id, tax_year, exc)

        return result

    def _parse_report_rows(self, report_data: dict[str, Any]) -> list[dict[str, Any]]:
        """Parse QBO report JSON into flat rows with account info and amounts."""
        rows: list[dict[str, Any]] = []

        columns = report_data.get("Columns", {}).get("Column", [])
        col_names = [c.get("ColTitle", "") for c in columns]

        def walk_rows(row_data: list[dict], depth: int = 0) -> None:
            for row in row_data:
                row_type = row.get("type", "")
                col_data = row.get("ColData", [])

                if row_type == "Data" and col_data:
                    parsed = {"depth": depth}
                    for i, col in enumerate(col_data):
                        key = col_names[i] if i < len(col_names) else f"col_{i}"
                        parsed[key] = col.get("value", "")
                        if col.get("id"):
                            parsed[f"{key}_id"] = col["id"]
                    rows.append(parsed)

                # Recurse into sub-rows (sections)
                sub = row.get("Rows", {}).get("Row", [])
                if sub:
                    walk_rows(sub, depth + 1)

                # Also handle Summary rows
                summary = row.get("Summary", {}).get("ColData", [])
                if summary and row_type == "Section":
                    parsed = {"depth": depth, "is_summary": True}
                    for i, col in enumerate(summary):
                        key = col_names[i] if i < len(col_names) else f"col_{i}"
                        parsed[key] = col.get("value", "")
                    rows.append(parsed)

        report_rows = report_data.get("Rows", {}).get("Row", [])
        walk_rows(report_rows)
        return rows
