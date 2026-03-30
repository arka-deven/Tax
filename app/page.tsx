"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  Plug,
  LogOut,
  Play,
  ExternalLink,
  Building2,
} from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";
import { AnimatedList } from "@/components/magicui/animated-list";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { FORM_FIELD_DEFS, FORM_METADATA, computeFormValues, recomputeFields } from "@/lib/form-fields";
import type { FormFieldDef } from "@/lib/form-fields";
import IRSFormView from "@/components/IRSFormView";

// ── Error Toast ───────────────────────────────────────────────────────────────

function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
      <div className="flex items-start gap-3 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg max-w-md">
        <XCircle size={16} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Error</p>
          <p className="text-xs text-red-200 mt-0.5 leading-snug">{message}</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-red-300 hover:text-white transition-colors">
          <XCircle size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type EntityType =
  | "c_corp"
  | "s_corp"
  | "llc_partnership"
  | "llc_single"
  | "sole_prop"
  | "nonprofit";

interface DiagItem {
  severity: "blocking_error" | "warning" | "info";
  code: string;
  title: string;
  message: string;
}

interface PipelineResult {
  requiredForms: string[];
  possibleForms: string[];
  diagnostics: DiagItem[];
  facts: Record<string, number | string | boolean>;
  ranAt: string;
}

// ── IRS Form definitions by entity type ──────────────────────────────────────

type FormStatus = "required" | "conditional" | "possible";
type FormCategory = "primary" | "schedule" | "attachment" | "informational";

interface IRSForm {
  form: string;
  title: string;
  description: string;
  category: FormCategory;
  status: FormStatus;
  due: string;
  irsUrl?: string;
}

