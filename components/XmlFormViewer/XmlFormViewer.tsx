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
      <div className="sticky top-0 z-10 bg-white border-b border-[#e0ddcf] shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3">
          <FileText size={16} className="text-[#9a959c]" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-[#2d232e]">{schema.formTitle}</span>
            <span className="text-xs text-[#9a959c] ml-2">{schema.formCode} · {schema.taxYear}</span>
            <span className="text-xs text-[#9a959c] ml-2">· {filledCount}/{schema.fields.length} fields</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onRegenerate} disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e0ddcf] hover:bg-[#f1f0ea] text-[#474448] transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Filling…" : "Re-fill from QBO"}
            </button>
            {onDownloadPdf && (
              <button onClick={onDownloadPdf}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e0ddcf] hover:bg-[#f1f0ea] text-[#474448] transition-colors">
                <Download size={12} /> PDF
              </button>
            )}
            <button onClick={onDownloadXml}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#2d232e] hover:bg-[#474448] text-white transition-colors">
              <Send size={12} /> E-File XML
            </button>
          </div>
        </div>
      </div>

      {/* ── IRS Form Header ──────────────────────────────── */}
      <div className="border-b border-[#e0ddcf] bg-white">
        <div className="flex items-center px-5 py-3">
          <div className="w-24 border-r border-[#e0ddcf] pr-3 shrink-0">
            <p className="text-[8px] text-[#9a959c]">Form</p>
            <p className="text-2xl font-extrabold text-[#2d232e]">{schema.formCode}</p>
            <p className="text-[7px] text-[#9a959c] leading-tight">Dept. of the Treasury<br/>Internal Revenue Service</p>
          </div>
          <div className="flex-1 px-4 text-center">
            <p className="text-sm font-bold text-[#2d232e]">{schema.formTitle}</p>
            <p className="text-[10px] text-[#78737a] mt-0.5">{schema.formSubtitle}</p>
          </div>
          <div className="w-20 border-l border-[#e0ddcf] pl-3 text-center shrink-0">
            <p className="text-[7px] text-[#9a959c]">OMB No. {schema.ombNumber}</p>
            <p className="text-2xl font-extrabold text-[#2d232e]">{String(schema.taxYear).slice(2)}</p>
          </div>
        </div>

        {/* Company info */}
        {doc && (
          <div className="flex border-t border-[#e0ddcf] text-xs">
            <div className="flex-1 px-3 py-2 border-r border-[#e0ddcf]">
              <span className="text-[8px] text-[#9a959c]">Name</span>
              <p className="font-bold text-[#2d232e]">{doc.returnHeader.businessName}</p>
            </div>
            <div className="w-48 px-3 py-2">
              <span className="text-[8px] text-[#9a959c]">EIN</span>
              <p className="font-mono text-[#2d232e]">{doc.returnHeader.ein}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Form Sections ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!doc ? (
          <div className="flex items-center justify-center h-full text-[#9a959c]">
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
