"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, RefreshCw, XCircle, AlertTriangle, Info, CheckCircle2,
  ChevronRight, ChevronDown, Plug, LogOut, Play, Building2, Plus, Send,
  Zap, BookOpen, Shield, ArrowRight,
} from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";
import { AnimatedList } from "@/components/magicui/animated-list";
import PDFFormViewer from "@/components/PDFFormViewer";
import { PDF_MAPPINGS } from "@/lib/pdf/pdf-mappings";
import { fillPdf } from "@/lib/pdf/pdf-filler";
import type { FilledPdfResult, FillContext } from "@/lib/pdf/types";
import { UNIFIED_SCHEMAS } from "@/src/schemas";
import XmlFormViewer from "@/components/XmlFormViewer/XmlFormViewer";
import { useXmlForm } from "@/components/XmlFormViewer/useXmlForm";

// ── XML Form Wrapper (uses hook, can't be inline in the main component) ─────

function XmlFormWrapper({ entityId, formCode, taxYear, facts, meta }: {
  entityId: string; formCode: string; taxYear: number;
  facts: Record<string, unknown>; meta: Record<string, unknown>;
}) {
  const schema = UNIFIED_SCHEMAS[formCode];
  const { doc, loading, updateField, regenerate, downloadXml, editedFields } = useXmlForm(entityId, formCode, taxYear, schema);

  return (
    <XmlFormViewer
      schema={schema}
      doc={doc}
      loading={loading}
      onFieldChange={updateField}
      onRegenerate={() => regenerate(facts, meta)}
      onDownloadXml={downloadXml}
      editedFields={editedFields}
    />
  );
}

// ── Error Toast ──────────────────────────────────────────────────────────────

function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 7000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
      <div className="flex items-start gap-3 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg max-w-md">
        <XCircle size={16} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Error</p>
          <p className="text-xs text-red-200 mt-0.5 leading-snug">{message}</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-red-300 hover:text-white"><XCircle size={14} /></button>
      </div>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

type EntityType = "c_corp" | "s_corp" | "llc_partnership" | "llc_single" | "sole_prop" | "nonprofit";

interface DiagItem { severity: "blocking_error" | "warning" | "info"; code: string; title: string; message: string; }
interface PipelineResult { requiredForms: string[]; possibleForms: string[]; diagnostics: DiagItem[]; facts: Record<string, number | string | boolean>; ranAt: string; }

type FormStatus = "required" | "conditional" | "possible";
type FormCategory = "primary" | "schedule" | "attachment" | "informational";
interface IRSForm { form: string; title: string; description: string; category: FormCategory; status: FormStatus; due: string; irsUrl?: string; }

/** Per-company state */
interface Company {
  id: string;
  name: string;
  ein: string;
  entityType: EntityType | null;
  result: PipelineResult | null;
  filledPdfs: Record<string, FilledPdfResult>;
  fieldOverrides: Record<string, Record<string, string>>;
  loading: boolean; // true while pipeline + PDF fill is running
}

// ── Form definitions ─────────────────────────────────────────────────────────

