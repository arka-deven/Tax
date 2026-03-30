// @deprecated — replaced by PDFFormViewer (native browser PDF viewer)
"use client";

import { RefreshCw, Play } from "lucide-react";
import type { FormFieldDef, FormMeta } from "@/lib/form-fields";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Section {
  heading: FormFieldDef;
  fields: FormFieldDef[];
}

interface IRSFormViewProps {
  meta: FormMeta;
  year: number;
  companyName: string;
  ein: string;
  fields: FormFieldDef[];
  values: Record<string, string>;
  editedFields: Set<string>;
  onFieldChange: (line: string, value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  formCode: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupIntoSections(fields: FormFieldDef[]): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const f of fields) {
    if (f.section) {
      current = { heading: f, fields: [] };
      sections.push(current);
    } else if (current) {
      current.fields.push(f);
    }
  }
  return sections;
}

function fmtCurrency(val: string | undefined): string {
  if (!val) return "";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function IRSFormView({
  meta,
  year,
  companyName,
  ein,
  fields,
  values,
  editedFields,
  onFieldChange,
  onGenerate,
  isGenerating,
  formCode,
}: IRSFormViewProps) {
  const sections = groupIntoSections(fields);
  const isSubLine = (line: string) => /^[a-z]$/.test(line.slice(-1)) && line.length > 1 && line[0] !== "_";

  return (
    <div className="bg-white border-2 border-black shadow-md font-['Times_New_Roman',_'Georgia',_serif] text-[11px] leading-tight">

      {/* ── Form Header ────────────────────────────────────────────── */}
      <div className="border-b-2 border-black">
        <div className="flex">
          {/* Left: form number */}
          <div className="w-[120px] border-r-2 border-black p-2 shrink-0">
            <p className="text-[8px] text-gray-700 font-sans">Form</p>
            <p className="text-[28px] font-extrabold leading-none tracking-tight font-sans">{meta.code}</p>
            <p className="text-[7px] text-gray-600 leading-tight mt-1 font-sans">
              Department of the Treasury<br />Internal Revenue Service
            </p>
          </div>

          {/* Center: title */}
          <div className="flex-1 p-2 flex flex-col justify-center items-center text-center">
            <p className="text-[15px] font-bold leading-tight">{meta.title}</p>
            <p className="text-[9px] text-gray-600 mt-1">{meta.subtitle}</p>
            <p className="text-[8px] text-blue-700 mt-0.5 font-sans">
              Go to www.irs.gov/Form{meta.code.replace("Sch ", "Schedule")} for instructions and the latest information.
            </p>
          </div>

          {/* Right: OMB + year */}
          <div className="w-[90px] border-l-2 border-black shrink-0 flex flex-col items-center justify-center p-2">
            <p className="text-[7px] text-gray-600 font-sans">OMB No. {meta.omb}</p>
            <p className="text-[32px] font-extrabold leading-none mt-1 font-sans">
              <span className="text-[18px] font-normal text-gray-400">20</span>{String(year).slice(2)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Company Info + Generate ────────────────────────────────── */}
      <div className="border-b-2 border-black">
        <div className="flex">
          <div className="flex-1">
            {/* Row 1: Name + EIN */}
            <div className="flex border-b border-black">
              <div className="flex-1 p-1.5 border-r border-black">
                <span className="text-[8px] text-gray-500 font-sans">Name</span>
                <p className="font-bold text-[12px] mt-0.5 truncate">{companyName || ""}</p>
              </div>
              <div className="w-[200px] p-1.5 shrink-0">
                <span className="text-[8px] text-gray-500 font-sans">B &nbsp;Employer identification number</span>
                <p className="font-mono text-[12px] mt-0.5 tracking-wider">{ein || ""}</p>
              </div>
            </div>

            {/* Row 2: Address */}
            <div className="flex border-b border-black">
              <div className="flex-1 p-1.5 border-r border-black">
                <span className="text-[8px] text-gray-500 font-sans">Number and street (or P.O. box)</span>
                <input className="w-full border-0 border-b border-dashed border-gray-300 bg-transparent text-[11px] outline-none py-0.5 font-sans" placeholder="" />
              </div>
              <div className="w-[200px] p-1.5 shrink-0">
                <span className="text-[8px] text-gray-500 font-sans">C &nbsp;Date incorporated</span>
                <input className="w-full border-0 border-b border-dashed border-gray-300 bg-transparent text-[11px] outline-none py-0.5 font-sans" placeholder="" />
              </div>
            </div>

            {/* Row 3: City, State, ZIP + Total assets */}
            <div className="flex">
              <div className="flex-1 p-1.5 border-r border-black flex gap-2">
                <div className="flex-1">
                  <span className="text-[8px] text-gray-500 font-sans">City or town</span>
                  <input className="w-full border-0 border-b border-dashed border-gray-300 bg-transparent text-[11px] outline-none py-0.5 font-sans" />
                </div>
                <div className="w-12">
                  <span className="text-[8px] text-gray-500 font-sans">State</span>
                  <input className="w-full border-0 border-b border-dashed border-gray-300 bg-transparent text-[11px] outline-none py-0.5 font-sans" />
                </div>
                <div className="w-20">
                  <span className="text-[8px] text-gray-500 font-sans">ZIP code</span>
                  <input className="w-full border-0 border-b border-dashed border-gray-300 bg-transparent text-[11px] outline-none py-0.5 font-sans" />
                </div>
              </div>
              <div className="w-[200px] p-1.5 shrink-0">
                <span className="text-[8px] text-gray-500 font-sans">D &nbsp;Total assets (see instructions)</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px]">$</span>
                  <input className="flex-1 border-0 border-b border-dashed border-gray-300 bg-transparent text-right font-mono text-[11px] outline-none py-0.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Generate bar ───────────────────────────────────────────── */}
      <div className="bg-gray-50 border-b-2 border-black px-3 py-1.5 flex items-center justify-between">
        <p className="text-[9px] text-gray-500 font-sans">
          Click Generate to auto-populate from QuickBooks data. All fields are editable.
        </p>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 bg-black hover:bg-gray-800 disabled:opacity-50 text-white text-[10px] font-semibold px-3 py-1 rounded font-sans transition-colors shrink-0"
        >
          {isGenerating
            ? <><RefreshCw size={10} className="animate-spin" /> Generating...</>
            : <><Play size={10} /> Generate</>}
        </button>
      </div>

      {/* ── Form Sections ──────────────────────────────────────────── */}
      {sections.map((sec, si) => {
        const hasSideLabel = !!sec.heading.sideLabel;

        return (
          <div key={si} className={si < sections.length - 1 ? "border-b-2 border-black" : ""}>
            <div className="flex">
              {/* Side label */}
              {hasSideLabel && (
                <div className="w-7 border-r-2 border-black bg-white flex items-center justify-center shrink-0 relative">
                  <span
                    className="absolute text-[8px] font-bold tracking-wider text-center leading-[1.1] font-sans"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      whiteSpace: "nowrap",
                      maxHeight: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sec.heading.sideLabel}
                  </span>
                </div>
              )}

              {/* Lines */}
              <div className="flex-1">
                {sec.fields.map((fd, fi) => {
                  const val = values[fd.line] ?? "";
                  const isEdited = editedFields.has(`${formCode}:${fd.line}`);
                  const isComputed = !!fd.compute;
                  const isSub = isSubLine(fd.line);
                  const lineNum = fd.line;
                  // Separate major number and sub-letter
                  const mainNum = isSub ? lineNum.replace(/[a-z]$/, "") : lineNum;
                  const subLetter = isSub ? lineNum.slice(-1) : null;
                  const isLast = fi === sec.fields.length - 1;

                  return (
                    <div
                      key={fd.line}
                      className={`flex items-center ${!isLast ? "border-b border-gray-300" : ""} ${fd.bold ? "bg-gray-50/70" : ""} ${isEdited ? "bg-amber-50/60" : ""}`}
                    >
                      {/* Line number */}
                      <div className="w-10 px-1.5 py-[5px] text-right shrink-0 border-r border-gray-300 self-stretch flex items-center justify-end">
                        {subLetter ? (
                          <span className="text-[10px] font-sans">
                            <span className="font-bold">{mainNum}</span>
                            <span className="font-normal">{subLetter}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold font-sans">{lineNum}</span>
                        )}
                      </div>

                      {/* Description with dot leader */}
                      <div className={`flex-1 px-2 py-[5px] flex items-center gap-1 min-w-0 ${fd.bold ? "font-bold" : ""}`}>
                        <span className="shrink-0">{fd.label}</span>
                        <span className="flex-1 border-b border-dotted border-gray-400 min-w-4" />
                      </div>

                      {/* Amount column */}
                      <div className="w-10 px-1 py-[5px] text-right shrink-0 border-l border-gray-300 self-stretch flex items-center justify-end">
                        <span className="text-[10px] font-bold font-sans text-gray-500">{lineNum}</span>
                      </div>

                      {/* Amount input */}
                      <div className="w-[130px] border-l-2 border-black shrink-0 self-stretch flex items-center">
                        {fd.type === "currency" ? (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={val ? fmtCurrency(val) : ""}
                            placeholder={isComputed && !isEdited ? "auto" : ""}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.\-]/g, "");
                              onFieldChange(fd.line, raw);
                            }}
                            className={`w-full h-full text-right font-mono text-[11px] px-2 outline-none transition-colors
                              ${isComputed && !isEdited
                                ? "bg-gray-50 text-gray-500"
                                : "bg-white text-black"
                              } ${fd.bold ? "font-bold" : ""}
                              focus:bg-blue-50`}
                          />
                        ) : fd.type === "text" ? (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => onFieldChange(fd.line, e.target.value)}
                            className="w-full h-full text-right text-[11px] px-2 outline-none bg-white focus:bg-blue-50"
                          />
                        ) : (
                          <span className="w-full text-right text-[11px] px-2 text-gray-400">{val || ""}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="border-t-2 border-black bg-gray-50 px-3 py-2">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <p className="text-[8px] font-bold font-sans uppercase tracking-wider text-gray-500">Sign Here</p>
            <div className="flex gap-4 mt-1">
              <div className="flex-1 border-b border-gray-400">
                <span className="text-[7px] text-gray-400 font-sans">Signature of officer</span>
              </div>
              <div className="w-20 border-b border-gray-400">
                <span className="text-[7px] text-gray-400 font-sans">Date</span>
              </div>
              <div className="w-24 border-b border-gray-400">
                <span className="text-[7px] text-gray-400 font-sans">Title</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-[7px] text-gray-400 font-sans mt-2">
          For Paperwork Reduction Act Notice, see separate instructions. &nbsp;&nbsp; Cat. No. 11450Q &nbsp;&nbsp; Form <b>{meta.code}</b> ({year})
        </p>
      </div>
    </div>
  );
}
