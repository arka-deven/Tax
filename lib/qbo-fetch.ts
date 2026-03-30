import { getClientForEntity } from "@/lib/qbo-client";
import { realmStore } from "@/lib/token-store";

// ── Base helpers ──────────────────────────────────────────────────────────────

function baseUrl() {
  return process.env.QBO_ENV === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

interface QBOQueryResponse<T> {
  QueryResponse: T;
  time: string;
}

/** Extract JSON from intuit-oauth response (handles both old AuthResponse and new plain object) */
function extractJson(response: any): any {
  if (typeof response.getJson === "function") return response.getJson();
  if (response.json !== undefined) return response.json;
  if (response.body) return typeof response.body === "string" ? JSON.parse(response.body) : response.body;
  throw new Error("Cannot extract JSON from QBO API response");
}

async function qboQuery<T>(entityId: string, query: string): Promise<T> {
  const client = await getClientForEntity(entityId);
  const realmId = realmStore.get(entityId);
  if (!realmId) throw new Error(`No realmId for entity ${entityId}`);

  const url = `${baseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;
  const response = await client.makeApiCall({ url, method: "GET" });
  const body = extractJson(response) as QBOQueryResponse<T>;
  return body.QueryResponse;
}

async function qboGet<T>(entityId: string, path: string): Promise<T> {
  const client = await getClientForEntity(entityId);
  const realmId = realmStore.get(entityId);
  if (!realmId) throw new Error(`No realmId for entity ${entityId}`);

  const url = `${baseUrl()}/v3/company/${realmId}/${path}`;
  const response = await client.makeApiCall({ url, method: "GET" });
  return extractJson(response) as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QBOAccount {
  Id: string;
  Name: string;
  FullyQualifiedName: string;
  AccountType: string;
  AccountSubType: string;
  AcctNum?: string;
  Description?: string;
  Active: boolean;
  CurrentBalance: number;
  CurrentBalanceWithSubAccounts?: number;
  CurrencyRef?: { value: string; name: string };
  Classification: string;
  ParentRef?: { value: string; name: string };
  SubAccount?: boolean;
  TaxCodeRef?: { value: string };
  SyncToken?: string;
  MetaData?: { CreateTime: string; LastUpdatedTime: string };
}

export interface QBOTransactionLine {
  Id: string;
  Amount: number;
  DetailType: string;
  Description?: string;
  JournalEntryLineDetail?: {
    PostingType: "Debit" | "Credit";
    AccountRef: { value: string; name: string };
    ClassRef?: { value: string; name: string };
    DepartmentRef?: { value: string; name: string };
    Entity?: { Type?: string; EntityRef?: { value: string; name: string } };
    TaxCodeRef?: { value: string };
    BillableStatus?: string;
  };
}

export interface QBOTransaction {
  Id: string;
  TxnDate: string;
  DocNumber?: string;
  PrivateNote?: string;
  Memo?: string;
  Adjustment?: boolean;
  Line: QBOTransactionLine[];
  CurrencyRef?: { value: string; name: string };
  ExchangeRate?: number;
  TxnTaxDetail?: { TotalTax?: number };
  MetaData?: { CreateTime: string; LastUpdatedTime: string };
}

// ── Report row types ──────────────────────────────────────────────────────────

export interface GLReportRow {
  /** Account name */
  account_name: string;
  account_id: string;
  account_type: string;
  txn_date: string;
  doc_number: string | null;
  memo: string | null;
  debit: number;
  credit: number;
  balance: number;
  source_txn_id: string | null;
  source_txn_type: string | null;
}

export interface TBReportRow {
  account_id: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
}

// ── CompanyInfo ───────────────────────────────────────────────────────────────

export interface QBOCompanyInfo {
  Id: string;
  CompanyName: string;
  LegalName?: string;
  FederalEin?: string;
  FiscalYearStartMonth?: string; // "January", "February", etc.
  Country?: string;
  CompanyAddr?: {
    Line1?: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string;
  };
  LegalAddr?: {
    Line1?: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string;
  };
  PrimaryPhone?: { FreeFormNumber?: string };
  PrimaryEmailAddr?: { Address?: string };
  WebAddr?: { URI?: string };
  SupportedLanguages?: string;
  IndustryType?: string;
  NameValue?: Array<{ Name: string; Value: string }>;
  MetaData?: { CreateTime: string; LastUpdatedTime: string };
}

// ── Preferences ───────────────────────────────────────────────────────────────

export interface QBOPreferences {
  AccountingInfoPrefs?: {
    BookCloseDate?: string;
    FirstMonthOfFiscalYear?: string;
    TaxYearMonth?: string;
    CustomerTerminology?: string;
    ClassTrackingPerTxn?: boolean;
    ClassTrackingPerTxnLine?: boolean;
    DepartmentTerminology?: string;
    UseAccountNumbers?: boolean;
  };
  TaxPrefs?: {
    PartnerTaxEnabled?: boolean;
    PaySalesTax?: string;
    TaxGroupingPrefs?: { ShowTaxAmtOnStubs?: boolean };
  };
  SalesFormsPrefs?: {
    DefaultTerms?: { value: string };
    DefaultDeliveryInfo?: { DeliveryType?: string };
    ETransactionPaymentEnabled?: boolean;
    ETransactionEnabledStatus?: string;
    IPNSupportEnabled?: boolean;
    DefaultCustomerMessage?: string;
    DefaultShippingBasis?: string;
    DefaultDiscountAccount?: string;
    TrackReimbursableExpensesAsIncome?: boolean;
    UsingProgressInvoicing?: boolean;
    PrintItemizedSalesFormsWithZeroAmounts?: boolean;
    PrintPurchaseOrders?: boolean;
  };
  VendorAndPurchasesPrefs?: {
    TrackingByCustomer?: boolean;
    BillableExpenseTracking?: boolean;
    DefaultTerms?: { value: string };
    POCustomField?: Array<{ CustomField?: unknown[] }>;
  };
  TimeTrackingPrefs?: {
    UseServices?: boolean;
    BillCustomers?: boolean;
    ShowBillRateToAll?: boolean;
    WorkWeekStartDate?: string;
    MarkTimeEntriesBillable?: boolean;
  };
  CurrencyPrefs?: {
    HomeCurrency?: { value: string };
    MultiCurrencyEnabled?: boolean;
  };
  ReportPrefs?: {
    ReportBasis?: "Accrual" | "Cash";
    CalcAgingReportFromTxnDate?: boolean;
  };
  OtherPrefs?: { NameValue?: Array<{ Name: string; Value: string }> };
  Id?: string;
  SyncToken?: string;
  MetaData?: { CreateTime: string; LastUpdatedTime: string };
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function fetchAccounts(entityId: string): Promise<QBOAccount[]> {
  type Result = { Account: QBOAccount[]; startPosition: number; maxResults: number };
  const all: QBOAccount[] = [];
  let offset = 1;
  const pageSize = 1000;
  while (true) {
    const result = await qboQuery<Result>(
      entityId,
      `SELECT * FROM Account STARTPOSITION ${offset} MAXRESULTS ${pageSize}`
    );
    const page = result.Account ?? [];
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function fetchJournalEntries(
  entityId: string,
  taxYear: number
): Promise<QBOTransaction[]> {
  type Result = { JournalEntry: QBOTransaction[]; startPosition: number; maxResults: number };
  const start = `${taxYear}-01-01`;
  const end = `${taxYear}-12-31`;
  const all: QBOTransaction[] = [];
  let offset = 1;
  const pageSize = 1000;
  while (true) {
    const result = await qboQuery<Result>(
      entityId,
      `SELECT * FROM JournalEntry WHERE TxnDate >= '${start}' AND TxnDate <= '${end}' STARTPOSITION ${offset} MAXRESULTS ${pageSize}`
    );
    const page = result.JournalEntry ?? [];
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// Fetch all invoice/bill/expense/purchase transactions for a given year.
// These are stored as raw data so the full QBO payload is auditable,
// and their accounting lines supplement the JournalEntry ledger.

type TxnType =
  | "Invoice"
  | "Bill"
  | "Expense"
  | "Purchase"
  | "Payment"
  | "BillPayment"
  | "CreditMemo"
  | "SalesReceipt"
  | "VendorCredit"
  | "Transfer"
  | "Deposit"
  | "RefundReceipt";

async function fetchTxnType(
  entityId: string,
  txnType: TxnType,
  taxYear: number
): Promise<Record<string, unknown>[]> {
  // Not all types support TxnDate filter — wrap in try/catch
  type GenericRow = Record<string, unknown>;
  type GenericResult = Record<string, GenericRow[]> & { startPosition?: number; maxResults?: number };

  const start = `${taxYear}-01-01`;
  const end = `${taxYear}-12-31`;
  const all: GenericRow[] = [];
  let offset = 1;
  const pageSize = 1000;

  try {
    while (true) {
      const result = await qboQuery<GenericResult>(
        entityId,
        `SELECT * FROM ${txnType} WHERE TxnDate >= '${start}' AND TxnDate <= '${end}' STARTPOSITION ${offset} MAXRESULTS ${pageSize}`
      );
      const page = (result[txnType] as GenericRow[] | undefined) ?? [];
      all.push(...page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
  } catch {
    // Some transaction types may not exist or not be queryable — non-fatal
  }

  return all;
}

export interface QBOCompanyData {
  accounts: QBOAccount[];
  journalEntries: QBOTransaction[];
  invoices: Record<string, unknown>[];
  bills: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  billPayments: Record<string, unknown>[];
  creditMemos: Record<string, unknown>[];
  salesReceipts: Record<string, unknown>[];
  vendorCredits: Record<string, unknown>[];
  transfers: Record<string, unknown>[];
  deposits: Record<string, unknown>[];
  refundReceipts: Record<string, unknown>[];
  companyInfo: QBOCompanyInfo | null;
  preferences: QBOPreferences | null;
}

export async function fetchCompanyInfo(entityId: string): Promise<QBOCompanyInfo | null> {
  const realmId = realmStore.get(entityId);
  if (!realmId) return null;
  try {
    const data = await qboGet<{ CompanyInfo: QBOCompanyInfo }>(
      entityId,
      `companyinfo/${realmId}?minorversion=65`
    );
    return data.CompanyInfo ?? null;
  } catch {
    return null;
  }
}

export async function fetchPreferences(entityId: string): Promise<QBOPreferences | null> {
  try {
    const data = await qboGet<{ Preferences: QBOPreferences }>(
      entityId,
      `preferences?minorversion=65`
    );
    return data.Preferences ?? null;
  } catch {
    return null;
  }
}

export async function fetchAllData(
  entityId: string,
  taxYear: number
): Promise<QBOCompanyData> {
  // Run all fetches in parallel — non-critical fetches (txn types, prefs) won't block if they fail
  const [
    accounts,
    journalEntries,
    companyInfo,
    preferences,
    invoices,
    bills,
    expenses,
    purchases,
    payments,
    billPayments,
    creditMemos,
    salesReceipts,
    vendorCredits,
    transfers,
    deposits,
    refundReceipts,
  ] = await Promise.all([
    fetchAccounts(entityId),
    fetchJournalEntries(entityId, taxYear),
    fetchCompanyInfo(entityId),
    fetchPreferences(entityId),
    fetchTxnType(entityId, "Invoice", taxYear),
    fetchTxnType(entityId, "Bill", taxYear),
    fetchTxnType(entityId, "Expense", taxYear),
    fetchTxnType(entityId, "Purchase", taxYear),
    fetchTxnType(entityId, "Payment", taxYear),
    fetchTxnType(entityId, "BillPayment", taxYear),
    fetchTxnType(entityId, "CreditMemo", taxYear),
    fetchTxnType(entityId, "SalesReceipt", taxYear),
    fetchTxnType(entityId, "VendorCredit", taxYear),
    fetchTxnType(entityId, "Transfer", taxYear),
    fetchTxnType(entityId, "Deposit", taxYear),
    fetchTxnType(entityId, "RefundReceipt", taxYear),
  ]);

  return {
    accounts,
    journalEntries,
    companyInfo,
    preferences,
    invoices,
    bills,
    expenses,
    purchases,
    payments,
    billPayments,
    creditMemos,
    salesReceipts,
    vendorCredits,
    transfers,
    deposits,
    refundReceipts,
  };
}

// Keep fetchGeneralLedger as a leaner alias for backwards compatibility
export async function fetchGeneralLedger(
  entityId: string,
  taxYear: number
): Promise<{ accounts: QBOAccount[]; transactions: QBOTransaction[] }> {
  const [accounts, transactions] = await Promise.all([
    fetchAccounts(entityId),
    fetchJournalEntries(entityId, taxYear),
  ]);
  return { accounts, transactions };
}
