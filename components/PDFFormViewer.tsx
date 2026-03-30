"use client";

import dynamic from "next/dynamic";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PDFFormViewerProps {
  pdfBytes: Uint8Array | null;
  formCode: string;
  onGenerate: () => void;
  isGenerating: boolean;
  onDownload: () => void;
  filledCount?: number;
  totalMapped?: number;
}

// ── Dynamic wrapper (ssr: false — pdf.js requires browser APIs) ───────────────

const PDFFormViewer = dynamic(
  () => import("./PDFFormViewerInner"),
  { ssr: false }
);

export default PDFFormViewer;
