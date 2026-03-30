/**
 * Fixed asset record — stored in DB or imported from QBO fixed asset accounts.
 */
export interface FixedAsset {
  asset_id: string;
  description: string;
  asset_class: string; // machinery, vehicle, building, furniture, computer, land, leasehold, intangible
  date_placed_in_service: string; // ISO date
  date_disposed?: string;
  cost_basis: number;
  salvage_value: number;
  recovery_period_years: number; // 3,5,7,15,27.5,39
  depreciation_method: string; // MACRS, SL
  convention: string; // HY (half-year), MQ (mid-quarter), MM (mid-month)
  section_179_claimed: number;
  bonus_depreciation_claimed: number;
  accum_depreciation_prior: number; // accumulated through prior years
  is_listed_property: boolean;
  business_use_pct: number; // 0-100
}

export interface DepreciationResult {
  asset_id: string;
  current_year_depreciation: number;
  accum_depreciation_total: number;
  section_179_amount: number;
  bonus_depreciation_amount: number;
  regular_depreciation_amount: number;
  remaining_basis: number;
}

export interface DepreciationSummary {
  total_section_179: number;
  total_bonus_depreciation: number;
  total_regular_macrs_current: number;
  total_regular_macrs_prior: number;
  total_current_year: number;
  total_listed_property: number;
  total_all_depreciation: number;
  assets: DepreciationResult[];
}

// MACRS percentage tables (200% declining balance, half-year convention)
const MACRS_RATES: Record<number, number[]> = {
  3: [0.3333, 0.4445, 0.1481, 0.0741],
  5: [0.2000, 0.3200, 0.1920, 0.1152, 0.1152, 0.0576],
  7: [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446],
  15: [0.0500, 0.0950, 0.0855, 0.0770, 0.0693, 0.0623, 0.0590, 0.0590, 0.0591, 0.0590, 0.0591, 0.0590, 0.0591, 0.0590, 0.0591, 0.0295],
  // 27.5 and 39 year use mid-month straight-line (simplified)
};

/**
 * Compute depreciation for a single asset in the given tax year.
 */
function computeAssetDepreciation(asset: FixedAsset, taxYear: number): DepreciationResult {
  const pisYear = new Date(asset.date_placed_in_service).getFullYear();
  const yearIndex = taxYear - pisYear; // 0 = first year

  // Disposed assets get no depreciation after disposal year
  if (asset.date_disposed) {
    const dispYear = new Date(asset.date_disposed).getFullYear();
    if (taxYear > dispYear) {
      return { asset_id: asset.asset_id, current_year_depreciation: 0, accum_depreciation_total: asset.accum_depreciation_prior, section_179_amount: 0, bonus_depreciation_amount: 0, regular_depreciation_amount: 0, remaining_basis: asset.cost_basis - asset.accum_depreciation_prior };
    }
  }

  // Land is not depreciable
  if (asset.asset_class === "land") {
    return { asset_id: asset.asset_id, current_year_depreciation: 0, accum_depreciation_total: 0, section_179_amount: 0, bonus_depreciation_amount: 0, regular_depreciation_amount: 0, remaining_basis: asset.cost_basis };
  }

  const depreciableBasis = (asset.cost_basis - asset.section_179_claimed - asset.bonus_depreciation_claimed) * (asset.business_use_pct / 100);

  let regularDepr = 0;
  const rates = MACRS_RATES[asset.recovery_period_years];

  if (rates && yearIndex >= 0 && yearIndex < rates.length) {
    regularDepr = depreciableBasis * rates[yearIndex];
  } else if (asset.recovery_period_years === 27.5 || asset.recovery_period_years === 39) {
    // Straight-line for real property
    if (yearIndex >= 0 && yearIndex < asset.recovery_period_years) {
      regularDepr = depreciableBasis / asset.recovery_period_years;
      if (yearIndex === 0) regularDepr *= 0.5; // half-year first year (simplified mid-month)
    }
  }

  // Section 179 and bonus only in first year
  const s179 = yearIndex === 0 ? asset.section_179_claimed : 0;
  const bonus = yearIndex === 0 ? asset.bonus_depreciation_claimed : 0;

  const currentYear = s179 + bonus + regularDepr;
  const accumTotal = asset.accum_depreciation_prior + currentYear;

  return {
    asset_id: asset.asset_id,
    current_year_depreciation: Math.round(currentYear * 100) / 100,
    accum_depreciation_total: Math.round(accumTotal * 100) / 100,
    section_179_amount: s179,
    bonus_depreciation_amount: bonus,
    regular_depreciation_amount: Math.round(regularDepr * 100) / 100,
    remaining_basis: Math.round((asset.cost_basis - accumTotal) * 100) / 100,
  };
}

/**
 * Compute depreciation for all assets and return summary for Form 4562.
 */
export function computeDepreciation(assets: FixedAsset[], taxYear: number): DepreciationSummary {
  const results = assets.map(a => computeAssetDepreciation(a, taxYear));

  const priorYearAssets = assets.filter(a => new Date(a.date_placed_in_service).getFullYear() < taxYear);
  const currentYearAssets = assets.filter(a => new Date(a.date_placed_in_service).getFullYear() === taxYear);

  const priorResults = priorYearAssets.map(a => computeAssetDepreciation(a, taxYear));
  const currentResults = currentYearAssets.map(a => computeAssetDepreciation(a, taxYear));

  const listedResults = assets.filter(a => a.is_listed_property).map(a => computeAssetDepreciation(a, taxYear));

  return {
    total_section_179: results.reduce((s, r) => s + r.section_179_amount, 0),
    total_bonus_depreciation: results.reduce((s, r) => s + r.bonus_depreciation_amount, 0),
    total_regular_macrs_current: currentResults.reduce((s, r) => s + r.regular_depreciation_amount, 0),
    total_regular_macrs_prior: priorResults.reduce((s, r) => s + r.regular_depreciation_amount, 0),
    total_current_year: results.reduce((s, r) => s + r.current_year_depreciation, 0),
    total_listed_property: listedResults.reduce((s, r) => s + r.current_year_depreciation, 0),
    total_all_depreciation: results.reduce((s, r) => s + r.current_year_depreciation, 0),
    assets: results,
  };
}
