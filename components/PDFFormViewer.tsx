"use client";

import dynamic from "next/dynamic";

export interface PDFFormViewerProps {
  pdfBytes: Uint8Array | null;
  formCode: string;
  pdfFileName?: string;
  onGenerate: () => void;
  isGenerating: boolean;
  onDownload: () => void;
  filledCount?: number;
  totalMapped?: number;
  // mappedFields / onFieldEdit removed — users edit directly in the PDF form fields
}

const PDFFormViewer = dynamic(() => import("./PDFFormViewerInner"), { ssr: false });
export default PDFFormViewer;
