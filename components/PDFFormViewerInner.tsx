"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, RefreshCw, Download, FileText } from "lucide-react";
import type { PDFFormViewerProps } from "./PDFFormViewer";

/**
 * Renders filled IRS PDFs using the browser's native PDF viewer (iframe).
 * This gives full AcroForm field editing — click any field, type, tab between fields.
 * Much better than react-pdf's read-only annotation layer.
 */
export default function PDFFormViewerInner({
  pdfBytes,
  formCode,
  pdfFileName,
  onGenerate,
  isGenerating,
  onDownload,
  filledCount,
  totalMapped,
}: PDFFormViewerProps) {
  const [blankUrl, setBlankUrl] = useState<string | null>(null);

  // Build blob URL for the blank PDF template (preview before auto-fill)
  useEffect(() => {
    if (!pdfFileName) return;
    let cancelled = false;
    let url: string | null = null;
    fetch(`/forms/2025/${pdfFileName}`)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => {
        if (cancelled || !buf) return;
        const blob = new Blob([buf], { type: "application/pdf" });
        url = URL.createObjectURL(blob);
        setBlankUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [pdfFileName]);

  // Build blob URL for the filled PDF
  const filledUrl = useMemo(() => {
    if (!pdfBytes) return null;
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  }, [pdfBytes]);

  // Clean up filled URL
  useEffect(() => {
    return () => { if (filledUrl) URL.revokeObjectURL(filledUrl); };
  }, [filledUrl]);

  const activeUrl = filledUrl ?? blankUrl;
  const hasFillStats = typeof filledCount === "number" && typeof totalMapped === "number";

  return (
    <div className="flex flex-col h-full bg-stone-50">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText size={15} className="text-stone-400 shrink-0" />
            <span className="text-sm font-semibold text-stone-800 truncate">
              Form {formCode}
            </span>
            {hasFillStats && (
              <span className="ml-1 text-xs text-stone-500 whitespace-nowrap">
                — <span className="font-medium text-stone-700">{filledCount}</span>
                <span className="text-stone-400">/{totalMapped}</span> fields filled
              </span>
            )}
            {pdfBytes && (
              <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                Auto-filled from QBO
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onGenerate} disabled={isGenerating}
              className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
              {isGenerating
                ? <><RefreshCw size={12} className="animate-spin" /> Re-filling…</>
                : <><Play size={12} /> Re-fill</>}
            </button>
            {pdfBytes && (
              <button onClick={onDownload}
                className="flex items-center gap-1.5 border border-stone-300 hover:border-stone-400 hover:bg-stone-100 text-stone-700 text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
                <Download size={12} /> Download
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Native PDF viewer (full field editing support) ────────── */}
      <div className="flex-1">
        {activeUrl ? (
          <iframe
            src={`${activeUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={`Form ${formCode}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-stone-400 select-none">
            <RefreshCw size={24} className="animate-spin text-stone-300" />
            <p className="text-sm text-stone-500">Loading form…</p>
          </div>
        )}
      </div>
    </div>
  );
}
