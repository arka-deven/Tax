import crypto from "crypto";
import type { QBOAccount, QBOCompanyData, QBOTransaction } from "@/lib/qbo-fetch";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTxn = Record<string, any>;
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

// ── Helpers for non-JE transaction normalization ─────────────────────────────

function safeStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Build a canonical entry id for non-JE transactions */
function txnEntryId(entityId: string, txnType: string, txnId: string, lineIdx: number, side: "dr" | "cr"): string {
  return `entry_${entityId}_${txnType}_${txnId}_${lineIdx}_${side}`;
}

/** Extract counterparty id from a generic QBO transaction */
function extractCounterparty(txn: AnyTxn): string | null {
  return txn.CustomerRef?.value ?? txn.VendorRef?.value ?? txn.EntityRef?.value ?? null;
}

/** Extract class id from a line or transaction */
function extractClassId(line: AnyTxn, txn: AnyTxn): string | null {
  // Line-level class takes precedence
  const lineClass =
    line.SalesItemLineDetail?.ClassRef?.value ??
    line.AccountBasedExpenseLineDetail?.ClassRef?.value ??
    line.ItemBasedExpenseLineDetail?.ClassRef?.value ??
    line.ClassRef?.value;
  if (lineClass) return lineClass;
  return txn.ClassRef?.value ?? null;
}

/** Extract location/department id from a line or transaction */
function extractLocationId(line: AnyTxn, txn: AnyTxn): string | null {
  const lineDept =
    line.SalesItemLineDetail?.DepartmentRef?.value ??
    line.AccountBasedExpenseLineDetail?.DepartmentRef?.value ??
    line.ItemBasedExpenseLineDetail?.DepartmentRef?.value ??
    line.DepartmentRef?.value;
  if (lineDept) return lineDept;
  return txn.DepartmentRef?.value ?? null;
}

/** Process lines from a single generic transaction into CanonicalLedgerEntry[] */
function processGenericTxn(
  raw: RawSourceRecord,
  txnType: string,
  txn: AnyTxn,
  lineProcessor: (line: AnyTxn, idx: number) => CanonicalLedgerEntry[],
): CanonicalLedgerEntry[] {
  const entries: CanonicalLedgerEntry[] = [];
  const lines: AnyTxn[] = txn.Line ?? [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.DetailType === "SubTotalLineDetail") continue;
    try {
      entries.push(...lineProcessor(line, i));
    } catch {
      // Skip malformed lines
    }
  }
  return entries;
}

// ── Main normalizer for ALL transaction types ────────────────────────────────

