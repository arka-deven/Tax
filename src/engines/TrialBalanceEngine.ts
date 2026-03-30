import type {
  CanonicalLedgerEntry,
  TaxAdjustment,
  TrialBalanceLine,
} from "../models/index.js";

/**
 * Computes TrialBalanceLines from canonical ledger entries.
 * Adjustments are applied as additive overlays — source entries are never mutated.
 */
export function buildTrialBalance(
  entityId: string,
  taxYear: number,
  entries: CanonicalLedgerEntry[],
  adjustments: TaxAdjustment[]
): TrialBalanceLine[] {
  // Group entries by account
  const byAccount = new Map<
    string,
    { debits: number; credits: number; refs: string[] }
  >();

  for (const entry of entries.filter(
    (e) => e.entity_id === entityId && e.tax_year === taxYear
  )) {
    const existing = byAccount.get(entry.account_id) ?? {
      debits: 0,
      credits: 0,
      refs: [],
    };
    existing.debits += entry.debit_amount;
    existing.credits += entry.credit_amount;
    existing.refs.push(entry.canonical_entry_id);
    byAccount.set(entry.account_id, existing);
  }

  // Build unadjusted lines
  const lines = new Map<string, TrialBalanceLine>();
  for (const [accountId, totals] of byAccount) {
    const endingBalance = totals.debits - totals.credits;
    const tbLineId = `tb_${entityId}_${taxYear}_${accountId}`;
    lines.set(accountId, {
      tb_line_id: tbLineId,
      entity_id: entityId,
      tax_year: taxYear,
      account_id: accountId,
      beginning_balance: 0, // placeholder — populated when prior-year carry-forward is available
      activity_debits: totals.debits,
      activity_credits: totals.credits,
      ending_balance: endingBalance,
      adjusted_balance: endingBalance,
      adjustment_ids: [],
      source_refs: totals.refs,
    });
  }

  // Apply adjustments as overlays
  for (const adj of adjustments.filter(
    (a) =>
      a.entity_id === entityId && a.tax_year === taxYear
  )) {
    const line = [...lines.values()].find(
      (l) => l.tb_line_id === adj.target_tb_line_id
    );
    if (!line) continue;

    const delta = adj.direction === "debit" ? adj.amount : -adj.amount;
    line.adjusted_balance += delta;
    line.adjustment_ids.push(adj.adjustment_id);
  }

  return [...lines.values()];
}
