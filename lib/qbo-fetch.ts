import { getClientForEntity } from "@/lib/qbo-client";
import { realmStore } from "@/lib/token-store";

interface QBOResponse<T> {
  QueryResponse: T;
  time: string;
}

async function qboQuery<T>(entityId: string, query: string): Promise<T> {
  const client = await getClientForEntity(entityId);
  const realmId = realmStore.get(entityId);
  if (!realmId) throw new Error(`No realmId for entity ${entityId}`);

  const base =
    process.env.QBO_ENV === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";

  const url = `${base}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;

  const response = await client.makeApiCall({ url, method: "GET" });
  const body = response.getJson() as QBOResponse<T>;
  return body.QueryResponse;
}

// ── Account types returned by QBO ─────────────────────────────────────────────
export interface QBOAccount {
  Id: string;
  Name: string;
  FullyQualifiedName: string;
  AccountType: string;
  AccountSubType: string;
  AcctNum?: string;
  Active: boolean;
  CurrentBalance: number;
  CurrencyRef?: { value: string };
  Classification: string; // Asset, Liability, Equity, Revenue, Expense
}

// ── Transaction line types ────────────────────────────────────────────────────
export interface QBOTransactionLine {
  Id: string;
  Amount: number;
  DetailType: string;
  AccountBasedExpenseLineDetail?: { AccountRef: { value: string; name: string } };
  SalesItemLineDetail?: { ItemRef?: { value: string; name: string } };
  JournalEntryLineDetail?: {
    PostingType: "Debit" | "Credit";
    AccountRef: { value: string; name: string };
    ClassRef?: { value: string };
    Entity?: { EntityRef?: { value: string } };
  };
}

export interface QBOTransaction {
  Id: string;
  TxnDate: string;
  DocNumber?: string;
  PrivateNote?: string;
  Line: QBOTransactionLine[];
  CurrencyRef?: { value: string };
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