const FORMS_BY_ENTITY: Record<EntityType, IRSForm[]> = {
  c_corp: [
    { form: "1120",    title: "U.S. Corporation Income Tax Return",           category: "primary",      status: "required",    due: "Apr 15 (ext. Oct 15)", description: "Core annual filing — income, deductions, credits, and tax liability.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120" },
    { form: "Sch L",   title: "Balance Sheet per Books",                      category: "schedule",     status: "required",    due: "with 1120",            description: "Comparative beginning and end-of-year balance sheet.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120" },
    { form: "Sch M-2", title: "Analysis of Unappropriated Retained Earnings", category: "schedule",     status: "required",    due: "with 1120",            description: "Reconciles beginning and ending retained earnings.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120" },
    { form: "Sch M-1", title: "Reconciliation of Income (Book vs. Tax)",      category: "schedule",     status: "conditional", due: "with 1120",            description: "Book-to-tax reconciliation required when total assets < $10M.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120" },
    { form: "Sch M-3", title: "Net Income Reconciliation (Large Corp.)",      category: "schedule",     status: "conditional", due: "with 1120",            description: "Replaces M-1 when total assets ≥ $10M at year-end.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120-x" },
    { form: "Sch C",   title: "Dividends, Inclusions & Special Deductions",   category: "schedule",     status: "conditional", due: "with 1120",            description: "DRD calculations when dividend income is present.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120" },
    { form: "1125-A",  title: "Cost of Goods Sold",                           category: "attachment",   status: "conditional", due: "with 1120",            description: "Required when cost of goods sold is deducted on line 2.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1125-a" },
    { form: "1125-E",  title: "Compensation of Officers",                     category: "attachment",   status: "conditional", due: "with 1120",            description: "Required when gross receipts exceed $500,000.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1125-e" },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1120",            description: "§179 elections, bonus depreciation, and MACRS detail. 2025 §179 limit: $1,250,000.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4562" },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1120",            description: "§1245/§1250 recapture and ordinary gain on asset disposals.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4797" },
    { form: "8990",    title: "Business Interest Expense Limitation",         category: "attachment",   status: "conditional", due: "with 1120",            description: "§163(j) interest deduction limitation worksheet.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-8990" },
    { form: "1118",    title: "Foreign Tax Credit — Corporations",            category: "informational", status: "conditional", due: "with 1120",           description: "Required when foreign income, taxes, or activities are present.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1118" },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "attachment",   status: "conditional", due: "with 1120",            description: "Net capital gain/loss from sales of capital assets.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-d-form-1120" },
  ],
  s_corp: [
    { form: "1120-S",  title: "U.S. Income Tax Return for an S Corporation",  category: "primary",      status: "required",    due: "Mar 15 (ext. Sep 15)", description: "Core annual filing for S corporations — income flows to shareholders.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120-s" },
    { form: "Sch K",   title: "Shareholders' Pro Rata Share Items",           category: "schedule",     status: "required",    due: "with 1120-S",          description: "Aggregate pass-through items before allocation to each shareholder.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120-s" },
    { form: "Sch K-1", title: "Shareholder's Share of Income (per owner)",    category: "schedule",     status: "required",    due: "Mar 15",               description: "One K-1 issued to each shareholder reporting their allocated items.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-k-1-form-1120-s" },
    { form: "Sch L",   title: "Balance Sheet per Books",                      category: "schedule",     status: "required",    due: "with 1120-S",          description: "Comparative balance sheet at beginning and end of year.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120-s" },
    { form: "Sch M-2", title: "Analysis of AAA, OAA, and E&P",               category: "schedule",     status: "required",    due: "with 1120-S",          description: "Accumulated Adjustments Account (AAA) reconciliation.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120-s" },
    { form: "Sch M-1", title: "Reconciliation of Income",                     category: "schedule",     status: "conditional", due: "with 1120-S",          description: "Book-to-tax reconciliation (assets < $10M).", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1120-s" },
    { form: "1125-A",  title: "Cost of Goods Sold",                           category: "attachment",   status: "conditional", due: "with 1120-S",          description: "Required when COGS is deducted.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1125-a" },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1120-S",          description: "§179 elections and MACRS depreciation detail.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4562" },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1120-S",          description: "Gain/loss on disposal of business assets.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4797" },
    { form: "7203",    title: "S Corporation Shareholder Stock Basis",        category: "attachment",   status: "conditional", due: "with shareholder return", description: "Required for shareholders claiming loss or receiving distributions.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-7203" },
    { form: "8825",    title: "Rental Real Estate Income and Expenses",       category: "attachment",   status: "conditional", due: "with 1120-S",          description: "Required when rental real estate income is present.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-8825" },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "attachment",   status: "conditional", due: "with 1120-S",          description: "Net capital gain/loss from sales of capital assets.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-d-form-1120-s" },
  ],
  llc_partnership: [
    { form: "1065",    title: "U.S. Return of Partnership Income",            category: "primary",      status: "required",    due: "Mar 15 (ext. Sep 15)", description: "Core annual filing for partnerships and multi-member LLCs.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1065" },
    { form: "Sch K",   title: "Partners' Distributive Share Items",           category: "schedule",     status: "required",    due: "with 1065",            description: "Aggregate pass-through items before allocation to partners.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1065" },
    { form: "Sch K-1", title: "Partner's Share of Income (per partner)",      category: "schedule",     status: "required",    due: "Mar 15",               description: "One K-1 issued to each partner with their allocated items.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-k-1-form-1065" },
    { form: "Sch L",   title: "Balance Sheet per Books",                      category: "schedule",     status: "required",    due: "with 1065",            description: "Comparative balance sheet at beginning and end of year.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1065" },
    { form: "Sch M-2", title: "Analysis of Partners' Capital Accounts",       category: "schedule",     status: "required",    due: "with 1065",            description: "Beginning-to-ending capital account rollforward for all partners.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1065" },
    { form: "Sch M-1", title: "Reconciliation of Income",                     category: "schedule",     status: "conditional", due: "with 1065",            description: "Book-to-tax reconciliation (assets < $10M).", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1065" },
    { form: "Sch B-1", title: "Information on Certain Partners",              category: "schedule",     status: "conditional", due: "with 1065",            description: "Required when any partner owns ≥ 50% of the partnership.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1065" },
    { form: "K-2/K-3", title: "Partners' International Items",                category: "informational", status: "conditional", due: "Mar 15",              description: "Required when partners have foreign tax credit or international items.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-k-2-and-k-3-form-1065" },
    { form: "1125-A",  title: "Cost of Goods Sold",                           category: "attachment",   status: "conditional", due: "with 1065",            description: "Required when COGS is deducted.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1125-a" },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1065",            description: "§179 elections and MACRS depreciation detail.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4562" },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1065",            description: "Gain/loss on disposal of business assets.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4797" },
    { form: "8825",    title: "Rental Real Estate Income and Expenses",       category: "attachment",   status: "conditional", due: "with 1065",            description: "Required when rental real estate income is present.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-8825" },
    { form: "8990",    title: "Business Interest Expense Limitation",         category: "attachment",   status: "conditional", due: "with 1065",            description: "§163(j) interest deduction limitation.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-8990" },
  ],
  llc_single: [
    { form: "Sch C",   title: "Profit or Loss from Business",                 category: "primary",      status: "required",    due: "Apr 15 (ext. Oct 15)", description: "Disregarded entity — income/loss reported on owner's Form 1040.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-c-form-1040" },
    { form: "Sch SE",  title: "Self-Employment Tax",                          category: "schedule",     status: "required",    due: "with 1040",            description: "Required when net self-employment income ≥ $400.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-se-form-1040" },
    { form: "8995",    title: "Qualified Business Income (QBI) Deduction",    category: "attachment",   status: "conditional", due: "with 1040",            description: "20% deduction for qualified business income under §199A.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-8995" },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1040",            description: "§179 elections and MACRS depreciation detail.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4562" },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1040",            description: "Gain/loss on disposal of business assets.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4797" },
    { form: "8829",    title: "Expenses for Business Use of Your Home",       category: "attachment",   status: "conditional", due: "with 1040",            description: "Home office deduction — regular and exclusive use required.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-8829" },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "attachment",   status: "conditional", due: "with 1040",            description: "Net capital gain/loss from sales of capital assets.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-d-form-1040" },
    { form: "1125-A",  title: "Cost of Goods Sold",                           category: "attachment",   status: "conditional", due: "with 1040",            description: "Required when inventory / COGS is part of Schedule C.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-1125-a" },
  ],
  sole_prop: [
    { form: "Sch C",   title: "Profit or Loss from Business",                 category: "primary",      status: "required",    due: "Apr 15 (ext. Oct 15)", description: "Reports sole proprietor business income and deductions on Form 1040.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-c-form-1040" },
    { form: "Sch SE",  title: "Self-Employment Tax",                          category: "schedule",     status: "required",    due: "with 1040",            description: "15.3% SE tax (SS + Medicare) on net earnings ≥ $400.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-se-form-1040" },
    { form: "8995",    title: "Qualified Business Income (QBI) Deduction",    category: "attachment",   status: "conditional", due: "with 1040",            description: "20% §199A deduction for qualified business income.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-8995" },
    { form: "4562",    title: "Depreciation and Amortization",                category: "attachment",   status: "conditional", due: "with 1040",            description: "§179 elections and MACRS depreciation detail.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4562" },
    { form: "4797",    title: "Sales of Business Property",                   category: "attachment",   status: "conditional", due: "with 1040",            description: "Gain/loss on disposal of business assets.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4797" },
    { form: "8829",    title: "Expenses for Business Use of Your Home",       category: "attachment",   status: "conditional", due: "with 1040",            description: "Home office deduction.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-8829" },
    { form: "Sch D",   title: "Capital Gains and Losses",                     category: "attachment",   status: "conditional", due: "with 1040",            description: "Net capital gain/loss from sales of capital assets.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-d-form-1040" },
  ],
  nonprofit: [
    { form: "990",     title: "Return of Organization Exempt from Income Tax", category: "primary",     status: "conditional", due: "May 15 (ext. Nov 15)", description: "Required when gross receipts ≥ $200K or assets ≥ $500K.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-990" },
    { form: "990-EZ",  title: "Short Form Return of Organization",             category: "primary",     status: "conditional", due: "May 15 (ext. Nov 15)", description: "Gross receipts $50K–$199K and assets < $500K.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-990-ez" },
    { form: "990-N",   title: "e-Postcard (Annual Electronic Notice)",         category: "primary",     status: "conditional", due: "May 15",               description: "Gross receipts normally ≤ $50K — electronic filing only.", irsUrl: "https://www.irs.gov/charities-non-profits/annual-electronic-filing-requirement-for-small-exempt-organizations-form-990-n-e-postcard" },
    { form: "Sch A",   title: "Public Charity Status and Public Support",      category: "schedule",    status: "required",    due: "with 990/990-EZ",      description: "Required for §501(c)(3) organizations — establishes public charity classification.", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-a-form-990-or-990-ez" },
    { form: "Sch B",   title: "Schedule of Contributors",                      category: "schedule",    status: "required",    due: "with 990/990-EZ",      description: "Lists contributors of $5,000 or more (kept confidential by IRS).", irsUrl: "https://www.irs.gov/forms-pubs/about-schedule-b-form-990" },
    { form: "990-T",   title: "Exempt Organization Business Income Tax Return", category: "attachment",  status: "conditional", due: "Apr 15 (ext. Oct 15)", description: "Required when unrelated business taxable income (UBTI) ≥ $1,000.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-990-t" },
    { form: "4562",    title: "Depreciation and Amortization",                 category: "attachment",  status: "conditional", due: "with 990",             description: "Depreciation of assets used in program activities.", irsUrl: "https://www.irs.gov/forms-pubs/about-form-4562" },
  ],
};

