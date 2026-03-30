export type NormalBalance = "debit" | "credit";

export interface CanonicalLedgerAccount {
  canonical_account_id: string;
  raw_source_id: string;
  entity_id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  account_subtype: string;
  normal_balance: NormalBalance;
  is_active: boolean;
  source_refs: string[];
}

export interface CanonicalLedgerEntry {
  canonical_entry_id: string;
  raw_source_id: string;
  entity_id: string;
  posting_date: string; // ISO 8601 date
  tax_year: number;
  debit_amount: number;
  credit_amount: number;
  account_id: string;
  counterparty_id: string | null;
  memo: string | null;
  class_id: string | null;
  location_id: string | null;
  source_refs: string[];
}
