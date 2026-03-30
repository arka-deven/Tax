export interface TrialBalanceLine {
  tb_line_id: string;
  entity_id: string;
  tax_year: number;
  account_id: string;
  beginning_balance: number;
  activity_debits: number;
  activity_credits: number;
  ending_balance: number;
  adjusted_balance: number;
  adjustment_ids: string[];
  source_refs: string[];
}

export type AdjustmentType = "reclass" | "book_to_tax" | "manual" | "tax_only";
export type AdjustmentDirection = "debit" | "credit";

export interface TaxAdjustment {
  adjustment_id: string;
  entity_id: string;
  tax_year: number;
  adjustment_type: AdjustmentType;
  target_tb_line_id: string;
  amount: number;
  direction: AdjustmentDirection;
  reason_code: string;
  note: string | null;
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  source_refs: string[];
}
