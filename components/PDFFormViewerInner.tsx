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
      <div className="sticky top-0 z-10 bg-(--linen) border-b border-(--dust-grey)">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText size={15} className="text-(--almond-silk) shrink-0" />
            <span className="text-sm font-semibold text-[#3d3229] truncate">
              Form {formCode}
            </span>
            {hasFillStats && (
              <span className="ml-1 text-xs text-[#8a7e74] whitespace-nowrap">
                — <span className="font-medium text-[#5a4a3f]">{filledCount}</span>
                <span className="text-[#a89f97]">/{totalMapped}</span> fields filled
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
              className="flex items-center gap-1.5 bg-[#3d3229] hover:bg-[#5a4a3f] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
              {isGenerating
                ? <><RefreshCw size={12} className="animate-spin" /> Re-filling…</>
                : <><Play size={12} /> Re-fill</>}
            </button>
            {pdfBytes && (
              <button onClick={onDownload}
                className="flex items-center gap-1.5 border border-(--dust-grey) hover:border-(--almond-silk) hover:bg-(--parchment) text-[#5a4a3f] text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
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
          <div className="flex flex-col items-center justify-center h-full gap-4 text-[#a89f97] select-none">
            <RefreshCw size={24} className="animate-spin text-(--dust-grey)" />
            <p className="text-sm text-[#8a7e74]">Loading form…</p>
          </div>
        )}
      </div>
    </div>
  );
}
