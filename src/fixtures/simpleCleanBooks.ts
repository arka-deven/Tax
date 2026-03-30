import type {
  CanonicalLedgerAccount,
  CanonicalLedgerEntry,
  RawSourceRecord,
} from "../models/index.js";

export const RAW_SOURCE: RawSourceRecord = {
  raw_source_id: "rsr_001",
  source_system: "QBO",
  entity_id: "entity_acme",
  tax_year: 2024,
  payload_json: { note: "fixture — simple clean books" },
  ingested_at: "2025-01-15T00:00:00Z",
  checksum: "abc123",
};

export const ACCOUNTS: CanonicalLedgerAccount[] = [
  {
    canonical_account_id: "acct_revenue",
    raw_source_id: "rsr_001",
    entity_id: "entity_acme",
    account_number: "4000",
    account_name: "Revenue",
    account_type: "Income",
    account_subtype: "Service",
    normal_balance: "credit",
    is_active: true,
    source_refs: ["rsr_001"],
  },
  {
    canonical_account_id: "acct_cogs",
    raw_source_id: "rsr_001",
    entity_id: "entity_acme",
    account_number: "5000",
    account_name: "Cost of Goods Sold",
    account_type: "Cost of Goods Sold",
    account_subtype: "DirectCost",
    normal_balance: "debit",
    is_active: true,
    source_refs: ["rsr_001"],
  },
  {
    canonical_account_id: "acct_expenses",
    raw_source_id: "rsr_001",
    entity_id: "entity_acme",
    account_number: "6000",
    account_name: "General Expenses",
    account_type: "Expenses",
    account_subtype: "OperatingExpense",
    normal_balance: "debit",
    is_active: true,
    source_refs: ["rsr_001"],
  },
];

export const ENTRIES: CanonicalLedgerEntry[] = [
  {
    canonical_entry_id: "entry_001",
    raw_source_id: "rsr_001",
    entity_id: "entity_acme",
    posting_date: "2024-06-30",
    tax_year: 2024,
    debit_amount: 0,
    credit_amount: 500_000,
    account_id: "acct_revenue",
    counterparty_id: null,
    memo: "H1 revenue",
    class_id: null,
    location_id: null,
    source_refs: ["rsr_001"],
  },
  {
    canonical_entry_id: "entry_002",
    raw_source_id: "rsr_001",
    entity_id: "entity_acme",
    posting_date: "2024-06-30",
    tax_year: 2024,
    debit_amount: 200_000,
    credit_amount: 0,
    account_id: "acct_cogs",
    counterparty_id: null,
    memo: "H1 COGS",
    class_id: null,
    location_id: null,
    source_refs: ["rsr_001"],
  },
  {
    canonical_entry_id: "entry_003",
    raw_source_id: "rsr_001",
    entity_id: "entity_acme",
    posting_date: "2024-06-30",
    tax_year: 2024,
    debit_amount: 80_000,
    credit_amount: 0,
    account_id: "acct_expenses",
    counterparty_id: null,
    memo: "H1 G&A",
    class_id: null,
    location_id: null,
    source_refs: ["rsr_001"],
  },
];

export const ACCOUNT_TYPE_MAP = new Map(
  ACCOUNTS.map((a) => [a.canonical_account_id, a.account_type])
);
