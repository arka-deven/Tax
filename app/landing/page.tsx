import { FileText, ArrowRight, Shield, Zap, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Tax — Automated Tax Preparation from QuickBooks",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#f5ebe0" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#3d3229] flex items-center justify-center">
            <FileText size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-[#3d3229] tracking-tight">Tax</span>
        </div>
        <Link href="/"
          className="flex items-center gap-2 text-sm font-medium text-[#3d3229] hover:text-[#5a4a3f] transition-colors">
          Open Dashboard <ArrowRight size={14} />
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-20 pb-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#a89f97] mb-4">Automated Tax Preparation</p>
        <h1 className="text-4xl md:text-5xl font-bold text-[#3d3229] leading-tight tracking-tight">
          From your books<br />to filed returns.
        </h1>
        <p className="text-lg text-[#6b5e52] mt-6 max-w-xl mx-auto leading-relaxed">
          Connect QuickBooks Online. We read your chart of accounts, normalize every transaction,
          derive tax facts, and fill every IRS form — ready for your CPA to review and file.
        </p>
        <Link href="/"
          className="inline-flex items-center gap-2 mt-10 bg-[#3d3229] hover:bg-[#5a4a3f] text-white text-sm font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-sm">
          Get Started <ArrowRight size={15} />
        </Link>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Zap size={20} />,
              title: "Connect",
              text: "Link your QuickBooks Online account. We read your data in read-only mode — never modify your books.",
            },
            {
              icon: <BookOpen size={20} />,
              title: "Prepare",
              text: "Every transaction is normalized, mapped to IRS tax codes, and computed into form-ready values. All 29 forms covered.",
            },
            {
              icon: <Shield size={20} />,
              title: "Review & File",
              text: "Your CPA reviews the filled forms, makes adjustments directly, and exports MeF XML for IRS e-filing.",
            },
          ].map((step, i) => (
            <div key={i} className="bg-[#edede9] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-[#3d3229] text-white flex items-center justify-center mb-4">
                {step.icon}
              </div>
              <h3 className="font-bold text-[#3d3229] text-sm mb-2">{step.title}</h3>
              <p className="text-sm text-[#6b5e52] leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What's covered */}
      <section className="max-w-3xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-bold text-[#3d3229] text-center mb-8">Every entity type. Every form.</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            "C-Corporation · 1120",
            "S-Corporation · 1120-S",
            "Partnership · 1065",
            "Sole Proprietor · Sch C",
            "Single-Member LLC · Sch C",
            "Nonprofit · 990",
            "Schedule L · Balance Sheet",
            "Schedule M-1 · Reconciliation",
            "Form 4562 · Depreciation",
            "Form 1125-A · COGS",
            "Schedule D · Capital Gains",
            "Schedule SE · Self-Employment",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-[#5a4a3f]">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CPA workflow */}
      <section className="max-w-3xl mx-auto px-8 py-16">
        <div className="bg-[#edede9] rounded-2xl p-8 md:p-10">
          <h2 className="text-xl font-bold text-[#3d3229] mb-4">Built for CPAs.</h2>
          <div className="space-y-3 text-sm text-[#5a4a3f] leading-relaxed">
            <p>Every form field is editable. Computed totals update in real-time. Manual adjustments are preserved across pipeline re-runs.</p>
            <p>23 automated diagnostic checks flag anomalies — unreasonable officer compensation, charitable contribution limits, balance sheet imbalances, unmapped accounts — before your CPA even opens the return.</p>
            <p>The same XML document your CPA reviews is the one submitted to IRS MeF. No format conversion. No data loss.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-8 py-8 flex items-center justify-between border-t" style={{ borderColor: "#d6ccc2" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#3d3229] flex items-center justify-center">
            <FileText size={12} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-[#8a7e74]">Tax</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-[#a89f97]">
          <Link href="/legal/privacy" className="hover:text-[#6b5e52] transition-colors">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-[#6b5e52] transition-colors">Terms</Link>
          <Link href="/legal/eula" className="hover:text-[#6b5e52] transition-colors">EULA</Link>
        </div>
      </footer>
    </div>
  );
}