const FORMS_BY_ENTITY: Record<EntityType, IRSForm[]> = {
  c_corp: [
    { form: "1120",    title: "U.S. Corporation Income Tax Return",           category: "primary",      status: "required",    due: "Apr 15 (ext. Oct 15)", description: "Core annual filing — income, deductions, credits, and tax liability." },
    { form: "Sch L",   title: "Balance Sheet per Books",                      category: "schedule",     status: "required",    due: "with 1120",            description: "Comparative beginning and end-of-year balance sheet." },
    { form: "Sch M-2", title: "Analysis of Unappropriated Retained Earnings", category: "schedule",     status: "required",    due: "with 1120",            description: "Reconciles beginning and ending retained earnings." },
    { form: "Sch M-1", title: "Reconciliation of Income (Book vs. Tax)",      category: "schedule",     status: "conditional", due: "with 1120",            description: "Book-to-tax reconciliation required when total assets < $10M." },
    { form: "Sch M-3", title: "Net Income Reconciliation (Large Corp.)",      category: "schedule",     status: "conditional", due: "with 1120",            description: "Replaces M-1 when total assets ≥ $10M at year-end." },
    { form: "Sch C",   title: "Dividends, Inclusions & Special Deductions",   category: "schedule",     status: "conditional", due: "with 1120",            description: "DRD calculations when dividend income is present." },
    { form: "1125-A",  title: "Cost of Goods Sold",                           category: "attachment",   status: "conditional", due: "with 1120",            description: "Required when cost of goods sold is deducted on line 2." },
    { form: "1125-E",  title: "Compensation of Officers",                     category: "attachment",   status: "conditional", due: "with 1120",            description: "Required when gross receipts exceed $500,000." },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1120",            description: "§179 elections, bonus depreciation, and MACRS detail." },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1120",            description: "§1245/§1250 recapture and ordinary gain on asset disposals." },
    { form: "8990",    title: "Business Interest Expense Limitation",         category: "attachment",   status: "conditional", due: "with 1120",            description: "§163(j) interest deduction limitation worksheet." },
    { form: "1118",    title: "Foreign Tax Credit — Corporations",            category: "informational", status: "conditional", due: "with 1120",           description: "Required when foreign income, taxes, or activities are present." },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "attachment",   status: "conditional", due: "with 1120",            description: "Net capital gain/loss from sales of capital assets." },
  ],
  s_corp: [
    { form: "1120-S",  title: "U.S. Income Tax Return for an S Corporation",  category: "primary",      status: "required",    due: "Mar 15 (ext. Sep 15)", description: "Core annual filing for S corporations." },
    { form: "Sch K",   title: "Shareholders' Pro Rata Share Items",           category: "schedule",     status: "required",    due: "with 1120-S",          description: "Aggregate pass-through items." },
    { form: "Sch K-1", title: "Shareholder's Share of Income (per owner)",    category: "schedule",     status: "required",    due: "Mar 15",               description: "One K-1 per shareholder." },
    { form: "Sch L",   title: "Balance Sheet per Books",                      category: "schedule",     status: "required",    due: "with 1120-S",          description: "Comparative balance sheet." },
    { form: "Sch M-2", title: "Analysis of AAA, OAA, and E&P",               category: "schedule",     status: "required",    due: "with 1120-S",          description: "Accumulated Adjustments Account reconciliation." },
    { form: "Sch M-1", title: "Reconciliation of Income",                     category: "schedule",     status: "conditional", due: "with 1120-S",          description: "Book-to-tax reconciliation (assets < $10M)." },
    { form: "1125-A",  title: "Cost of Goods Sold",                           category: "attachment",   status: "conditional", due: "with 1120-S",          description: "Required when COGS is deducted." },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1120-S",          description: "§179 elections and MACRS depreciation detail." },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1120-S",          description: "Gain/loss on disposal of business assets." },
    { form: "7203",    title: "S Corporation Shareholder Stock Basis",        category: "attachment",   status: "conditional", due: "with shareholder return", description: "Required for shareholders claiming loss." },
    { form: "8825",    title: "Rental Real Estate Income and Expenses",       category: "attachment",   status: "conditional", due: "with 1120-S",          description: "Required when rental real estate income is present." },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "attachment",   status: "conditional", due: "with 1120-S",          description: "Net capital gain/loss." },
  ],
  llc_partnership: [
    { form: "1065",    title: "U.S. Return of Partnership Income",            category: "primary",      status: "required",    due: "Mar 15 (ext. Sep 15)", description: "Core annual filing for partnerships and multi-member LLCs." },
    { form: "Sch K",   title: "Partners' Distributive Share Items",           category: "schedule",     status: "required",    due: "with 1065",            description: "Aggregate pass-through items." },
    { form: "Sch K-1", title: "Partner's Share of Income (per partner)",      category: "schedule",     status: "required",    due: "Mar 15",               description: "One K-1 per partner." },
    { form: "Sch L",   title: "Balance Sheet per Books",                      category: "schedule",     status: "required",    due: "with 1065",            description: "Comparative balance sheet." },
    { form: "Sch M-2", title: "Analysis of Partners' Capital Accounts",       category: "schedule",     status: "required",    due: "with 1065",            description: "Capital account rollforward." },
    { form: "Sch M-1", title: "Reconciliation of Income",                     category: "schedule",     status: "conditional", due: "with 1065",            description: "Book-to-tax reconciliation (assets < $10M)." },
    { form: "Sch B-1", title: "Information on Certain Partners",              category: "schedule",     status: "conditional", due: "with 1065",            description: "Required when any partner owns ≥ 50%." },
    { form: "K-2/K-3", title: "Partners' International Items",                category: "informational", status: "conditional", due: "Mar 15",              description: "Required for foreign tax credit items." },
    { form: "1125-A",  title: "Cost of Goods Sold",                           category: "attachment",   status: "conditional", due: "with 1065",            description: "Required when COGS is deducted." },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1065",            description: "§179 and MACRS depreciation." },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1065",            description: "Gain/loss on disposal." },
    { form: "8825",    title: "Rental Real Estate Income and Expenses",       category: "attachment",   status: "conditional", due: "with 1065",            description: "Required when rental RE income present." },
    { form: "8990",    title: "Business Interest Expense Limitation",         category: "attachment",   status: "conditional", due: "with 1065",            description: "§163(j) interest deduction limitation." },
  ],
  llc_single: [
    { form: "1040",    title: "U.S. Individual Income Tax Return",             category: "primary",      status: "required",    due: "Apr 15 (ext. Oct 15)", description: "Owner's personal return — Sch C and all business schedules attach here." },
    { form: "Sch C",   title: "Profit or Loss from Business",                 category: "schedule",     status: "required",    due: "with 1040",            description: "Disregarded entity — income/loss reported on owner's 1040." },
    { form: "Sch SE",  title: "Self-Employment Tax",                          category: "schedule",     status: "required",    due: "with 1040",            description: "Required when net SE income ≥ $400." },
    { form: "Sch 1",   title: "Additional Income and Adjustments",            category: "schedule",     status: "required",    due: "with 1040",            description: "Sch C net profit flows to Line 3; SE deduction to Line 15." },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "schedule",     status: "conditional", due: "with 1040",            description: "Net capital gain/loss from sales of capital assets." },
    { form: "8995",    title: "Qualified Business Income (QBI) Deduction",    category: "attachment",   status: "conditional", due: "with 1040",            description: "20% §199A deduction." },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1040",            description: "§179 and MACRS." },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1040",            description: "Gain/loss on disposal." },
    { form: "8829",    title: "Expenses for Business Use of Your Home",       category: "attachment",   status: "conditional", due: "with 1040",            description: "Home office deduction." },
    { form: "1125-A",  title: "Cost of Goods Sold",                           category: "attachment",   status: "conditional", due: "with 1040",            description: "When inventory / COGS is part of Sch C." },
  ],
  sole_prop: [
    { form: "1040",    title: "U.S. Individual Income Tax Return",             category: "primary",      status: "required",    due: "Apr 15 (ext. Oct 15)", description: "Owner's personal return — Sch C and all business schedules attach here." },
    { form: "Sch C",   title: "Profit or Loss from Business",                 category: "schedule",     status: "required",    due: "with 1040",            description: "Sole proprietor income and deductions." },
    { form: "Sch SE",  title: "Self-Employment Tax",                          category: "schedule",     status: "required",    due: "with 1040",            description: "15.3% SE tax on net earnings ≥ $400." },
    { form: "Sch 1",   title: "Additional Income and Adjustments",            category: "schedule",     status: "required",    due: "with 1040",            description: "Sch C net profit flows to Line 3; SE deduction to Line 15." },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "schedule",     status: "conditional", due: "with 1040",            description: "Net capital gain/loss from sales of capital assets." },
    { form: "8995",    title: "Qualified Business Income (QBI) Deduction",    category: "attachment",   status: "conditional", due: "with 1040",            description: "20% §199A deduction." },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1040",            description: "§179 and MACRS." },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1040",            description: "Gain/loss on disposal." },
    { form: "8829",    title: "Expenses for Business Use of Your Home",       category: "attachment",   status: "conditional", due: "with 1040",            description: "Home office deduction." },
  ],
  nonprofit: [
    { form: "990",     title: "Return of Organization Exempt from Income Tax", category: "primary",     status: "conditional", due: "May 15 (ext. Nov 15)", description: "Required when gross receipts ≥ $200K or assets ≥ $500K." },
    { form: "990-EZ",  title: "Short Form Return of Organization",             category: "primary",     status: "conditional", due: "May 15 (ext. Nov 15)", description: "Gross receipts $50K–$199K and assets < $500K." },
    { form: "990-N",   title: "e-Postcard (Annual Electronic Notice)",         category: "primary",     status: "conditional", due: "May 15",               description: "Gross receipts normally ≤ $50K — electronic filing only." },
    { form: "Sch A",   title: "Public Charity Status and Public Support",      category: "schedule",    status: "required",    due: "with 990/990-EZ",      description: "Public charity classification." },
    { form: "Sch B",   title: "Schedule of Contributors",                      category: "schedule",    status: "required",    due: "with 990/990-EZ",      description: "Contributors of $5,000+." },
    { form: "990-T",   title: "Exempt Organization Business Income Tax Return", category: "attachment",  status: "conditional", due: "Apr 15 (ext. Oct 15)", description: "Required when UBTI ≥ $1,000." },
    { form: "4562",    title: "Depreciation and Amortization",                 category: "attachment",  status: "conditional", due: "with 990",             description: "Depreciation of program assets." },
  ],
};