// ── Entity type options ───────────────────────────────────────────────────────

const ENTITY_OPTIONS: { value: EntityType; label: string; sub: string }[] = [
  { value: "c_corp",          label: "C-Corporation",       sub: "Form 1120" },
  { value: "s_corp",          label: "S-Corporation",       sub: "Form 1120-S" },
  { value: "llc_partnership", label: "LLC (Multi-Member)",  sub: "Form 1065" },
  { value: "llc_single",      label: "LLC (Single-Member)", sub: "Schedule C" },
  { value: "sole_prop",       label: "Sole Proprietor",     sub: "Schedule C" },
  { value: "nonprofit",       label: "Nonprofit 501(c)(3)", sub: "Form 990" },
];

const CATEGORY_LABELS: Record<FormCategory, string> = {
  primary:       "Primary Return",
  schedule:      "Schedules",
  attachment:    "Attachments",
  informational: "Informational",
};

const CATEGORY_ORDER: FormCategory[] = ["primary", "schedule", "attachment", "informational"];

const STATUS_STYLES: Record<FormStatus, { badge: string; dot: string }> = {
  required:    { badge: "bg-blue-50 text-blue-700 border-blue-200",    dot: "bg-blue-500" },
  conditional: { badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  possible:    { badge: "bg-stone-50 text-stone-500 border-stone-200", dot: "bg-stone-300" },
};

// ── Component ─────────────────────────────────────────────────────────────────

type Step = "connect" | "entity_select" | "dashboard";

export default function Home() {
  const [step, setStep] = useState<Step>("connect");
  const [entityId] = useState("entity_1");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [ein, setEin] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [taxYear, setTaxYear] = useState(2025);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [running, setRunning] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set());
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const [generatingForm, setGeneratingForm] = useState<string | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "QBO_AUTH_SUCCESS") {
        setCompanyName(event.data.companyName ?? "Your Company");
        setEin(event.data.ein ?? null);
        setStep("entity_select");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function connectQBO() {
    const url = `/api/auth/qbo?entityId=${entityId}`;
    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(url, "qbo-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`);
  }

  async function disconnectQBO() {
    setDisconnecting(true);
    try {
      await fetch("/api/auth/qbo/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
    } finally {
      setStep("connect");
      setEntityType(null);
      setResult(null);
      setCompanyName(null);
      setEin(null);
      setDisconnecting(false);
    }
  }

  function confirmEntityType(type: EntityType) {
    setEntityType(type);
    setStep("dashboard");
  }

  async function runPipeline(): Promise<PipelineResult | null> {
    if (!entityType) return null;
    setRunning(true);
    try {
      const res = await fetch(`/api/pipeline/${entityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxYear, entityType }),
      });
      const json = await res.json() as PipelineResult & { error?: string };
      if (res.ok) {
        setResult(json);
        return json;
      } else {
        setErrorMsg(json.error ?? "Pipeline failed. Check server logs.");
        return null;
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error running analysis.");
      return null;
    } finally {
      setRunning(false);
    }
  }

  const generateForm = useCallback(async (formCode: string) => {
    setGeneratingForm(formCode);
    let facts = result?.facts;
    if (!facts) {
      const res = await runPipeline();
      if (!res) { setGeneratingForm(null); return; }
      facts = res.facts;
    }
    const values = computeFormValues(formCode, facts);
    setFormValues(prev => ({ ...prev, [formCode]: values }));
    setExpandedForms(prev => new Set([...prev, formCode]));
    setGeneratingForm(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, entityType, entityId, taxYear]);

  function toggleForm(formCode: string) {
    setExpandedForms(prev => {
      const next = new Set(prev);
      if (next.has(formCode)) next.delete(formCode);
      else next.add(formCode);
      return next;
    });
  }

  function handleFieldChange(formCode: string, line: string, value: string) {
    setFormValues(prev => {
      const current = { ...prev[formCode], [line]: value };
      const recomputed = recomputeFields(formCode, current);
      return { ...prev, [formCode]: recomputed };
    });
    setEditedFields(prev => new Set([...prev, `${formCode}:${line}`]));
  }

  function formatCurrency(val: string | undefined): string {
    if (!val) return "";
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const blocking = result?.diagnostics.filter((d) => d.severity === "blocking_error") ?? [];
  const warnings  = result?.diagnostics.filter((d) => d.severity === "warning") ?? [];
  const infos     = result?.diagnostics.filter((d) => d.severity === "info") ?? [];
  const entityLabel = ENTITY_OPTIONS.find((o) => o.value === entityType)?.label ?? "";
  const forms = entityType ? FORMS_BY_ENTITY[entityType] : [];

  // Overlay pipeline-confirmed status on forms
  function resolvedStatus(f: IRSForm): "confirmed_required" | "confirmed_possible" | "confirmed_no" | FormStatus {
    if (!result) return f.status;
    const code = f.form.replace(/\s/g, "").replace("Sch", "Schedule");
    if (result.requiredForms.some((r) => r.includes(f.form) || f.form.includes(r.split(" ")[0]))) return "confirmed_required";
    if (result.possibleForms.some((r) => r.includes(f.form) || f.form.includes(r.split(" ")[0]))) return "confirmed_possible";
    return f.status;
  }

  // ── Step: Connect ──────────────────────────────────────────────────────────
  if (step === "connect") {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <BlurFade delay={0}>
          <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
              <FileText size={22} className="text-stone-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Tax</h1>
              <p className="text-stone-400 text-sm mt-1">
                Connect your QuickBooks Online account to get started.
              </p>
            </div>
            <button
              onClick={connectQBO}
              className="flex items-center gap-2 bg-[#2CA01C] hover:bg-[#248518] text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              <Plug size={15} />
              Connect QuickBooks Online
            </button>
            <p className="text-stone-300 text-xs">
              Your books are read-only. We never write to QuickBooks.
            </p>
          </div>
        </BlurFade>
      </div>
    );
  }

  // ── Step: Entity type select ───────────────────────────────────────────────
  if (step === "entity_select") {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <BlurFade delay={0}>
          <div className="flex flex-col gap-5 max-w-sm w-full px-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-600 font-medium">
                  {companyName ?? "QuickBooks"} connected
                </span>
              </div>
              <h2 className="text-lg font-semibold text-stone-900">What type of entity is this?</h2>
              <p className="text-stone-400 text-sm mt-0.5">
                This determines which IRS forms apply.
              </p>
            </div>
            <div className="space-y-2">
              {ENTITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => confirmEntityType(opt.value)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-800">{opt.label}</p>
                    <p className="text-xs text-stone-400">{opt.sub}</p>
                  </div>
                  <ChevronRight size={14} className="text-stone-300" />
                </button>
              ))}
            </div>
          </div>
        </BlurFade>
      </div>
    );
  }

  // ── Step: Dashboard ────────────────────────────────────────────────────────
  const groupedForms = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: forms.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans">
      {/* Error toast */}
      {errorMsg && <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />}

      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-stone-100 bg-stone-50">
        <div className="px-5 py-5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-stone-400" />
            <span className="font-semibold text-stone-800 tracking-tight text-sm">Tax</span>
          </div>
          <p className="text-stone-400 text-[10px] mt-0.5">Internal · {taxYear}</p>
        </div>

        <div className="flex-1 px-3 py-3 space-y-1">
          <p className="text-stone-400 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">Company</p>
          <div className="px-3 py-3 rounded-lg bg-white border border-stone-100 shadow-xs space-y-2">
            <div className="flex items-start gap-2">
              <Building2 size={13} className="text-stone-300 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-800 truncate">{companyName ?? "My Company"}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">{entityLabel}</p>
              </div>
            </div>
            {ein && (
              <div className="pt-1.5 border-t border-stone-100">
                <p className="text-[10px] text-stone-400 font-medium">EIN</p>
                <p className="text-xs font-mono text-stone-600 mt-0.5 tracking-wide">{ein}</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-3 py-3 border-t border-stone-100 space-y-1">
          <button
            onClick={disconnectQBO}
            disabled={disconnecting}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
          >
            <LogOut size={12} />
            {disconnecting ? "Disconnecting…" : "Disconnect QBO"}
          </button>
          <p className="text-stone-300 text-[10px] px-3">v0.1.0 · Internal only</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 border-b border-stone-100 bg-white px-8 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-semibold text-stone-900">{companyName ?? "My Company"}</h1>
              {ein && (
                <span className="text-[11px] font-mono text-stone-400 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded">
                  EIN {ein}
                </span>
              )}
              <span className="text-xs border border-stone-200 text-stone-500 px-2 py-0.5 rounded-full bg-stone-50">
                {entityLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-stone-400">QuickBooks Online connected</span>
            </div>
          </div>
          <select
            className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 bg-white"
            value={taxYear}
            onChange={(e) => { setTaxYear(Number(e.target.value)); setResult(null); setFormValues({}); }}
          >
            {[2025, 2024, 2023].map((y) => <option key={y}>{y}</option>)}
          </select>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-7">
          <div className="max-w-4xl space-y-4">

            {/* Pipeline status strip — only after run */}
            {result && (
              <BlurFade delay={0}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
                  blocking.length > 0
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}>
                  {blocking.length === 0
                    ? <CheckCircle2 size={15} />
                    : <XCircle size={15} />}
                  <span className="font-medium">
                    {blocking.length === 0 ? "Analysis complete — ready for review" : `${blocking.length} blocking issue${blocking.length > 1 ? "s" : ""} found`}
                  </span>
                  <span className="text-xs opacity-60 ml-auto">{new Date(result.ranAt).toLocaleString()}</span>
                </div>
              </BlurFade>
            )}

            {/* ── IRS Form Cards ─────────────────────────────────────────── */}
            {groupedForms.map(({ cat, items }) => (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2 px-1">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="space-y-5">
                  {items.map((f) => {
                    const fieldDefs = FORM_FIELD_DEFS[f.form];
                    const meta = FORM_METADATA[f.form];
                    const hasFields = !!fieldDefs && !!meta;
                    const fv = formValues[f.form] ?? {};
                    const isGeneratingThis = generatingForm === f.form;
                    const isExpanded = expandedForms.has(f.form);

                    // If we have field definitions + metadata, render the full IRS form
                    if (hasFields) {
                      return (
                        <div key={f.form}>
                          {/* Collapse toggle */}
                          <button
                            onClick={() => toggleForm(f.form)}
                            className="flex items-center gap-2 mb-1 text-xs text-stone-500 hover:text-stone-800 transition-colors"
                          >
                            <ChevronRight size={12} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            <span className="font-semibold">{f.form}</span>
                            <span className="text-stone-400">{f.title}</span>
                            <span className="text-[10px] text-stone-300 ml-auto">{f.due}</span>
                          </button>

                          {isExpanded && (
                            <IRSFormView
                              formCode={f.form}
                              meta={meta}
                              year={taxYear}
                              companyName={companyName ?? ""}
                              ein={ein ?? ""}
                              fields={fieldDefs}
                              values={fv}
                              editedFields={editedFields}
                              onFieldChange={(line, val) => handleFieldChange(f.form, line, val)}
                              onGenerate={() => generateForm(f.form)}
                              isGenerating={isGeneratingThis || running}
                            />
                          )}
                        </div>
                      );
                    }

                    // No field defs — compact card
                    return (
                      <div key={f.form} className="bg-white border border-stone-200 rounded-xl px-5 py-3 flex items-center gap-3">
                        <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">{f.form}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-stone-700 truncate">{f.title}</p>
                          <p className="text-[10px] text-stone-400">{f.due} · {f.description}</p>
                        </div>
                        {f.irsUrl && (
                          <a href={f.irsUrl} target="_blank" rel="noopener noreferrer" className="text-stone-300 hover:text-blue-500">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Diagnostics — after pipeline run */}
            {result && result.diagnostics.length > 0 && (
              <BlurFade delay={0.05}>
                <div className="bg-white border border-stone-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Diagnostics</p>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      {blocking.length > 0 && <span className="text-red-400">{blocking.length} blocking</span>}
                      {warnings.length > 0 && <span className="text-amber-500">{warnings.length} warning{warnings.length > 1 ? "s" : ""}</span>}
                      {infos.length > 0 && <span className="text-stone-400">{infos.length} info</span>}
                    </div>
                  </div>
                  <AnimatedList delay={350}>
                    {result.diagnostics.map((d, i) => {
                      const cfg =
                        d.severity === "blocking_error"
                          ? { bg: "bg-red-50 border-red-100", icon: <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />, title: "text-red-700", msg: "text-red-500" }
                          : d.severity === "warning"
                          ? { bg: "bg-amber-50 border-amber-100", icon: <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />, title: "text-amber-700", msg: "text-amber-500" }
                          : { bg: "bg-stone-50 border-stone-100", icon: <Info size={13} className="text-stone-400 shrink-0 mt-0.5" />, title: "text-stone-600", msg: "text-stone-400" };
                      return (
                        <div key={i} className={`flex gap-3 p-3 rounded-lg border ${cfg.bg}`}>
                          {cfg.icon}
                          <div>
                            <p className={`text-xs font-semibold ${cfg.title}`}>
                              {d.title} <span className="font-normal opacity-50">[{d.code}]</span>
                            </p>
                            <p className={`text-xs mt-0.5 ${cfg.msg}`}>{d.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </AnimatedList>
                </div>
              </BlurFade>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
