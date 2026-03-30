"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, RefreshCw, XCircle, AlertTriangle, Info, CheckCircle2,
  ChevronRight, Plug, LogOut, Play, Building2, Plus,
} from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";
import { AnimatedList } from "@/components/magicui/animated-list";
import PDFFormViewer from "@/components/PDFFormViewer";
import { PDF_MAPPINGS } from "@/lib/pdf/pdf-mappings";
import { fillPdf } from "@/lib/pdf/pdf-filler";
import type { FilledPdfResult, FillContext } from "@/lib/pdf/types";

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

// ── Form definitions (unchanged) ─────────────────────────────────────────────

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
    { form: "Sch C",   title: "Profit or Loss from Business",                 category: "primary",      status: "required",    due: "Apr 15 (ext. Oct 15)", description: "Disregarded entity — income/loss on owner's 1040." },
    { form: "Sch SE",  title: "Self-Employment Tax",                          category: "schedule",     status: "required",    due: "with 1040",            description: "Required when net SE income ≥ $400." },
    { form: "8995",    title: "Qualified Business Income (QBI) Deduction",    category: "attachment",   status: "conditional", due: "with 1040",            description: "20% §199A deduction." },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1040",            description: "§179 and MACRS." },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1040",            description: "Gain/loss on disposal." },
    { form: "8829",    title: "Expenses for Business Use of Your Home",       category: "attachment",   status: "conditional", due: "with 1040",            description: "Home office deduction." },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "attachment",   status: "conditional", due: "with 1040",            description: "Net capital gain/loss." },
    { form: "1125-A",  title: "Cost of Goods Sold",                           category: "attachment",   status: "conditional", due: "with 1040",            description: "When inventory / COGS is part of Sch C." },
  ],
  sole_prop: [
    { form: "Sch C",   title: "Profit or Loss from Business",                 category: "primary",      status: "required",    due: "Apr 15 (ext. Oct 15)", description: "Sole proprietor income and deductions." },
    { form: "Sch SE",  title: "Self-Employment Tax",                          category: "schedule",     status: "required",    due: "with 1040",            description: "15.3% SE tax on net earnings ≥ $400." },
    { form: "8995",    title: "Qualified Business Income (QBI) Deduction",    category: "attachment",   status: "conditional", due: "with 1040",            description: "20% §199A deduction." },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1040",            description: "§179 and MACRS." },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1040",            description: "Gain/loss on disposal." },
    { form: "8829",    title: "Expenses for Business Use of Your Home",       category: "attachment",   status: "conditional", due: "with 1040",            description: "Home office deduction." },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "attachment",   status: "conditional", due: "with 1040",            description: "Net capital gain/loss." },
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
  { value: "llc_single",      label: "LLC (Single-Member)", sub: "Schedule C" },
  { value: "sole_prop",       label: "Sole Proprietor",     sub: "Schedule C" },
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
  /** Which company is currently selecting entity type (inline in sidebar) */
  const [choosingTypeFor, setChoosingTypeFor] = useState<string | null>(null);

  const active = companies.find((c) => c.id === activeId) ?? null;
  const entityLabel = active?.entityType
    ? ENTITY_OPTIONS.find((o) => o.value === active.entityType)?.label ?? ""
    : "";
  const forms = active?.entityType ? FORMS_BY_ENTITY[active.entityType] : [];

  // ── Helpers to update a specific company in state ──────────────────────────

  function updateCompany(id: string, patch: Partial<Company>) {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  // ── Auto-check existing QBO connection on mount ───────────────────────────

  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await fetch("/api/auth/qbo/status?entityId=entity_1");
        const json = await res.json();
        if (json.connected) {
          const co: Company = {
            id: "entity_1", name: json.companyName || "Company", ein: json.ein || "",
            entityType: null, result: null, filledPdfs: {}, fieldOverrides: {}, loading: false,
          };
          setCompanies([co]);
          setActiveId("entity_1");
          setChoosingTypeFor("entity_1"); // prompt for type
        }
      } catch { /* not connected */ }
    }
    checkExisting();
  }, []);

  // ── Listen for OAuth popup callback ───────────────────────────────────────

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "QBO_AUTH_SUCCESS") {
        const eid = event.data.entityId ?? `entity_${Date.now()}`;
        const co: Company = {
          id: eid, name: event.data.companyName || "Company", ein: event.data.ein || "",
          entityType: null, result: null, filledPdfs: {}, fieldOverrides: {}, loading: false,
        };
        setCompanies((prev) => {
          // Replace if same id, otherwise append
          const exists = prev.find((c) => c.id === eid);
          return exists ? prev.map((c) => (c.id === eid ? co : c)) : [...prev, co];
        });
        setActiveId(eid);
        setChoosingTypeFor(eid);
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

  // ── No companies yet → Connect screen ─────────────────────────────────────

  if (companies.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-(--linen)">
        <BlurFade delay={0}>
          <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-(--powder-petal) flex items-center justify-center">
              <FileText size={22} className="text-[#8a7e74]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#3d3229] tracking-tight">Tax</h1>
              <p className="text-[#a89f97] text-sm mt-1">Connect your QuickBooks Online account to get started.</p>
            </div>
            <button onClick={connectQBO} className="flex items-center gap-2 bg-[#2CA01C] hover:bg-[#248518] text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm">
              <Plug size={15} /> Connect QuickBooks Online
            </button>
            <p className="text-[#c4bab2] text-xs">Your books are read-only. We never write to QuickBooks.</p>
          </div>
        </BlurFade>
      </div>
    );
  }

  // ── Entity type chooser (inline overlay) ──────────────────────────────────

  if (choosingTypeFor) {
    const co = companies.find((c) => c.id === choosingTypeFor);
    return (
      <div className="flex h-screen items-center justify-center bg-(--linen)">
        <BlurFade delay={0}>
          <div className="flex flex-col gap-5 max-w-sm w-full px-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-600 font-medium">{co?.name ?? "QuickBooks"} connected</span>
              </div>
              <h2 className="text-lg font-semibold text-[#3d3229]">What type of entity is this?</h2>
              <p className="text-[#a89f97] text-sm mt-0.5">This determines which IRS forms apply. Forms will auto-fill from QBO data.</p>
            </div>
            <div className="space-y-2">
              {ENTITY_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => autoFillCompany(choosingTypeFor, opt.value)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-(--dust-grey) hover:border-(--almond-silk) hover:bg-(--parchment) transition-colors text-left">
                  <div><p className="text-sm font-medium text-[#4a3f35]">{opt.label}</p><p className="text-xs text-[#a89f97]">{opt.sub}</p></div>
                  <ChevronRight size={14} className="text-[#c4bab2]" />
                </button>
              ))}
            </div>
          </div>
        </BlurFade>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  const groupedForms = CATEGORY_ORDER.map((cat) => ({
    cat, items: forms.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-(--linen) font-sans">
      {errorMsg && <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-(--powder-petal) bg-(--parchment)">
        <div className="px-5 py-5 border-b border-(--powder-petal)">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-[#a89f97]" />
            <span className="font-semibold text-[#4a3f35] tracking-tight text-sm">Tax</span>
          </div>
          <p className="text-[#a89f97] text-[10px] mt-0.5">Internal · {taxYear}</p>
        </div>

        {/* Company list */}
        <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto">
          <p className="text-[#a89f97] text-[10px] font-semibold uppercase tracking-widest px-2 mb-1">Companies</p>
          {companies.map((co) => {
            const isActive = co.id === activeId;
            const coLabel = co.entityType ? ENTITY_OPTIONS.find((o) => o.value === co.entityType)?.label : null;
            return (
              <button key={co.id} onClick={() => { setActiveId(co.id); setExpandedForms(new Set()); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${isActive ? "bg-(--linen) border-(--dust-grey) shadow-xs" : "border-transparent hover:bg-(--linen)/60"}`}>
                <div className="flex items-start gap-2">
                  <Building2 size={13} className={`mt-0.5 shrink-0 ${isActive ? "text-[#8a7e74]" : "text-[#c4bab2]"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#4a3f35] truncate">{co.name}</p>
                    {coLabel ? (
                      <p className="text-[10px] text-[#a89f97] mt-0.5">{coLabel}</p>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setChoosingTypeFor(co.id); }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium mt-0.5">
                        Choose Type
                      </button>
                    )}
                    {co.loading && (
                      <div className="flex items-center gap-1 mt-1">
                        <RefreshCw size={9} className="animate-spin text-[#a89f97]" />
                        <span className="text-[10px] text-[#a89f97]">Auto-filling…</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Add another company */}
          <button onClick={connectQBO}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-(--dust-grey) hover:border-(--almond-silk) hover:bg-(--linen)/60 transition-colors text-xs text-[#a89f97] hover:text-[#6b5e52]">
            <Plus size={12} /> Add Company
          </button>
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-(--powder-petal) space-y-1">
          {active && (
            <button onClick={() => disconnectCompany(active.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#a89f97] hover:text-red-500 hover:bg-red-50 transition-colors text-xs">
              <LogOut size={12} /> Disconnect {active.name.split(" ")[0]}
            </button>
          )}
          <p className="text-[#c4bab2] text-[10px] px-3">v0.2.0</p>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 border-b border-(--powder-petal) bg-(--linen) px-8 py-4 flex items-center justify-between">
          {active ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-semibold text-[#3d3229]">{active.name}</h1>
                {active.ein && <span className="text-[11px] font-mono text-[#a89f97] bg-(--parchment) border border-(--dust-grey) px-2 py-0.5 rounded">EIN {active.ein}</span>}
                {entityLabel && <span className="text-xs border border-(--dust-grey) text-[#8a7e74] px-2 py-0.5 rounded-full bg-(--parchment)">{entityLabel}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-[#a89f97]">QuickBooks Online connected</span>
                {active.loading && <><RefreshCw size={10} className="animate-spin text-[#a89f97] ml-2" /><span className="text-xs text-[#a89f97]">Auto-filling forms…</span></>}
              </div>
            </div>
          ) : (
            <p className="text-[#a89f97] text-sm">Select a company from the sidebar</p>
          )}
          <select className="text-sm border border-(--dust-grey) rounded-lg px-3 py-1.5 text-[#6b5e52] bg-(--linen)" value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}>
            {[2025, 2024, 2023].map((y) => <option key={y}>{y}</option>)}
          </select>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-7">
          {!active?.entityType ? (
            <div className="flex flex-col items-center justify-center h-full text-[#a89f97] gap-4">
              <Building2 size={40} className="text-stone-200" />
              <p className="text-sm">{active ? "Choose an entity type to auto-fill forms" : "Select a company from the sidebar"}</p>
            </div>
          ) : (
            <div className="max-w-4xl space-y-4">
              {/* Pipeline status */}
              {active.result && (
                <BlurFade delay={0}>
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
                    blocking.length > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}>
                    {blocking.length === 0 ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    <span className="font-medium">{blocking.length === 0 ? "Analysis complete — ready for review" : `${blocking.length} blocking issue${blocking.length > 1 ? "s" : ""}`}</span>
                    <span className="text-xs opacity-60 ml-auto">{new Date(active.result.ranAt).toLocaleString()}</span>
                  </div>
                </BlurFade>
              )}

              {/* Form cards */}
              {groupedForms.map(({ cat, items }) => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold text-[#a89f97] uppercase tracking-widest mb-3 pl-7">{CATEGORY_LABELS[cat]}</p>
                  <div className="space-y-1">
                    {items.map((f) => {
                      const isExpanded = expandedForms.has(f.form);
                      const filled = active.filledPdfs[f.form];

                      if (f.form === "990-N") {
                        return (
                          <div key={f.form} className="flex items-center gap-3 py-2 pl-7 pr-4">
                            <span className="w-16 text-xs font-semibold text-[#8a7e74] shrink-0">{f.form}</span>
                            <span className="text-sm text-[#5a4a3f] flex-1">{f.title}</span>
                            <span className="text-[10px] text-[#c4bab2]">Electronic only</span>
                          </div>
                        );
                      }

                      return (
                        <div key={f.form}>
                          <button onClick={() => toggleForm(f.form)}
                            className="flex items-center gap-3 w-full py-2 pl-2 pr-4 rounded-lg text-left hover:bg-(--parchment) transition-colors">
                            <ChevronRight size={12} className={`shrink-0 text-[#c4bab2] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            <span className="w-16 text-xs font-semibold text-[#5a4a3f] shrink-0">{f.form}</span>
                            <span className="text-sm text-[#8a7e74] flex-1 truncate">{f.title}</span>
                            {filled && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">filled</span>}
                            <span className="text-[10px] text-[#c4bab2] shrink-0">{f.due}</span>
                          </button>
                          {isExpanded && (
                            <div className="border border-(--dust-grey) rounded-xl overflow-hidden" style={{ height: "80vh" }}>
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

              {/* Diagnostics */}
              {active.result && active.result.diagnostics.length > 0 && (
                <BlurFade delay={0.05}>
                  <div className="bg-(--linen) border border-(--dust-grey) rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-semibold text-[#a89f97] uppercase tracking-widest">Diagnostics</p>
                      <div className="flex items-center gap-3 text-xs font-medium">
                        {blocking.length > 0 && <span className="text-red-400">{blocking.length} blocking</span>}
                        {warnings.length > 0 && <span className="text-amber-500">{warnings.length} warnings</span>}
                        {infos.length > 0 && <span className="text-[#a89f97]">{infos.length} info</span>}
                      </div>
                    </div>
                    <AnimatedList delay={350}>
                      {active.result.diagnostics.map((d, i) => {
                        const cfg = d.severity === "blocking_error"
                          ? { bg: "bg-red-50 border-red-100", icon: <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />, t: "text-red-700", m: "text-red-500" }
                          : d.severity === "warning"
                          ? { bg: "bg-amber-50 border-amber-100", icon: <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />, t: "text-amber-700", m: "text-amber-500" }
                          : { bg: "bg-(--parchment) border-(--powder-petal)", icon: <Info size={13} className="text-[#a89f97] shrink-0 mt-0.5" />, t: "text-[#6b5e52]", m: "text-[#a89f97]" };
                        return (
                          <div key={i} className={`flex gap-3 p-3 rounded-lg border ${cfg.bg}`}>
                            {cfg.icon}
                            <div>
                              <p className={`text-xs font-semibold ${cfg.t}`}>{d.title} <span className="font-normal opacity-50">[{d.code}]</span></p>
                              <p className={`text-xs mt-0.5 ${cfg.m}`}>{d.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </AnimatedList>
                  </div>
                </BlurFade>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
