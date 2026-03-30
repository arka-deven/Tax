"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Play,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  Plug,
  LogOut,
} from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { AnimatedList } from "@/components/magicui/animated-list";
import { NumberTicker } from "@/components/magicui/number-ticker";

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

// ── Entity type options ───────────────────────────────────────────────────────

const ENTITY_OPTIONS: { value: EntityType; label: string; sub: string }[] = [
  { value: "c_corp",         label: "C-Corporation",            sub: "Form 1120" },
  { value: "s_corp",         label: "S-Corporation",            sub: "Form 1120-S" },
  { value: "llc_partnership",label: "LLC (Multi-Member)",       sub: "Form 1065" },
  { value: "llc_single",     label: "LLC (Single-Member)",      sub: "Schedule C" },
  { value: "sole_prop",      label: "Sole Proprietor",          sub: "Schedule C" },
  { value: "nonprofit",      label: "Nonprofit 501(c)(3)",      sub: "Form 990" },
];

// ── Component ─────────────────────────────────────────────────────────────────

type Step = "connect" | "entity_select" | "dashboard";

export default function Home() {
  const [step, setStep] = useState<Step>("connect");
  const [entityId] = useState("entity_1"); // single-entity for now
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [taxYear, setTaxYear] = useState(2024);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [running, setRunning] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Listen for popup postMessage
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "QBO_AUTH_SUCCESS") {
        setCompanyName(event.data.companyName ?? "Your Company");
        setStep("entity_select");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function connectQBO() {
    const url = `/api/auth/qbo?entityId=${entityId}`;
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      url,
      "qbo-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );
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
      setDisconnecting(false);
    }
  }

  function confirmEntityType(type: EntityType) {
    setEntityType(type);
    setStep("dashboard");
  }

  async function runPipeline() {
    if (!entityType) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/pipeline/${entityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxYear, entityType }),
      });
      if (res.ok) {
        setResult(await res.json() as PipelineResult);
        return;
      }
    } catch {
      // fallthrough to demo
    } finally {
      setRunning(false);
    }
  }

  const blocking = result?.diagnostics.filter((d) => d.severity === "blocking_error") ?? [];
  const warnings  = result?.diagnostics.filter((d) => d.severity === "warning") ?? [];
  const infos     = result?.diagnostics.filter((d) => d.severity === "info") ?? [];
  const entityLabel = ENTITY_OPTIONS.find((o) => o.value === entityType)?.label ?? "";

  // ── Step: Connect ─────────────────────────────────────────────────────────
  if (step === "connect") {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <BlurFade delay={0}>
          <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
              <FileText size={22} className="text-stone-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-900 tracking-tight">TaxEngine</h1>
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

  // ── Step: Entity type select ──────────────────────────────────────────────
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
                This determines which tax forms apply.
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

  // ── Step: Dashboard ───────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-stone-100 bg-stone-50">
        <div className="px-5 py-5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-stone-400" />
            <span className="font-semibold text-stone-800 tracking-tight text-sm">TaxEngine</span>
          </div>
          <p className="text-stone-400 text-[10px] mt-0.5">Internal · {taxYear}</p>
        </div>

        <div className="flex-1 px-3 py-3 space-y-1">
          <p className="text-stone-400 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">Company</p>
          <div className="px-3 py-2 rounded-lg bg-white border border-stone-100 shadow-xs">
            <p className="text-xs font-medium text-stone-800 truncate">{companyName ?? "My Company"}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">{entityLabel}</p>
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
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-semibold text-stone-900">{companyName ?? "My Company"}</h1>
              <span className="text-xs border border-stone-200 text-stone-500 px-2 py-0.5 rounded-full bg-stone-50">
                {entityLabel}
              </span>
            </div>
          </div>
          <select
            className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 bg-white"
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
          >
            {[2024, 2023, 2022].map((y) => <option key={y}>{y}</option>)}
          </select>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-7">
          <div className="max-w-2xl space-y-4">

            {/* Status */}
            <BlurFade delay={0}>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">
                    QuickBooks Online
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-sm font-medium text-stone-700">Connected</span>
                  </div>
                </div>
                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">
                    Pipeline Status
                  </p>
                  {result ? (
                    <>
                      <div className="flex items-center gap-2">
                        {blocking.length === 0
                          ? <CheckCircle2 size={15} className="text-emerald-500" />
                          : <XCircle size={15} className="text-red-400" />}
                        <span className={`text-sm font-medium ${blocking.length === 0 ? "text-stone-700" : "text-red-500"}`}>
                          {blocking.length === 0 ? "Ready for review" : `${blocking.length} blocking`}
                        </span>
                      </div>
                      <p className="text-stone-300 text-xs mt-1">
                        {new Date(result.ranAt).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-stone-400 text-sm">Not yet run</p>
                  )}
                </div>
              </div>
            </BlurFade>

            {/* Run pipeline */}
            <BlurFade delay={0.05}>
              <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Run Tax Pipeline</p>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Normalize → Trial Balance → Mapping → Facts → Rules → Diagnostics
                  </p>
                </div>
                <ShimmerButton
                  onClick={runPipeline}
                  disabled={running}
                  background="rgba(28, 25, 23, 1)"
                  shimmerColor="rgba(255,255,255,0.4)"
                  shimmerDuration="2.5s"
                  className="shrink-0 text-sm"
                >
                  {running
                    ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</>
                    : <><Play size={13} /> Run Pipeline</>}
                </ShimmerButton>
              </div>
            </BlurFade>

            {/* Required forms — only shown after pipeline runs */}
            {result && result.requiredForms.length > 0 && (
              <BlurFade delay={0.05}>
                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">
                    Required Forms
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.requiredForms.map((f) => (
                      <span key={f} className="text-xs border border-stone-200 text-stone-700 bg-stone-50 px-2.5 py-1 rounded-md font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                  {result.possibleForms.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold text-stone-300 uppercase tracking-widest mt-4 mb-2">
                        Possible
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.possibleForms.map((f) => (
                          <span key={f} className="text-xs border border-stone-100 text-stone-400 bg-white px-2.5 py-1 rounded-md">
                            {f}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </BlurFade>
            )}

            {/* Diagnostics */}
            {result && (
              <BlurFade delay={0.08}>
                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
                      Diagnostics
                    </p>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      {blocking.length > 0 && <span className="text-red-400">{blocking.length} blocking</span>}
                      {warnings.length > 0 && <span className="text-amber-500">{warnings.length} warning{warnings.length > 1 ? "s" : ""}</span>}
                      {infos.length > 0 && <span className="text-stone-400">{infos.length} info</span>}
                      {result.diagnostics.length === 0 && <span className="text-emerald-500">All clear</span>}
                    </div>
                  </div>
                  {result.diagnostics.length > 0 ? (
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
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 size={15} />
                      <span className="text-sm">No issues found</span>
                    </div>
                  )}
                </div>
              </BlurFade>
            )}

            {/* Tax facts */}
            {result && Object.keys(result.facts).length > 0 && (
              <BlurFade delay={0.1}>
                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">
                    Key Tax Facts
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(result.facts).map(([k, v]) => (
                      <div key={k} className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                        <p className="text-[10px] text-stone-400 capitalize">{k.replace(/_/g, " ")}</p>
                        <p className="text-stone-800 font-semibold text-base mt-0.5">
                          {typeof v === "number"
                            ? <><span>$</span><NumberTicker value={v} className="text-stone-800 font-semibold text-base" /></>
                            : typeof v === "boolean"
                            ? <span className={v ? "text-emerald-600" : "text-stone-400"}>{v ? "Yes" : "No"}</span>
                            : String(v)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </BlurFade>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