export function normalizeAllTransactions(
  raw: RawSourceRecord,
  qboData: QBOCompanyData,
): CanonicalLedgerEntry[] {
  const entries: CanonicalLedgerEntry[] = [];
  const entityId = raw.entity_id;

  // 1. Journal Entries — delegate to existing function
  entries.push(...normalizeTransactions(raw, qboData.journalEntries));

  // Helper to build a base entry template
  function baseEntry(txnType: string, txn: AnyTxn, lineIdx: number, side: "dr" | "cr", accountId: string, amount: number): CanonicalLedgerEntry {
    return {
      canonical_entry_id: txnEntryId(entityId, txnType, txn.Id, lineIdx, side),
      raw_source_id: raw.raw_source_id,
      entity_id: entityId,
      posting_date: txn.TxnDate ?? raw.tax_year + "-01-01",
      tax_year: raw.tax_year,
      debit_amount: side === "dr" ? amount : 0,
      credit_amount: side === "cr" ? amount : 0,
      account_id: `acc_${entityId}_${accountId}`,
      counterparty_id: extractCounterparty(txn),
      memo: safeStr(txn.PrivateNote) ?? safeStr(txn.Memo) ?? null,
      class_id: null, // overridden per-line below
      location_id: null, // overridden per-line below
      source_refs: [txn.Id, String(lineIdx)],
    };
  }

  // 2. Invoices — Debit AR, Credit Revenue per line
  for (const txn of qboData.invoices as AnyTxn[]) {
    if (!txn.Id || !txn.TxnDate) continue;
    const totalAmt = safeNum(txn.TotalAmt);
    const arAccountId = txn.DepositToAccountRef?.value ?? txn.ARAccountRef?.value;

    // Debit AR for total
    if (totalAmt > 0 && arAccountId) {
      const e = baseEntry("Invoice", txn, 9999, "dr", arAccountId, totalAmt);
      e.class_id = txn.ClassRef?.value ?? null;
      e.location_id = txn.DepartmentRef?.value ?? null;
      entries.push(e);
    }

    // Credit Revenue per line
    entries.push(...processGenericTxn(raw, "Invoice", txn, (line, idx) => {
      const amt = safeNum(line.Amount);
      if (amt <= 0) return [];
      const acctId = line.SalesItemLineDetail?.AccountRef?.value
        ?? line.SalesItemLineDetail?.IncomeAccountRef?.value;
      if (!acctId) return [];
      const e = baseEntry("Invoice", txn, idx, "cr", acctId, amt);
      e.class_id = extractClassId(line, txn);
      e.location_id = extractLocationId(line, txn);
      return [e];
    }));
  }

  // 3. Bills — Debit Expense per line, Credit AP
  for (const txn of qboData.bills as AnyTxn[]) {
    if (!txn.Id || !txn.TxnDate) continue;
    const totalAmt = safeNum(txn.TotalAmt);
    const apAccountId = txn.APAccountRef?.value;

    // Credit AP for total
    if (totalAmt > 0 && apAccountId) {
      const e = baseEntry("Bill", txn, 9999, "cr", apAccountId, totalAmt);
      e.class_id = txn.ClassRef?.value ?? null;
      e.location_id = txn.DepartmentRef?.value ?? null;
      entries.push(e);
    }

    // Debit Expense per line
    entries.push(...processGenericTxn(raw, "Bill", txn, (line, idx) => {
      const amt = safeNum(line.Amount);
      if (amt <= 0) return [];
      const acctId = line.AccountBasedExpenseLineDetail?.AccountRef?.value
        ?? line.ItemBasedExpenseLineDetail?.AccountRef?.value;
      if (!acctId) return [];
      const e = baseEntry("Bill", txn, idx, "dr", acctId, amt);
      e.class_id = extractClassId(line, txn);
      e.location_id = extractLocationId(line, txn);
      return [e];
    }));
  }

  // 4. Expenses & Purchases — Debit Expense per line, Credit Bank/CC (AccountRef)
  for (const txn of [...(qboData.expenses as AnyTxn[]), ...(qboData.purchases as AnyTxn[])]) {
    if (!txn.Id || !txn.TxnDate) continue;
    const totalAmt = safeNum(txn.TotalAmt);
    const bankAccountId = txn.AccountRef?.value;
    const txnType = txn.PaymentType != null ? "Expense" : "Purchase";

    // Credit Bank/CC for total
    if (totalAmt > 0 && bankAccountId) {
      const e = baseEntry(txnType, txn, 9999, "cr", bankAccountId, totalAmt);
      e.class_id = txn.ClassRef?.value ?? null;
      e.location_id = txn.DepartmentRef?.value ?? null;
      entries.push(e);
    }

    // Debit Expense per line
    entries.push(...processGenericTxn(raw, txnType, txn, (line, idx) => {
      const amt = safeNum(line.Amount);
      if (amt <= 0) return [];
      const acctId = line.AccountBasedExpenseLineDetail?.AccountRef?.value
        ?? line.ItemBasedExpenseLineDetail?.AccountRef?.value;
      if (!acctId) return [];
      const e = baseEntry(txnType, txn, idx, "dr", acctId, amt);
      e.class_id = extractClassId(line, txn);
      e.location_id = extractLocationId(line, txn);
      return [e];
    }));
  }

  // 5. SalesReceipts — Debit Cash/Bank, Credit Revenue per line
  for (const txn of qboData.salesReceipts as AnyTxn[]) {
    if (!txn.Id || !txn.TxnDate) continue;
    const totalAmt = safeNum(txn.TotalAmt);
    const depositAccountId = txn.DepositToAccountRef?.value;

    // Debit Cash/Bank for total
    if (totalAmt > 0 && depositAccountId) {
      const e = baseEntry("SalesReceipt", txn, 9999, "dr", depositAccountId, totalAmt);
      e.class_id = txn.ClassRef?.value ?? null;
      e.location_id = txn.DepartmentRef?.value ?? null;
      entries.push(e);
    }

    // Credit Revenue per line
    entries.push(...processGenericTxn(raw, "SalesReceipt", txn, (line, idx) => {
      const amt = safeNum(line.Amount);
      if (amt <= 0) return [];
      const acctId = line.SalesItemLineDetail?.AccountRef?.value
        ?? line.SalesItemLineDetail?.IncomeAccountRef?.value;
      if (!acctId) return [];
      const e = baseEntry("SalesReceipt", txn, idx, "cr", acctId, amt);
      e.class_id = extractClassId(line, txn);
      e.location_id = extractLocationId(line, txn);
      return [e];
    }));
  }

  // 6. CreditMemos — Reverse of Invoice: Debit Revenue per line, Credit AR
  for (const txn of qboData.creditMemos as AnyTxn[]) {
    if (!txn.Id || !txn.TxnDate) continue;
    const totalAmt = safeNum(txn.TotalAmt);
    const arAccountId = txn.ARAccountRef?.value;

    // Credit AR for total (reverse: debit reduces AR? No — CreditMemo credits AR)
    if (totalAmt > 0 && arAccountId) {
      const e = baseEntry("CreditMemo", txn, 9999, "cr", arAccountId, totalAmt);
      e.class_id = txn.ClassRef?.value ?? null;
      e.location_id = txn.DepartmentRef?.value ?? null;
      entries.push(e);
    }

    // Debit Revenue per line (reversing the original credit)
    entries.push(...processGenericTxn(raw, "CreditMemo", txn, (line, idx) => {
      const amt = safeNum(line.Amount);
      if (amt <= 0) return [];
      const acctId = line.SalesItemLineDetail?.AccountRef?.value
        ?? line.SalesItemLineDetail?.IncomeAccountRef?.value;
      if (!acctId) return [];
      const e = baseEntry("CreditMemo", txn, idx, "dr", acctId, amt);
      e.class_id = extractClassId(line, txn);
      e.location_id = extractLocationId(line, txn);
      return [e];
    }));
  }

  // 7. VendorCredits — Reverse of Bill: Credit Expense per line, Debit AP
  for (const txn of qboData.vendorCredits as AnyTxn[]) {
    if (!txn.Id || !txn.TxnDate) continue;
    const totalAmt = safeNum(txn.TotalAmt);
    const apAccountId = txn.APAccountRef?.value;

    // Debit AP for total (reverse of Bill's AP credit)
    if (totalAmt > 0 && apAccountId) {
      const e = baseEntry("VendorCredit", txn, 9999, "dr", apAccountId, totalAmt);
      e.class_id = txn.ClassRef?.value ?? null;
      e.location_id = txn.DepartmentRef?.value ?? null;
      entries.push(e);
    }

    // Credit Expense per line (reversing the original debit)
    entries.push(...processGenericTxn(raw, "VendorCredit", txn, (line, idx) => {
      const amt = safeNum(line.Amount);
      if (amt <= 0) return [];
      const acctId = line.AccountBasedExpenseLineDetail?.AccountRef?.value
        ?? line.ItemBasedExpenseLineDetail?.AccountRef?.value;
      if (!acctId) return [];
      const e = baseEntry("VendorCredit", txn, idx, "cr", acctId, amt);
      e.class_id = extractClassId(line, txn);
      e.location_id = extractLocationId(line, txn);
      return [e];
    }));
  }

  // 8. Deposits — Debit Bank, Credit per line
  for (const txn of qboData.deposits as AnyTxn[]) {
    if (!txn.Id || !txn.TxnDate) continue;
    const totalAmt = safeNum(txn.TotalAmt);
    const depositAccountId = txn.DepositToAccountRef?.value;

    // Debit Bank for total
    if (totalAmt > 0 && depositAccountId) {
      const e = baseEntry("Deposit", txn, 9999, "dr", depositAccountId, totalAmt);
      e.class_id = txn.ClassRef?.value ?? null;
      e.location_id = txn.DepartmentRef?.value ?? null;
      entries.push(e);
    }

    // Credit per line
    entries.push(...processGenericTxn(raw, "Deposit", txn, (line, idx) => {
      const amt = safeNum(line.Amount);
      if (amt <= 0) return [];
      const acctId = line.DepositLineDetail?.AccountRef?.value;
      if (!acctId) return [];
      const e = baseEntry("Deposit", txn, idx, "cr", acctId, amt);
      e.class_id = extractClassId(line, txn);
      e.location_id = extractLocationId(line, txn);
      return [e];
    }));
  }

  // 9. RefundReceipts — Reverse of SalesReceipt: Credit Bank, Debit Revenue per line
  for (const txn of qboData.refundReceipts as AnyTxn[]) {
    if (!txn.Id || !txn.TxnDate) continue;
    const totalAmt = safeNum(txn.TotalAmt);
    const depositAccountId = txn.DepositToAccountRef?.value;

    // Credit Bank for total (money going out)
    if (totalAmt > 0 && depositAccountId) {
      const e = baseEntry("RefundReceipt", txn, 9999, "cr", depositAccountId, totalAmt);
      e.class_id = txn.ClassRef?.value ?? null;
      e.location_id = txn.DepartmentRef?.value ?? null;
      entries.push(e);
    }

    // Debit Revenue per line (reversing revenue)
    entries.push(...processGenericTxn(raw, "RefundReceipt", txn, (line, idx) => {
      const amt = safeNum(line.Amount);
      if (amt <= 0) return [];
      const acctId = line.SalesItemLineDetail?.AccountRef?.value
        ?? line.SalesItemLineDetail?.IncomeAccountRef?.value;
      if (!acctId) return [];
      const e = baseEntry("RefundReceipt", txn, idx, "dr", acctId, amt);
      e.class_id = extractClassId(line, txn);
      e.location_id = extractLocationId(line, txn);
      return [e];
    }));
  }

  return entries;
}
