import type { TaxCodeMapping, TaxFact, TrialBalanceLine } from "../models/index.js";
import { deriveTaxFacts } from "./TaxFactsEngine.js";
import { deriveScheduleKFacts, allocateK1 } from "./ScheduleKEngine.js";
import { deriveBOYFacts, deriveTotalFacts } from "./BalanceSheetEngine.js";
import { deriveM1Facts, deriveM2Facts } from "./ReconciliationEngine.js";

/**
 * Full pipeline result — all facts from every engine, merged.
 */
export interface PipelineResult {
  /** All tax facts merged from every engine */
  allFacts: TaxFact[];
  /** Counts by source engine */
  counts: {
    core: number;
    scheduleK: number;
    k1: number;
    balanceSheetBOY: number;
    balanceSheetTotals: number;
    m1: number;
    m2: number;
  };
}

/**
 * Owner info needed for K-1 allocation.
 */
interface OwnerAllocation {
  owner_id: string;
  profit_share_pct: number;
  loss_share_pct: number;
}

/**
 * Run the complete fact derivation pipeline for one entity + tax year.
 *
 * Execution order matters — each engine consumes facts from prior engines:
 *   1. TaxFactsEngine (core income/expense/balance sheet facts from trial balance)
 *   2. ScheduleKEngine (distributive share items from core facts)
 *   3. K-1 Allocation (per-owner split of Schedule K)
 *   4. BalanceSheetEngine — BOY facts (from prior year EOY)
 *   5. BalanceSheetEngine — total facts (from all balance sheet facts)
 *   6. ReconciliationEngine — M-1 (book-tax reconciliation)
 *   7. ReconciliationEngine — M-2 (equity analysis, needs prior year M-2)
 */
export function runFullPipeline(params: {
  entityId: string;
  taxYear: number;
  mappings: TaxCodeMapping[];
  tbLines: TrialBalanceLine[];
  owners?: OwnerAllocation[];
  priorYearFacts?: TaxFact[];
}): PipelineResult {
  const { entityId, taxYear, mappings, tbLines, owners, priorYearFacts } = params;

  // 1. Core facts
  const coreFacts = deriveTaxFacts(entityId, taxYear, mappings, tbLines);

  // 2. Schedule K
  const skFacts = deriveScheduleKFacts(entityId, taxYear, coreFacts);

  // 3. K-1 allocation (one set of facts per owner)
  let k1Facts: TaxFact[] = [];
  if (owners && owners.length > 0) {
    k1Facts = allocateK1(entityId, taxYear, skFacts, owners);
  }

  // 4. BOY balance sheet facts from prior year
  const boyFacts = deriveBOYFacts(entityId, taxYear, priorYearFacts ?? []);

  // 5. Merge everything so far for total computation
  const merged = [...coreFacts, ...skFacts, ...boyFacts];
  const totalFacts = deriveTotalFacts(entityId, taxYear, merged);

  // 6. M-1 reconciliation
  const m1Facts = deriveM1Facts(entityId, taxYear, [...coreFacts, ...skFacts]);

  // 7. M-2 equity analysis
  const m2Facts = deriveM2Facts(
    entityId,
    taxYear,
    [...coreFacts, ...skFacts],
    priorYearFacts ?? [],
  );

  // Merge all
  const allFacts = [
    ...coreFacts,
    ...skFacts,
    ...k1Facts,
    ...boyFacts,
    ...totalFacts,
    ...m1Facts,
    ...m2Facts,
  ];

  return {
    allFacts,
    counts: {
      core: coreFacts.length,
      scheduleK: skFacts.length,
      k1: k1Facts.length,
      balanceSheetBOY: boyFacts.length,
      balanceSheetTotals: totalFacts.length,
      m1: m1Facts.length,
      m2: m2Facts.length,
    },
  };
}
