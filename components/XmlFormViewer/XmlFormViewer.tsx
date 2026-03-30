"use client";
import { useMemo } from "react";
import { FileText, RefreshCw, Download, Send } from "lucide-react";
import type { UnifiedFormSchema } from "@/src/schemas/types";
import type { XmlFormDocument } from "@/src/xml/XmlDocument";
import FormSection from "./FormSection";

interface XmlFormViewerProps {
  schema: UnifiedFormSchema;
  doc: XmlFormDocument | null;
  loading: boolean;
  onFieldChange: (fieldId: string, value: string | number) => void;
  onRegenerate: () => void;
  onDownloadXml: () => void;
  onDownloadPdf?: () => void;
  editedFields: Set<string>;
}

export default function XmlFormViewer({
  schema, doc, loading, onFieldChange, onRegenerate, onDownloadXml, onDownloadPdf, editedFields,
}: XmlFormViewerProps) {
  const values = doc?.fields ?? {};

  // Group fields by section
  const groupedSections = useMemo(() => {
    return schema.sections.map((sec) => ({
      section: sec,
      fields: schema.fields.filter((f) => f.section === sec.id),
    }));
  }, [schema]);

  const filledCount = Object.values(values).filter(v => v.value != null && v.value !== "" && v.value !== 0).length;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e5e5e5] shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3">
          <FileText size={16} className="text-[#a89f97]" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-[#3d3229]">{schema.formTitle}</span>
            <span className="text-xs text-[#a89f97] ml-2">{schema.formCode} · {schema.taxYear}</span>
            <span className="text-xs text-[#a89f97] ml-2">· {filledCount}/{schema.fields.length} fields</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onRegenerate} disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#d6ccc2] hover:bg-[#f5ebe0] text-[#5a4a3f] transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Filling…" : "Re-fill from QBO"}
            </button>
            {onDownloadPdf && (
              <button onClick={onDownloadPdf}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#d6ccc2] hover:bg-[#f5ebe0] text-[#5a4a3f] transition-colors">
                <Download size={12} /> PDF
              </button>
            )}
            <button onClick={onDownloadXml}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#3d3229] hover:bg-[#5a4a3f] text-white transition-colors">
              <Send size={12} /> E-File XML
            </button>
          </div>
        </div>
      </div>

      {/* ── IRS Form Header ──────────────────────────────── */}
      <div className="border-b border-[#d6ccc2] bg-white">
        <div className="flex items-center px-5 py-3">
          <div className="w-24 border-r border-[#d6ccc2] pr-3 shrink-0">
            <p className="text-[8px] text-[#a89f97]">Form</p>
            <p className="text-2xl font-extrabold text-[#3d3229]">{schema.formCode}</p>
            <p className="text-[7px] text-[#a89f97] leading-tight">Dept. of the Treasury<br/>Internal Revenue Service</p>
          </div>
          <div className="flex-1 px-4 text-center">
            <p className="text-sm font-bold text-[#3d3229]">{schema.formTitle}</p>
            <p className="text-[10px] text-[#8a7e74] mt-0.5">{schema.formSubtitle}</p>
          </div>
          <div className="w-20 border-l border-[#d6ccc2] pl-3 text-center shrink-0">
            <p className="text-[7px] text-[#a89f97]">OMB No. {schema.ombNumber}</p>
            <p className="text-2xl font-extrabold text-[#3d3229]">{String(schema.taxYear).slice(2)}</p>
          </div>
        </div>

        {/* Company info */}
        {doc && (
          <div className="flex border-t border-[#d6ccc2] text-xs">
            <div className="flex-1 px-3 py-2 border-r border-[#d6ccc2]">
              <span className="text-[8px] text-[#a89f97]">Name</span>
              <p className="font-bold text-[#3d3229]">{doc.returnHeader.businessName}</p>
            </div>
            <div className="w-48 px-3 py-2">
              <span className="text-[8px] text-[#a89f97]">EIN</span>
              <p className="font-mono text-[#3d3229]">{doc.returnHeader.ein}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Form Sections ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!doc ? (
          <div className="flex items-center justify-center h-full text-[#a89f97]">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            <span className="ml-2 text-sm">{loading ? "Loading form…" : "No data. Click Re-fill from QBO."}</span>
          </div>
        ) : (
          <div className="font-['Times_New_Roman',serif] text-[13px]">
            {groupedSections.map(({ section, fields }) => (
              <FormSection
                key={section.id}
                section={section}
                fields={fields}
                values={values}
                onFieldChange={onFieldChange}
                editedFields={editedFields}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