const ENTITY_OPTIONS: { value: EntityType; label: string; sub: string }[] = [
  { value: "c_corp",          label: "C-Corporation",       sub: "Form 1120" },
  { value: "s_corp",          label: "S-Corporation",       sub: "Form 1120-S" },
  { value: "llc_partnership", label: "LLC (Multi-Member)",  sub: "Form 1065" },
  { value: "llc_single",      label: "LLC (Single-Member)", sub: "Form 1040 + Sch C" },
  { value: "sole_prop",       label: "Sole Proprietor",     sub: "Form 1040 + Sch C" },
  { value: "nonprofit",       label: "Nonprofit 501(c)(3)", sub: "Form 990" },
];

const CATEGORY_LABELS: Record<FormCategory, string> = {
  primary: "Primary Return", schedule: "Schedules", attachment: "Attachments", informational: "Informational",
};
const CATEGORY_ORDER: FormCategory[] = ["primary", "schedule", "attachment", "informational"];

// ── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [taxYear, setTaxYear] = useState(2025);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set());
  const [diagOpen, setDiagOpen] = useState(false);
  /** Which company is currently selecting entity type (inline in sidebar) */
  const [choosingTypeFor, setChoosingTypeFor] = useState<string | null>(null);
  /** Pending entity type — set when user picks type but EIN is missing, needs input first */
  const [pendingType, setPendingType] = useState<{ companyId: string; type: EntityType } | null>(null);
  /** Entity type detected from QBO TaxForm — shown as a confirmation prompt before proceeding */
  const [detectedType, setDetectedType] = useState<{ companyId: string; type: EntityType } | null>(null);
  const [einInput, setEinInput] = useState("");

  const active = companies.find((c) => c.id === activeId) ?? null;
  const entityLabel = active?.entityType
    ? ENTITY_OPTIONS.find((o) => o.value === active.entityType)?.label ?? ""
    : "";
  const forms = active?.entityType ? FORMS_BY_ENTITY[active.entityType] : [];

  // ── Helpers to update a specific company in state ──────────────────────────

  function updateCompany(id: string, patch: Partial<Company>) {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  // ── Auto-check existing QBO connections on mount ──────────────────────────

  useEffect(() => {
    async function checkExisting() {
      try {
        // Fetch all connected entities from Supabase
        const connRes = await fetch("/api/auth/qbo/connections");
        const { entities } = await connRes.json() as { entities: { entityId: string; realmId: string }[] };
        if (!entities?.length) return;

        // Fetch status for each (in parallel) to get company name, EIN, entity type
        const statuses = await Promise.all(
          entities.map(async (e) => {
            const res = await fetch(`/api/auth/qbo/status?entityId=${e.entityId}`);
            return res.json();
          })
        );

        const connected = statuses.filter((s) => s.connected);
        if (!connected.length) return;

        const cos: Company[] = connected.map((s) => {
          const qboType = s.entityType as EntityType | "" | undefined;
          const resolved = qboType && ENTITY_OPTIONS.some((o: { value: string }) => o.value === qboType) ? qboType as EntityType : null;
          return {
            id: s.entityId, name: s.companyName || "Company", ein: s.ein || "",
            entityType: resolved, result: null, filledPdfs: {}, fieldOverrides: {}, loading: false,
          };
        });

        setCompanies(cos);
        setActiveId(cos[0].id);

        // If only one company and no entity type yet, prompt for type
        const first = cos[0];
        if (!first.entityType) {
          setChoosingTypeFor(first.id);
        } else {
          setDetectedType({ companyId: first.id, type: first.entityType });
          setChoosingTypeFor(first.id);
        }
      } catch { /* not connected */ }
    }
    checkExisting();
  }, []);

  // ── Listen for OAuth popup callback ───────────────────────────────────────

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Accept messages from any *.vercel.app origin (preview vs production alias)
      const ok = event.origin === window.location.origin
        || new URL(event.origin).hostname.endsWith(".vercel.app");
      if (!ok) return;
      if (event.data?.type === "QBO_AUTH_SUCCESS") {
        const eid = event.data.entityId ?? `entity_${Date.now()}`;
        const qboType = event.data.entityType as EntityType | "" | undefined;
        const resolved = qboType && ENTITY_OPTIONS.some((o) => o.value === qboType) ? qboType as EntityType : null;
        const co: Company = {
          id: eid, name: event.data.companyName || "Company", ein: event.data.ein || "",
          entityType: resolved, result: null, filledPdfs: {}, fieldOverrides: {}, loading: false,
        };
        setCompanies((prev) => {
          const exists = prev.find((c) => c.id === eid);
          return exists ? prev.map((c) => (c.id === eid ? co : c)) : [...prev, co];
        });
        setActiveId(eid);
        setChoosingTypeFor(eid);
        if (resolved) {
          setDetectedType({ companyId: eid, type: resolved });
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ── Connect / Disconnect ──────────────────────────────────────────────────

  function connectQBO() {
    const eid = `entity_${Date.now()}`;
    const url = `/api/auth/qbo?entityId=${eid}`;
    const w = 600, h = 700;
    window.open(url, "qbo-oauth",
      `width=${w},height=${h},left=${(screen.width - w) / 2},top=${(screen.height - h) / 2},toolbar=no,menubar=no,scrollbars=yes`);
  }

  async function disconnectCompany(id: string) {
    await fetch("/api/auth/qbo/disconnect", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId: id }),
    });
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(companies.find((c) => c.id !== id)?.id ?? null);
  }

  // ── Pipeline + auto-fill all forms ────────────────────────────────────────

  const autoFillCompany = useCallback(async (companyId: string, type: EntityType) => {
    const co = companies.find((c) => c.id === companyId);
    if (!co) return;

    updateCompany(companyId, { entityType: type, loading: true });
    setChoosingTypeFor(null);

    // Run pipeline
    let facts: Record<string, unknown> | null = null;
    let pipelineResult: PipelineResult | null = null;
    try {
      const res = await fetch(`/api/pipeline/${companyId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxYear, entityType: type }),
      });
      const json = await res.json();
      if (res.ok) {
        pipelineResult = json as PipelineResult;
        facts = json.facts;
      } else {
        setErrorMsg(json.error ?? "Pipeline failed.");
        updateCompany(companyId, { loading: false });
        return;
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Pipeline failed.");
      updateCompany(companyId, { loading: false });
      return;
    }

    // Fill all PDFs in parallel
    const ctx: FillContext = {
      facts: facts as Record<string, unknown>,
      meta: { companyName: co.name, ein: co.ein, taxYear, entityType: type },
    };
    const allForms = FORMS_BY_ENTITY[type];
    const newPdfs: Record<string, FilledPdfResult> = {};
    const promises = allForms.map(async (f) => {
      const mapping = PDF_MAPPINGS[f.form];
      if (!mapping) return;
      try {
        const filled = await fillPdf(mapping, ctx);
        newPdfs[f.form] = filled;
      } catch (err) {
        console.error(`PDF fill failed for ${f.form}:`, err);
      }
    });
    await Promise.all(promises);

    updateCompany(companyId, { result: pipelineResult, filledPdfs: newPdfs, loading: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, taxYear]);

  // ── Re-generate a single form (after manual edits) ────────────────────────

  async function regenerateForm(formCode: string) {
    if (!active?.result?.facts || !active.entityType) return;
    const ctx: FillContext = {
      facts: active.result.facts,
      meta: { companyName: active.name, ein: active.ein, taxYear, entityType: active.entityType },
    };
    const mapping = PDF_MAPPINGS[formCode];
    if (!mapping) return;
    const overrides = active.fieldOverrides[formCode];
    try {
      const filled = await fillPdf(mapping, ctx, overrides ? { overrides } : {});
      updateCompany(active.id, { filledPdfs: { ...active.filledPdfs, [formCode]: filled } });
    } catch (err) {
      console.error(`Re-fill failed for ${formCode}:`, err);
    }
  }

  // ── Download ──────────────────────────────────────────────────────────────

  function downloadPdf(formCode: string) {
    const filled = active?.filledPdfs[formCode];
    if (!filled) return;
    const blob = new Blob([new Uint8Array(filled.pdfBytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${formCode.replace(/\s/g, "_")}_${taxYear}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleForm(formCode: string) {
    setExpandedForms((prev) => { const n = new Set(prev); n.has(formCode) ? n.delete(formCode) : n.add(formCode); return n; });
  }

  // Field editing happens directly in the PDF form fields (annotation layer)

  const blocking = active?.result?.diagnostics.filter((d) => d.severity === "blocking_error") ?? [];
  const warnings = active?.result?.diagnostics.filter((d) => d.severity === "warning") ?? [];
  const infos = active?.result?.diagnostics.filter((d) => d.severity === "info") ?? [];

  // ── Onboarding step for new company or no companies ─────────────────────────
  // Determine which onboarding step we're on:
  // 0 = no companies (show connect)
  // 1 = company connected but no type (choosingTypeFor set)
  // 2 = type chosen but EIN/details missing (pendingType set)
  const onboardingCompany = pendingType
    ? companies.find((c) => c.id === pendingType.companyId)
    : choosingTypeFor
    ? companies.find((c) => c.id === choosingTypeFor)
    : null;
  const onboardingStep = companies.length === 0 ? 0 : pendingType ? 2 : choosingTypeFor ? 1 : -1;

  if (onboardingStep >= 0) {
    const steps = [
      { num: 1, label: "Connect QBO" },
      { num: 2, label: "Entity Type" },
      { num: 3, label: "Company Details" },
    ];
    const currentStep = onboardingStep === 0 ? 1 : onboardingStep === 1 ? 2 : 3;

    return (
      <div className="min-h-screen bg-(--parchment)">

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2d232e] flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[#2d232e] tracking-tight">Tax</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-1.5">
                {i > 0 && <div className={`w-8 h-px ${s.num <= currentStep ? "bg-[#2d232e]" : "bg-(--bone)"}`} />}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  s.num < currentStep ? "bg-emerald-100 text-emerald-700"
                  : s.num === currentStep ? "bg-[#2d232e] text-white"
                  : "bg-(--bone) text-[#9a959c]"
                }`}>
                  {s.num < currentStep ? <CheckCircle2 size={13} /> : s.num}
                </div>
                <span className={`text-xs hidden md:block ${s.num === currentStep ? "text-[#2d232e] font-semibold" : "text-[#9a959c]"}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Hero + Action ───────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-8 pt-12 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <BlurFade delay={0}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#9a959c] mb-4">Automated Tax Preparation</p>
                <h1 className="text-4xl md:text-5xl font-bold text-[#2d232e] leading-[1.1] tracking-tight">
                  From your books<br />to filed returns.
                </h1>
                <p className="text-lg text-[#534b52] mt-6 leading-relaxed max-w-lg">
                  Connect QuickBooks Online. We read your chart of accounts, normalize every transaction,
                  derive tax facts, and fill every IRS form — ready for your CPA to review and file.
                </p>
              </BlurFade>

              {/* Feature pills */}
              <BlurFade delay={0.08}>
                <div className="flex flex-wrap gap-2 mt-8">
                  {[
                    { icon: <Zap size={13} />, text: "29 IRS forms" },
                    { icon: <Shield size={13} />, text: "23 diagnostic checks" },
                    { icon: <BookOpen size={13} />, text: "MeF e-file ready" },
                    { icon: <FileText size={13} />, text: "Real-time editing" },
                  ].map((pill) => (
                    <span key={pill.text} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#474448] bg-(--bone) px-3 py-1.5 rounded-full">
                      {pill.icon} {pill.text}
                    </span>
                  ))}
                </div>
              </BlurFade>
            </div>

            {/* Right — action card */}
            <BlurFade delay={0.04} key={currentStep}>
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 shadow-sm border border-(--bone)/50">

                {/* Step 1: Connect QBO */}
                {currentStep === 1 && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-2xl bg-(--bone) flex items-center justify-center mx-auto mb-6">
                      <Plug size={28} className="text-[#534b52]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#2d232e]">Connect QuickBooks</h2>
                    <p className="text-[#78737a] text-sm mt-2 mb-8 max-w-xs mx-auto">Link your QuickBooks Online account to get started. We read your data in read-only mode.</p>
                    <button onClick={connectQBO} className="flex items-center gap-2.5 mx-auto bg-[#2CA01C] hover:bg-[#248518] text-white text-sm font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-sm">
                      <Plug size={16} /> Connect QuickBooks Online
                    </button>
                    <p className="text-[#b5b2b4] text-xs mt-4">We never modify your books.</p>
                  </div>
                )}

                {/* Step 2: Entity Type */}
                {currentStep === 2 && (() => {
                  const det = detectedType?.companyId === choosingTypeFor ? detectedType : null;
                  const detOpt = det ? ENTITY_OPTIONS.find((o) => o.value === det.type) : null;

                  // Helper to proceed with a chosen type
                  function proceedWith(type: EntityType) {
                    const company = companies.find((c) => c.id === choosingTypeFor);
                    setDetectedType(null);
                    if (!company?.ein) {
                      setPendingType({ companyId: choosingTypeFor!, type });
                      setChoosingTypeFor(null);
                    } else {
                      autoFillCompany(choosingTypeFor!, type);
                    }
                  }

                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs text-emerald-600 font-medium">{onboardingCompany?.name ?? "Company"} connected</span>
                      </div>

                      {/* QBO detected a type — ask for confirmation */}
                      {det && detOpt ? (
                        <>
                          <h2 className="text-2xl font-bold text-[#2d232e]">Confirm Entity Type</h2>
                          <p className="text-[#78737a] text-sm mt-1 mb-5">Detected from your QuickBooks company settings.</p>

                          <div className="px-4 py-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 mb-4">
                            <p className="text-sm font-semibold text-[#2d232e]">{detOpt.label}</p>
                            <p className="text-xs text-[#78737a] mt-0.5">{detOpt.sub}</p>
                          </div>

                          <button onClick={() => proceedWith(det.type)}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#2d232e] text-white text-sm font-semibold hover:bg-[#474448] transition-colors">
                            <CheckCircle2 size={15} /> Yes, that&apos;s correct
                          </button>
                          <button onClick={() => setDetectedType(null)}
                            className="text-xs text-[#9a959c] hover:text-[#534b52] transition-colors text-center w-full mt-3">
                            Not correct? Choose manually
                          </button>
                        </>
                      ) : (
                        <>
                          <h2 className="text-2xl font-bold text-[#2d232e]">Select Entity Type</h2>
                          <p className="text-[#78737a] text-sm mt-1 mb-5">This determines which IRS forms apply.</p>
                          <div className="space-y-2">
                            {ENTITY_OPTIONS.map((opt) => (
                              <button key={opt.value} onClick={() => proceedWith(opt.value)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-(--bone)/60 hover:border-(--taupe-grey) hover:bg-(--bone)/60 transition-all text-left group">
                                <div>
                                  <p className="text-sm font-semibold text-[#2d232e]">{opt.label}</p>
                                  <p className="text-xs text-[#9a959c]">{opt.sub}</p>
                                </div>
                                <ArrowRight size={14} className="text-[#b5b2b4] group-hover:text-[#78737a] group-hover:translate-x-0.5 transition-all" />
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Step 3: Company Details */}
                {currentStep === 3 && (() => {
                  const typeLabel = ENTITY_OPTIONS.find((o) => o.value === pendingType?.type)?.label ?? "";
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs text-emerald-600 font-medium">{onboardingCompany?.name} · {typeLabel}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-[#2d232e]">Company Details</h2>
                      <p className="text-[#78737a] text-sm mt-1 mb-5">Required on tax returns but not stored in QuickBooks.</p>

                      <div className="space-y-3.5">
                        <div>
                          <label className="text-xs font-semibold text-[#474448] block mb-1.5">EIN *</label>
                          <input type="text" value={einInput}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9-]/g, "");
                              if (v.length === 2 && !v.includes("-") && einInput.length < v.length) setEinInput(v + "-");
                              else setEinInput(v.slice(0, 10));
                            }}
                            placeholder="XX-XXXXXXX"
                            className="w-full px-4 py-3 rounded-xl border border-(--bone)/60 bg-(--parchment) text-[#2d232e] font-mono tracking-wider placeholder:text-[#b5b2b4] focus:border-(--taupe-grey) focus:outline-none transition-colors" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-[#474448] block mb-1.5">
                              {pendingType?.type === "sole_prop" || pendingType?.type === "llc_single" ? "Start Date" : "Incorporated"}
                            </label>
                            <input type="date"
                              className="w-full px-3 py-3 rounded-xl border border-(--bone)/60 bg-(--parchment) text-[#2d232e] text-sm focus:border-(--taupe-grey) focus:outline-none transition-colors" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[#474448] block mb-1.5">State</label>
                            <input type="text" placeholder="e.g. DE" maxLength={2}
                              className="w-full px-3 py-3 rounded-xl border border-(--bone)/60 bg-(--parchment) text-[#2d232e] text-sm uppercase placeholder:text-[#b5b2b4] focus:border-(--taupe-grey) focus:outline-none transition-colors" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-[#474448] block mb-1.5">Business Activity</label>
                          <input type="text" placeholder="e.g. Software Development"
                            className="w-full px-4 py-3 rounded-xl border border-(--bone)/60 bg-(--parchment) text-[#2d232e] text-sm placeholder:text-[#b5b2b4] focus:border-(--taupe-grey) focus:outline-none transition-colors" />
                        </div>

                        {pendingType?.type === "s_corp" && (
                          <div>
                            <label className="text-xs font-semibold text-[#474448] block mb-1.5">S-Election Date</label>
                            <input type="date"
                              className="w-full px-3 py-3 rounded-xl border border-(--bone)/60 bg-(--parchment) text-[#2d232e] text-sm focus:border-(--taupe-grey) focus:outline-none transition-colors" />
                          </div>
                        )}

                        {(pendingType?.type === "s_corp" || pendingType?.type === "llc_partnership") && (
                          <div>
                            <label className="text-xs font-semibold text-[#474448] block mb-1.5">
                              Number of {pendingType.type === "s_corp" ? "Shareholders" : "Partners"}
                            </label>
                            <input type="number" min={1} placeholder="e.g. 2"
                              className="w-full px-4 py-3 rounded-xl border border-(--bone)/60 bg-(--parchment) text-[#2d232e] text-sm placeholder:text-[#b5b2b4] focus:border-(--taupe-grey) focus:outline-none transition-colors" />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-6">
                        <button onClick={() => { setPendingType(null); setEinInput(""); setChoosingTypeFor(pendingType!.companyId); }}
                          className="px-5 py-3 rounded-xl border border-(--bone)/60 text-sm text-[#78737a] hover:bg-(--bone) transition-colors">
                          Back
                        </button>
                        <button
                          onClick={() => {
                            if (onboardingCompany) updateCompany(onboardingCompany.id, { ein: einInput });
                            const pt = pendingType!;
                            setPendingType(null); setEinInput("");
                            autoFillCompany(pt.companyId, pt.type);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2d232e] text-white text-sm font-semibold hover:bg-[#474448] transition-colors">
                          Prepare Tax Returns <ArrowRight size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => { const pt = pendingType!; setPendingType(null); setEinInput(""); autoFillCompany(pt.companyId, pt.type); }}
                        className="text-xs text-[#9a959c] hover:text-[#534b52] transition-colors text-center w-full mt-3">
                        Skip — I'll enter these in the forms
                      </button>
                    </div>
                  );
                })()}

              </div>
            </BlurFade>
          </div>
        </div>

        {/* ── How It Works ────────────────────────────────────────────── */}
        <div className="border-t border-(--bone)/40">
          <div className="max-w-6xl mx-auto px-8 py-16">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: <Zap size={20} />, title: "Connect", text: "Link your QuickBooks Online account. We read your data in read-only mode — never modify your books." },
                { icon: <BookOpen size={20} />, title: "Prepare", text: "Every transaction is normalized, mapped to IRS tax codes, and computed into form-ready values." },
                { icon: <Shield size={20} />, title: "Review & File", text: "Your CPA reviews the filled forms, makes adjustments, and exports MeF XML for IRS e-filing." },
              ].map((step, i) => (
                <BlurFade key={i} delay={0.06 + i * 0.04}>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#2d232e] text-white flex items-center justify-center shrink-0">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2d232e] text-sm mb-1">{step.title}</h3>
                      <p className="text-sm text-[#78737a] leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                </BlurFade>
              ))}
            </div>
          </div>
        </div>

        {/* ── Supported Forms ─────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-8 pb-16">
          <BlurFade delay={0.2}>
            <div className="bg-(--bone) rounded-2xl p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h2 className="text-lg font-bold text-[#2d232e]">Every entity type. Every form.</h2>
                <p className="text-xs text-[#9a959c]">6 entity types, 29+ IRS forms, complete coverage</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  "C-Corp · 1120", "S-Corp · 1120-S", "Partnership · 1065", "Sole Prop · Sch C",
                  "LLC · Sch C", "Nonprofit · 990", "Balance Sheet · Sch L", "Reconciliation · M-1",
                  "Depreciation · 4562", "COGS · 1125-A", "Capital Gains · Sch D", "Self-Employment · SE",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-[#474448]">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between border-t border-(--bone)/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#2d232e] flex items-center justify-center">
              <FileText size={12} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-[#78737a]">Tax</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#9a959c]">
            <a href="/legal/privacy" className="hover:text-[#534b52] transition-colors">Privacy</a>
            <a href="/legal/terms" className="hover:text-[#534b52] transition-colors">Terms</a>
            <a href="/legal/eula" className="hover:text-[#534b52] transition-colors">EULA</a>
          </div>
        </footer>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  const groupedForms = CATEGORY_ORDER.map((cat) => ({
    cat, items: forms.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);

  const formsFilled = active ? Object.keys(active.filledPdfs).length : 0;
  const formsTotal = forms.length;

  return (
    <div className="flex h-screen overflow-hidden bg-(--parchment) font-sans">
      {errorMsg && <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col bg-(--bone)">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2d232e] flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <span className="font-bold text-[#2d232e] text-base tracking-tight">Tax</span>
        </div>

        {/* Nav / Company list */}
        <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#9a959c] uppercase tracking-widest px-3 pt-2 pb-1">Companies</p>
          {companies.map((co) => {
            const isActive = co.id === activeId;
            const coLabel = co.entityType ? ENTITY_OPTIONS.find((o) => o.value === co.entityType)?.label : null;
            return (
              <button key={co.id} onClick={() => { setActiveId(co.id); setExpandedForms(new Set()); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${isActive ? "bg-(--bone) shadow-sm" : "hover:bg-(--parchment)"}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-[#2d232e] text-white" : "bg-(--bone) text-[#9a959c]"}`}>
                    <Building2 size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${isActive ? "font-semibold text-[#2d232e]" : "text-[#534b52]"}`}>{co.name}</p>
                    {coLabel ? (
                      <p className="text-[10px] text-[#9a959c]">{coLabel}</p>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setChoosingTypeFor(co.id); }}
                        className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">
                        Choose Type
                      </button>
                    )}
                  </div>
                  {co.loading && <RefreshCw size={12} className="animate-spin text-[#9a959c] shrink-0" />}
                </div>
              </button>
            );
          })}

          <button onClick={connectQBO}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-(--parchment) transition-colors text-sm text-[#9a959c] hover:text-[#534b52]">
            <div className="w-7 h-7 rounded-lg border-2 border-dashed border-(--bone) flex items-center justify-center"><Plus size={14} /></div>
            Add Company
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 space-y-1">
          {active && (
            <button onClick={() => disconnectCompany(active.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#9a959c] hover:text-red-500 hover:bg-red-50 transition-colors text-sm">
              <LogOut size={14} /> Disconnect
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 h-16 bg-(--bone) px-8 flex items-center justify-between">
          {active ? (
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-[#2d232e]">{active.name}</h1>
                {entityLabel && <span className="text-xs font-medium text-[#78737a] bg-(--bone) px-2.5 py-1 rounded-full">{entityLabel}</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-[#9a959c]">QuickBooks Online connected</span>
                {active.ein && <span className="text-xs text-[#9a959c]">· EIN {active.ein}</span>}
                {active.loading && <><RefreshCw size={10} className="animate-spin text-[#9a959c] ml-1" /><span className="text-xs text-[#9a959c]">Filling…</span></>}
              </div>
            </div>
          ) : (
            <p className="text-[#9a959c] text-sm">Select a company</p>
          )}
          <div className="flex items-center gap-3">
            {active?.result && blocking.length === 0 && (
              <button onClick={async () => {
                if (!active?.result?.facts || !active.entityType) return;
                const primaryForm = active.entityType === "c_corp" ? "1120" : active.entityType === "s_corp" ? "1120-S" : active.entityType === "llc_partnership" ? "1065" : active.entityType === "nonprofit" ? "990" : "1040";
                try {
                  const res = await fetch(`/api/efile/${active.id}`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ formCode: primaryForm, facts: active.result.facts, meta: { companyName: active.name, ein: active.ein, taxYear, entityType: active.entityType } }),
                  });
                  const data = await res.json();
                  if (data.errors?.length > 0) { setErrorMsg(`E-file validation: ${data.errors[0]}`); return; }
                  const blob = new Blob([data.xml], { type: "application/xml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url;
                  a.download = `${primaryForm}_${active.name.replace(/\s/g, "_")}_${taxYear}_MeF.xml`; a.click();
                  URL.revokeObjectURL(url);
                } catch (err) { setErrorMsg("E-file XML generation failed"); }
              }}
                className="flex items-center gap-2 bg-[#2d232e] hover:bg-[#474448] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
                <Send size={14} /> E-File XML
              </button>
            )}
            <select className="text-sm border border-(--bone) rounded-xl px-4 py-2 text-[#2d232e] bg-(--bone) shadow-sm" value={taxYear}
              onChange={(e) => setTaxYear(Number(e.target.value))}>
              {[2025, 2024, 2023].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {!active?.entityType ? (
            <div className="flex flex-col items-center justify-center h-full text-[#9a959c] gap-4">
              <div className="w-16 h-16 rounded-2xl bg-(--bone) shadow-sm flex items-center justify-center"><Building2 size={28} className="text-[#e0ddcf]" /></div>
              <p className="text-sm">{active ? "Choose an entity type to auto-fill forms" : "Select a company from the sidebar"}</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── Diagnostics Drawer ────────────────────────────────── */}
              {active.result && active.result.diagnostics.length > 0 && (
                <div className="bg-(--bone) rounded-2xl shadow-sm overflow-hidden">
                  <button onClick={() => setDiagOpen(!diagOpen)}
                    className={`w-full flex items-center gap-3 px-5 py-3 transition-colors ${
                      blocking.length > 0 ? "bg-red-50 text-red-700 hover:bg-red-100/60"
                      : warnings.length > 0 ? "bg-amber-50 text-amber-700 hover:bg-amber-100/60"
                      : "bg-(--bone) text-[#534b52] hover:bg-(--parchment)"
                    }`}>
                    {blocking.length > 0 ? <XCircle size={16} />
                      : warnings.length > 0 ? <AlertTriangle size={16} />
                      : <Info size={16} />}
                    <span className="text-sm font-semibold flex-1 text-left">
                      {blocking.length > 0
                        ? `${blocking.length} blocking issue${blocking.length > 1 ? "s" : ""}`
                        : warnings.length > 0
                        ? `${warnings.length} warning${warnings.length > 1 ? "s" : ""}`
                        : `${infos.length} info`}
                    </span>
                    {warnings.length > 0 && blocking.length > 0 && <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{warnings.length} warnings</span>}
                    {infos.length > 0 && (blocking.length > 0 || warnings.length > 0) && <span className="text-xs text-[#78737a] bg-white/50 px-2 py-0.5 rounded-full">{infos.length} info</span>}
                    <ChevronDown size={14} className={`shrink-0 transition-transform ${diagOpen ? "rotate-180" : ""}`} />
                  </button>
                  {diagOpen && (
                    <div className="px-5 py-3 space-y-2 border-t border-(--bone)">
                      {active.result.diagnostics.map((d, i) => {
                        const isBlock = d.severity === "blocking_error";
                        const isWarn = d.severity === "warning";
                        return (
                          <div key={i} className="flex items-start gap-2.5 text-sm">
                            {isBlock ? <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                              : isWarn ? <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                              : <Info size={14} className="text-[#b5b2b4] mt-0.5 shrink-0" />}
                            <div>
                              <span className={`font-medium ${isBlock ? "text-red-700" : isWarn ? "text-amber-700" : "text-[#534b52]"}`}>{d.title}</span>
                              <p className="text-xs text-[#78737a] mt-0.5">{d.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Form cards */}
              {groupedForms.map(({ cat, items }) => (
                <div key={cat} className="bg-(--bone) rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-(--bone)">
                    <p className="text-xs font-semibold text-[#9a959c] uppercase tracking-wider">{CATEGORY_LABELS[cat]}</p>
                  </div>
                  <div className="divide-y divide-(--bone)">
                    {items.map((f) => {
                      const isExpanded = expandedForms.has(f.form);
                      const filled = active.filledPdfs[f.form];

                      if (f.form === "990-N") {
                        return (
                          <div key={f.form} className="flex items-center gap-4 px-5 py-3.5">
                            <span className="w-20 text-sm font-semibold text-[#78737a] shrink-0">{f.form}</span>
                            <span className="text-sm text-[#534b52] flex-1">{f.title}</span>
                            <span className="text-xs text-[#b5b2b4]">Electronic only</span>
                          </div>
                        );
                      }

                      return (
                        <div key={f.form}>
                          <button onClick={() => toggleForm(f.form)}
                            className="flex items-center gap-4 w-full px-5 py-3.5 text-left hover:bg-(--parchment) transition-colors">
                            <ChevronRight size={14} className={`shrink-0 text-[#b5b2b4] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            <span className="w-20 text-sm font-bold text-[#2d232e] shrink-0">{f.form}</span>
                            <span className="text-sm text-[#534b52] flex-1 truncate">{f.title}</span>
                            {filled && <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">Filled</span>}
                            <span className="text-xs text-[#b5b2b4] shrink-0">{f.due}</span>
                          </button>
                          {isExpanded && (
                            <div className="mx-5 mb-3 rounded-xl overflow-hidden border border-(--bone) shadow-sm" style={{ height: "80vh" }}>
                              <PDFFormViewer
                                pdfBytes={filled?.pdfBytes ?? null}
                                pdfFileName={PDF_MAPPINGS[f.form]?.pdfFileName}
                                formCode={f.form}
                                onGenerate={() => regenerateForm(f.form)}
                                isGenerating={active.loading}
                                onDownload={() => downloadPdf(f.form)}
                                filledCount={filled?.filledCount}
                                totalMapped={filled?.totalMapped}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
