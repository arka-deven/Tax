/** Maps a single PDF AcroForm field to a value source */
export interface PdfFieldMapping {
  /** Exact AcroForm field name in the PDF (from discovery script) */
  pdfFieldName: string;
  /** Tax fact name to pull value from (e.g. "gross_receipts_total") */
  factName?: string;
  /** Static string value (e.g. "X" for a checkbox) */
  staticValue?: string;
  /** Compute value from the full context */
  compute?: (ctx: FillContext) => string | undefined;
  /** How to format the value before filling */
  format?: "currency" | "integer" | "percent" | "string" | "boolean";
  /** IRS line number for reference */
  irsLine?: string;
  /** Human-readable description of this field */
  description?: string;
  /** Field requires manual entry by a preparer (signatures, SSNs, per-asset rows) */
  manual?: boolean;
}

/** Complete mapping definition for one IRS form PDF */
export interface FormPdfMapping {
  formCode: string;
  pdfFileName: string;
  taxYear: number;
  fields: PdfFieldMapping[];
}

/** Result of filling a PDF */
export interface FilledPdfResult {
  pdfBytes: Uint8Array;
  filledCount: number;
  totalMapped: number;
  unfilledFields: string[];
}

/** Officer/shareholder data for form population */
export interface OfficerInfo {
  name: string;
  ssn?: string;
  title?: string;
  percentTime: number;
  percentStock: number;
  compensation: number;
  isCommonStock?: boolean;
}

/** Owner/partner data for K-1 population */
export interface OwnerInfo {
  ownerId: string;
  ownerName: string;
  tin?: string;
  ownerType?: string;
  ownershipPct: number;
  profitSharePct: number;
  lossSharePct: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  isManaging?: boolean;
}

/** Fixed asset for 4562 depreciation table rows */
export interface AssetInfo {
  description: string;
  dateInService: string;
  cost: number;
  section179: number;
  depreciationMethod: string;
  recoveryPeriod: number;
  convention: string;
  priorDepreciation: number;
  currentDepreciation: number;
  assetClass: string;
  isListedProperty: boolean;
  businessUsePct: number;
}

/** Capital transaction for 4797 / Schedule D rows */
export interface CapitalTransactionInfo {
  description: string;
  dateAcquired: string;
  dateSold: string;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  holdingPeriod: "short_term" | "long_term";
  form8949Box: string;
}

/** Rental property for 8825 */
export interface RentalPropertyInfo {
  address: string;
  propertyType: string;
  daysRented: number;
  daysPersonalUse: number;
  grossRents: number;
  advertising: number;
  autoTravel: number;
  cleaning: number;
  commissions: number;
  insurance: number;
  legal: number;
  interest: number;
  repairs: number;
  taxes: number;
  utilities: number;
  depreciation: number;
  other: number;
  totalExpenses: number;
  netIncome: number;
}

/** Context passed to the filler engine */
export interface FillContext {
  facts: Record<string, unknown>;
  meta: {
    companyName?: string;
    dbaName?: string;
    ein?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    taxYear: number;
    entityType?: string;
    accountingMethod?: string;
    // Entity profile fields
    dateIncorporated?: string;
    sElectionDate?: string;
    businessStartDate?: string;
    naicsCode?: string;
    principalBusinessActivity?: string;
    principalProductService?: string;
    fiscalYearEndMonth?: number;
    numberOfShareholders?: number;
    numberOfPartners?: number;
    taxExemptStatus?: string;
    websiteUrl?: string;
    inventoryMethod?: string;
    phoneNumber?: string;
    // Home office (Schedule C / 8829)
    homeOfficeSqft?: number;
    homeTotalSqft?: number;
    // Structured array data for table rows
    officers?: OfficerInfo[];
    owners?: OwnerInfo[];
    assets?: AssetInfo[];
    capitalTransactions?: CapitalTransactionInfo[];
    rentalProperties?: RentalPropertyInfo[];
    scheduleBAnswers?: Record<string, string>;
  };
}

// ── Helpers for indexed table-row compute functions ──────────────────────────

/** Get officer at row index, or undefined */
export function officer(ctx: FillContext, idx: number): OfficerInfo | undefined {
  return ctx.meta.officers?.[idx];
}

/** Get owner at row index, or undefined */
export function owner(ctx: FillContext, idx: number): OwnerInfo | undefined {
  return ctx.meta.owners?.[idx];
}

/** Get asset at row index, or undefined */
export function asset(ctx: FillContext, idx: number): AssetInfo | undefined {
  return ctx.meta.assets?.[idx];
}

/** Get capital transaction at row index, or undefined */
export function capTxn(ctx: FillContext, idx: number): CapitalTransactionInfo | undefined {
  return ctx.meta.capitalTransactions?.[idx];
}

/** Get rental property at row index, or undefined */
export function rental(ctx: FillContext, idx: number): RentalPropertyInfo | undefined {
  return ctx.meta.rentalProperties?.[idx];
}

/** Safely get a fact value as a number, or 0 */
export function num(ctx: FillContext, factName: string): number {
  const v = ctx.facts[factName];
  return typeof v === "number" ? v : 0;
}

/** Format a number as IRS currency (whole dollars, no symbol) */
export function currency(val: number | undefined): string {
  if (val === undefined || val === 0) return "";
  return String(Math.round(val));
}

/** Schedule B answer as checkbox value ("1" or "Off") */
export function sbCheck(ctx: FillContext, questionNum: string, expected: string = "yes"): string {
  return ctx.meta.scheduleBAnswers?.[questionNum] === expected ? "1" : "Off";
}
