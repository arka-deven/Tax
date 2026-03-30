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
  /** Pending entity type — set when user picks type but EIN is missing, needs input first */
  const [pendingType, setPendingType] = useState<{ companyId: string; type: EntityType } | null>(null);
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
      <div className="flex h-screen bg-(--linen)">
        {/* Left — branding */}
        <div className="hidden lg:flex w-96 bg-(--parchment) flex-col justify-between p-10">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl bg-[#3d3229] flex items-center justify-center">
                <FileText size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-[#3d3229]">Tax</span>
            </div>
            <h2 className="text-2xl font-bold text-[#3d3229] leading-tight">Automated tax<br />preparation from<br />your books.</h2>
            <p className="text-sm text-[#8a7e74] mt-4 leading-relaxed">Connect QuickBooks, select your entity type, and we'll prepare every IRS form automatically.</p>
          </div>
          <div className="space-y-3">
            {steps.map((s) => (
              <div key={s.num} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  s.num < currentStep ? "bg-emerald-100 text-emerald-700"
                  : s.num === currentStep ? "bg-[#3d3229] text-white"
                  : "bg-(--powder-petal) text-[#a89f97]"
                }`}>
                  {s.num < currentStep ? <CheckCircle2 size={16} /> : s.num}
                </div>
                <span className={`text-sm ${s.num === currentStep ? "text-[#3d3229] font-semibold" : "text-[#a89f97]"}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <BlurFade delay={0} key={currentStep}>
            <div className="w-full max-w-md">

              {/* Step 1: Connect QBO */}
              {currentStep === 1 && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-(--parchment) flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Plug size={28} className="text-[#8a7e74]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#3d3229]">Connect QuickBooks</h2>
                  <p className="text-[#8a7e74] text-sm mt-2 mb-8">We'll read your chart of accounts and transactions to prepare your tax returns.</p>
                  <button onClick={connectQBO} className="flex items-center gap-2.5 mx-auto bg-[#2CA01C] hover:bg-[#248518] text-white text-sm font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-sm">
                    <Plug size={16} /> Connect QuickBooks Online
                  </button>
                  <p className="text-[#c4bab2] text-xs mt-4">Read-only access. We never modify your books.</p>
                </div>
              )}

              {/* Step 2: Entity Type */}
              {currentStep === 2 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-600 font-medium">{onboardingCompany?.name ?? "Company"} connected</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#3d3229]">Entity Type</h2>
                  <p className="text-[#8a7e74] text-sm mt-1 mb-6">This determines which IRS forms apply.</p>
                  <div className="space-y-2">
                    {ENTITY_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => {
                        const company = companies.find((c) => c.id === choosingTypeFor);
                        if (!company?.ein) {
                          setPendingType({ companyId: choosingTypeFor!, type: opt.value });
                          setChoosingTypeFor(null);
                        } else {
                          autoFillCompany(choosingTypeFor!, opt.value);
                        }
                      }}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-(--dust-grey) hover:border-(--almond-silk) hover:bg-(--parchment) transition-all text-left group">
                        <div>
                          <p className="text-sm font-semibold text-[#3d3229] group-hover:text-[#3d3229]">{opt.label}</p>
                          <p className="text-xs text-[#a89f97]">{opt.sub}</p>
                        </div>
                        <ChevronRight size={14} className="text-[#c4bab2] group-hover:text-[#8a7e74] transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Company Details (EIN + manual fields) */}
              {currentStep === 3 && (() => {
                const typeLabel = ENTITY_OPTIONS.find((o) => o.value === pendingType?.type)?.label ?? "";
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-600 font-medium">{onboardingCompany?.name} · {typeLabel}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-[#3d3229]">Company Details</h2>
                    <p className="text-[#8a7e74] text-sm mt-1 mb-6">These fields are required on tax returns but aren't stored in QuickBooks.</p>

                    <div className="space-y-4">
                      {/* EIN */}
                      <div>
                        <label className="text-xs font-semibold text-[#5a4a3f] block mb-1.5">EIN (Employer Identification Number) *</label>
                        <input type="text" value={einInput}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9-]/g, "");
                            if (v.length === 2 && !v.includes("-") && einInput.length < v.length) setEinInput(v + "-");
                            else setEinInput(v.slice(0, 10));
                          }}
                          placeholder="XX-XXXXXXX"
                          className="w-full px-4 py-3 rounded-xl border border-(--dust-grey) bg-(--linen) text-[#3d3229] font-mono tracking-wider placeholder:text-[#c4bab2] focus:border-(--almond-silk) focus:outline-none transition-colors" />
                      </div>

                      {/* Date Incorporated / Business Start Date */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-[#5a4a3f] block mb-1.5">
                            {pendingType?.type === "sole_prop" || pendingType?.type === "llc_single" ? "Business Start Date" : "Date Incorporated"}
                          </label>
                          <input type="date"
                            className="w-full px-3 py-3 rounded-xl border border-(--dust-grey) bg-(--linen) text-[#3d3229] text-sm focus:border-(--almond-silk) focus:outline-none transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#5a4a3f] block mb-1.5">State</label>
                          <input type="text" placeholder="e.g. DE" maxLength={2}
                            className="w-full px-3 py-3 rounded-xl border border-(--dust-grey) bg-(--linen) text-[#3d3229] text-sm uppercase placeholder:text-[#c4bab2] focus:border-(--almond-silk) focus:outline-none transition-colors" />
                        </div>
                      </div>

                      {/* NAICS / Business Activity */}
                      <div>
                        <label className="text-xs font-semibold text-[#5a4a3f] block mb-1.5">Principal Business Activity</label>
                        <input type="text" placeholder="e.g. Software Development"
                          className="w-full px-4 py-3 rounded-xl border border-(--dust-grey) bg-(--linen) text-[#3d3229] text-sm placeholder:text-[#c4bab2] focus:border-(--almond-silk) focus:outline-none transition-colors" />
                      </div>

                      {/* S-Corp specific */}
                      {pendingType?.type === "s_corp" && (
                        <div>
                          <label className="text-xs font-semibold text-[#5a4a3f] block mb-1.5">S-Election Effective Date</label>
                          <input type="date"
                            className="w-full px-3 py-3 rounded-xl border border-(--dust-grey) bg-(--linen) text-[#3d3229] text-sm focus:border-(--almond-silk) focus:outline-none transition-colors" />
                        </div>
                      )}

                      {/* Partnership/S-Corp: number of owners */}
                      {(pendingType?.type === "s_corp" || pendingType?.type === "llc_partnership") && (
                        <div>
                          <label className="text-xs font-semibold text-[#5a4a3f] block mb-1.5">
                            Number of {pendingType.type === "s_corp" ? "Shareholders" : "Partners"}
                          </label>
                          <input type="number" min={1} placeholder="e.g. 2"
                            className="w-full px-4 py-3 rounded-xl border border-(--dust-grey) bg-(--linen) text-[#3d3229] text-sm placeholder:text-[#c4bab2] focus:border-(--almond-silk) focus:outline-none transition-colors" />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-6">
                      <button onClick={() => { setPendingType(null); setEinInput(""); setChoosingTypeFor(pendingType!.companyId); }}
                        className="px-5 py-3 rounded-xl border border-(--dust-grey) text-sm text-[#8a7e74] hover:bg-(--parchment) transition-colors">
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (onboardingCompany) updateCompany(onboardingCompany.id, { ein: einInput });
                          const pt = pendingType!;
                          setPendingType(null); setEinInput("");
                          autoFillCompany(pt.companyId, pt.type);
                        }}
                        className="flex-1 px-5 py-3 rounded-xl bg-[#3d3229] text-white text-sm font-semibold hover:bg-[#5a4a3f] transition-colors">
                        Prepare Tax Returns
                      </button>
                    </div>
                    <button
                      onClick={() => { const pt = pendingType!; setPendingType(null); setEinInput(""); autoFillCompany(pt.companyId, pt.type); }}
                      className="text-xs text-[#a89f97] hover:text-[#6b5e52] transition-colors text-center w-full mt-3">
                      Skip — I'll enter these in the forms
                    </button>
                  </div>
                );
              })()}

            </div>
          </BlurFade>
        </div>
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
    <div className="flex h-screen overflow-hidden bg-(--linen) font-sans">
      {errorMsg && <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col bg-(--parchment)">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#3d3229] flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <span className="font-bold text-[#3d3229] text-base tracking-tight">Tax</span>
        </div>

        {/* Nav / Company list */}
        <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#a89f97] uppercase tracking-widest px-3 pt-2 pb-1">Companies</p>
          {companies.map((co) => {
            const isActive = co.id === activeId;
            const coLabel = co.entityType ? ENTITY_OPTIONS.find((o) => o.value === co.entityType)?.label : null;
            return (
              <button key={co.id} onClick={() => { setActiveId(co.id); setExpandedForms(new Set()); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${isActive ? "bg-(--powder-petal) shadow-sm" : "hover:bg-(--linen)"}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-[#3d3229] text-white" : "bg-(--powder-petal) text-[#a89f97]"}`}>
                    <Building2 size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${isActive ? "font-semibold text-[#3d3229]" : "text-[#6b5e52]"}`}>{co.name}</p>
                    {coLabel ? (
                      <p className="text-[10px] text-[#a89f97]">{coLabel}</p>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setChoosingTypeFor(co.id); }}
                        className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">
                        Choose Type
                      </button>
                    )}
                  </div>
                  {co.loading && <RefreshCw size={12} className="animate-spin text-[#a89f97] shrink-0" />}
                </div>
              </button>
            );
          })}

          <button onClick={connectQBO}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-(--linen) transition-colors text-sm text-[#a89f97] hover:text-[#6b5e52]">
            <div className="w-7 h-7 rounded-lg border-2 border-dashed border-(--dust-grey) flex items-center justify-center"><Plus size={14} /></div>
            Add Company
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 space-y-1">
          {active && (
            <button onClick={() => disconnectCompany(active.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#a89f97] hover:text-red-500 hover:bg-red-50 transition-colors text-sm">
              <LogOut size={14} /> Disconnect
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 h-16 bg-(--parchment) px-8 flex items-center justify-between">
          {active ? (
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-[#3d3229]">{active.name}</h1>
                {entityLabel && <span className="text-xs font-medium text-[#8a7e74] bg-(--powder-petal) px-2.5 py-1 rounded-full">{entityLabel}</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-[#a89f97]">QuickBooks Online connected</span>
                {active.ein && <span className="text-xs text-[#a89f97]">· EIN {active.ein}</span>}
                {active.loading && <><RefreshCw size={10} className="animate-spin text-[#a89f97] ml-1" /><span className="text-xs text-[#a89f97]">Filling…</span></>}
              </div>
            </div>
          ) : (
            <p className="text-[#a89f97] text-sm">Select a company</p>
          )}
          <select className="text-sm border border-(--dust-grey) rounded-xl px-4 py-2 text-[#3d3229] bg-(--parchment) shadow-sm" value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}>
            {[2025, 2024, 2023].map((y) => <option key={y}>{y}</option>)}
          </select>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {!active?.entityType ? (
            <div className="flex flex-col items-center justify-center h-full text-[#a89f97] gap-4">
              <div className="w-16 h-16 rounded-2xl bg-(--parchment) shadow-sm flex items-center justify-center"><Building2 size={28} className="text-[#d6ccc2]" /></div>
              <p className="text-sm">{active ? "Choose an entity type to auto-fill forms" : "Select a company from the sidebar"}</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── Diagnostics Card ─────────────────────────────────── */}
              {active.result && (blocking.length > 0 || warnings.length > 0) && (
                <div className="bg-(--parchment) rounded-2xl shadow-sm overflow-hidden">
                  <div className={`flex items-center gap-3 px-5 py-3 ${
                    blocking.length > 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {blocking.length > 0 ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                    <span className="text-sm font-semibold">
                      {blocking.length > 0 ? `${blocking.length} blocking issue${blocking.length > 1 ? "s" : ""}` : `${warnings.length} warning${warnings.length > 1 ? "s" : ""} to review`}
                    </span>
                    {warnings.length > 0 && blocking.length > 0 && <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{warnings.length} warnings</span>}
                    {infos.length > 0 && <span className="text-xs text-[#8a7e74] bg-(--powder-petal) px-2 py-0.5 rounded-full">{infos.length} info</span>}
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {[...blocking, ...warnings].map((d, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm">
                        {d.severity === "blocking_error"
                          ? <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                          : <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />}
                        <div>
                          <span className={`font-medium ${d.severity === "blocking_error" ? "text-red-700" : "text-amber-700"}`}>{d.title}</span>
                          <p className="text-xs text-[#8a7e74] mt-0.5">{d.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form cards */}
              {groupedForms.map(({ cat, items }) => (
                <div key={cat} className="bg-(--parchment) rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-(--powder-petal)">
                    <p className="text-xs font-semibold text-[#a89f97] uppercase tracking-wider">{CATEGORY_LABELS[cat]}</p>
                  </div>
                  <div className="divide-y divide-(--powder-petal)">
                    {items.map((f) => {
                      const isExpanded = expandedForms.has(f.form);
                      const filled = active.filledPdfs[f.form];

                      if (f.form === "990-N") {
                        return (
                          <div key={f.form} className="flex items-center gap-4 px-5 py-3.5">
                            <span className="w-20 text-sm font-semibold text-[#8a7e74] shrink-0">{f.form}</span>
                            <span className="text-sm text-[#6b5e52] flex-1">{f.title}</span>
                            <span className="text-xs text-[#c4bab2]">Electronic only</span>
                          </div>
                        );
                      }

                      return (
                        <div key={f.form}>
                          <button onClick={() => toggleForm(f.form)}
                            className="flex items-center gap-4 w-full px-5 py-3.5 text-left hover:bg-(--linen) transition-colors">
                            <ChevronRight size={14} className={`shrink-0 text-[#c4bab2] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            <span className="w-20 text-sm font-bold text-[#3d3229] shrink-0">{f.form}</span>
                            <span className="text-sm text-[#6b5e52] flex-1 truncate">{f.title}</span>
                            {filled && <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">Filled</span>}
                            <span className="text-xs text-[#c4bab2] shrink-0">{f.due}</span>
                          </button>
                          {isExpanded && (
                            <div className="mx-5 mb-3 rounded-xl overflow-hidden border border-(--dust-grey) shadow-sm" style={{ height: "80vh" }}>
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
                  <div className="bg-(--parchment) rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-(--powder-petal)">
                      <p className="text-xs font-semibold text-[#a89f97] uppercase tracking-wider">All Diagnostics</p>
                      <div className="flex items-center gap-2 text-xs">
                        {blocking.length > 0 && <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-medium">{blocking.length} blocking</span>}
                        {warnings.length > 0 && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">{warnings.length} warnings</span>}
                        {infos.length > 0 && <span className="text-[#8a7e74] bg-(--powder-petal) px-2 py-0.5 rounded-full font-medium">{infos.length} info</span>}
                      </div>
                    </div>
                    <div className="divide-y divide-(--powder-petal)">
                      {active.result.diagnostics.map((d, i) => {
                        const isBlock = d.severity === "blocking_error";
                        const isWarn = d.severity === "warning";
                        return (
                          <div key={i} className="flex gap-3 px-5 py-3">
                            {isBlock ? <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                              : isWarn ? <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                              : <Info size={16} className="text-[#c4bab2] shrink-0 mt-0.5" />}
                            <div className="min-w-0">
                              <p className={`text-sm font-medium ${isBlock ? "text-red-700" : isWarn ? "text-amber-700" : "text-[#6b5e52]"}`}>{d.title}</p>
                              <p className="text-xs text-[#a89f97] mt-0.5">{d.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
