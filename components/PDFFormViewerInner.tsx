"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, RefreshCw, Download, FileText } from "lucide-react";
import type { PDFFormViewerProps } from "./PDFFormViewer";

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
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [pdfFileName]);

  const filledUrl = useMemo(() => {
    if (!pdfBytes) return null;
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  }, [pdfBytes]);

  useEffect(() => {
    return () => { if (filledUrl) URL.revokeObjectURL(filledUrl); };
  }, [filledUrl]);

  const activeUrl = filledUrl ?? blankUrl;
  const hasFillStats = typeof filledCount === "number" && typeof totalMapped === "number";

  return (
    <div className="flex flex-col h-full bg-(--parchment)">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-(--bone) border-b border-(--bone)">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText size={15} className="text-[#b5b2b4] shrink-0" />
            <span className="text-sm font-semibold text-[#2d232e] truncate">
              Form {formCode}
            </span>
            {hasFillStats && (
              <span className="ml-1 text-xs text-[#78737a] whitespace-nowrap">
                — <span className="font-medium text-[#474448]">{filledCount}</span>
                <span className="text-[#9a959c]">/{totalMapped}</span> fields filled
              </span>
            )}
            {pdfBytes && (
              <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                Auto-filled from QBO
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onGenerate} disabled={isGenerating}
              className="flex items-center gap-1.5 bg-[#2d232e] hover:bg-[#474448] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              {isGenerating
                ? <><RefreshCw size={12} className="animate-spin" /> Re-filling…</>
                : <><Play size={12} /> Re-fill</>}
            </button>
            {pdfBytes && (
              <button onClick={onDownload}
                className="flex items-center gap-1.5 border border-(--bone) hover:border-(--taupe-grey) hover:bg-(--parchment) text-[#474448] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                <Download size={12} /> Download
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Native PDF viewer */}
      <div className="flex-1">
        {activeUrl ? (
          <iframe
            src={`${activeUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={`Form ${formCode}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-[#9a959c] select-none">
            <RefreshCw size={24} className="animate-spin text-[#e0ddcf]" />
            <p className="text-sm text-[#78737a]">Loading form…</p>
          </div>
        )}
      </div>
    </div>
  );
}
