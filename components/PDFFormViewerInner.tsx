"use client";

import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Play,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import type { PDFFormViewerProps } from "./PDFFormViewer";

// ── pdf.js worker — v4 uses .min.mjs, loaded via CDN for webpack compat ──────
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const PAGE_WIDTH = 800;

export default function PDFFormViewerInner({
  pdfBytes,
  formCode,
  onGenerate,
  isGenerating,
  onDownload,
  filledCount,
  totalMapped,
}: PDFFormViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Create { data: Uint8Array } for react-pdf — avoids blob URL issues
  const fileData = useMemo(() => {
    if (!pdfBytes) return null;
    return { data: new Uint8Array(pdfBytes) };
  }, [pdfBytes]);

  useEffect(() => {
    setCurrentPage(1);
    setNumPages(null);
  }, [fileData]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const hasFillStats =
    typeof filledCount === "number" && typeof totalMapped === "number";

  return (
    <div className="flex flex-col h-full bg-stone-50">

      {/* ── Sticky toolbar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-2.5">

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText size={15} className="text-stone-400 shrink-0" />
            <span className="text-sm font-semibold text-stone-800 truncate">
              {formCode ? `Form ${formCode}` : "PDF Preview"}
            </span>
            {hasFillStats && (
              <span className="ml-1 text-xs text-stone-500 whitespace-nowrap">
                —&nbsp;
                <span className="font-medium text-stone-700">{filledCount}</span>
                <span className="text-stone-400">/{totalMapped}</span>
                &nbsp;fields filled
              </span>
            )}
          </div>

          {fileData && numPages !== null && (
            <div className="flex items-center gap-1 text-sm text-stone-600">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="p-1 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-14 text-center text-xs tabular-nums">
                {currentPage}&nbsp;/&nbsp;{numPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                aria-label="Next page"
                className="p-1 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Play size={12} />
                  Generate
                </>
              )}
            </button>

            {fileData && (
              <button
                onClick={onDownload}
                className="flex items-center gap-1.5 border border-stone-300 hover:border-stone-400 hover:bg-stone-100 text-stone-700 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                <Download size={12} />
                Download
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── PDF canvas area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!fileData ? (
          <div className="flex flex-col items-center justify-center min-h-120 gap-4 text-stone-400 select-none">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center">
              <FileText size={32} className="text-stone-300" />
            </div>
            <p className="text-sm text-center leading-relaxed max-w-xs text-stone-500">
              Click&nbsp;
              <span className="font-semibold text-stone-700">Generate</span>
              &nbsp;to fill this form from QuickBooks data
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 gap-4">
            <Document
              file={fileData}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center py-24 text-stone-400 text-sm gap-2">
                  <RefreshCw size={15} className="animate-spin" />
                  Loading PDF…
                </div>
              }
              error={
                <div className="flex items-center justify-center py-24 text-red-500 text-sm gap-2">
                  <FileText size={15} />
                  Failed to load PDF.
                </div>
              }
            >
              {numPages !== null &&
                Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                  <div
                    key={page}
                    id={`pdf-page-${page}`}
                    className="shadow-md rounded-sm overflow-hidden mb-2"
                    style={{ width: PAGE_WIDTH }}
                  >
                    <Page
                      pageNumber={page}
                      width={PAGE_WIDTH}
                      renderAnnotationLayer
                      renderTextLayer
                    />
                  </div>
                ))}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
