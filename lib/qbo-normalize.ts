import crypto from "crypto";
import type { QBOAccount, QBOCompanyData, QBOTransaction } from "@/lib/qbo-fetch";
import type {
  CanonicalLedgerAccount,
  CanonicalLedgerEntry,
  NormalBalance,
  RawSourceRecord,
} from "@/src/models";

// QBO account classification → normal balance side
const NORMAL_BALANCE_MAP: Record<string, NormalBalance> = {
  Asset: "debit",
  Expense: "debit",
  Liability: "credit",
  Equity: "credit",
  Revenue: "credit",
};

export function buildRawSourceRecord(
  entityId: string,
  taxYear: number,
  payload: QBOCompanyData
): RawSourceRecord {
  const payloadStr = JSON.stringify(payload);
  const checksum = crypto.createHash("sha256").update(payloadStr).digest("hex");

  return {
    raw_source_id: `rsr_${entityId}_${taxYear}_${checksum.slice(0, 12)}`,
    source_system: "QBO",
    entity_id: entityId,
    tax_year: taxYear,
    payload_json: payload,
    ingested_at: new Date().toISOString(),
    checksum,
  };
}

export function normalizeAccounts(
  raw: RawSourceRecord,
  accounts: QBOAccount[]
): CanonicalLedgerAccount[] {
  return accounts.map((a) => ({
    canonical_account_id: `acc_${raw.entity_id}_${a.Id}`,
    raw_source_id: raw.raw_source_id,
    entity_id: raw.entity_id,
    account_number: a.AcctNum ?? a.Id,
    account_name: a.FullyQualifiedName ?? a.Name,
    account_type: a.AccountType,
    account_subtype: a.AccountSubType,
    normal_balance: NORMAL_BALANCE_MAP[a.Classification] ?? "debit",
    is_active: a.Active,
    source_refs: [a.Id],
  }));
}

export function normalizeTransactions(
  raw: RawSourceRecord,
  transactions: QBOTransaction[]
): CanonicalLedgerEntry[] {
  const entries: CanonicalLedgerEntry[] = [];

  for (const txn of transactions) {
    for (const line of txn.Line ?? []) {
      const detail = line.JournalEntryLineDetail;
      if (!detail) continue; // skip non-JE lines (subtotals etc.)

      const accountRef = detail.AccountRef;
      const isDebit = detail.PostingType === "Debit";

      entries.push({
        canonical_entry_id: `entry_${raw.entity_id}_${txn.Id}_${line.Id}`,
        raw_source_id: raw.raw_source_id,
        entity_id: raw.entity_id,
        posting_date: txn.TxnDate,
        tax_year: raw.tax_year,
        debit_amount: isDebit ? line.Amount : 0,
        credit_amount: isDebit ? 0 : line.Amount,
        account_id: `acc_${raw.entity_id}_${accountRef.value}`,
        counterparty_id: detail.Entity?.EntityRef?.value ?? null,
        memo: txn.PrivateNote ?? null,
        class_id: detail.ClassRef?.value ?? null,
        location_id: null,
        source_refs: [txn.Id, line.Id],
      });
    }
  }

  return entries;
}
