"use client";
import type { UnifiedFieldDef } from "@/src/schemas/types";
import type { XmlFieldValue } from "@/src/xml/XmlDocument";

interface FormFieldProps {
  def: UnifiedFieldDef;
  value: XmlFieldValue | undefined;
  onChange: (fieldId: string, value: string | number) => void;
  isEdited: boolean;
}

function formatDisplay(val: unknown, format: string): string {
  if (val === null || val === undefined || val === "") return "";
  if (format === "currency") {
    const n = typeof val === "number" ? val : parseFloat(String(val));
    if (isNaN(n)) return String(val);
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(val);
}

export default function FormField({ def, value, onChange, isEdited }: FormFieldProps) {
  const rawVal = value?.value ?? "";
  const isComputed = def.fieldType === "computed";
  const isStatic = def.fieldType === "static";
  const readonly = !def.editable || isComputed || isStatic;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 ${isEdited ? "bg-amber-50/40" : ""}`}>
      {/* Line number */}
      <div className="w-12 text-right shrink-0">
        <span className={`text-xs font-mono ${def.bold ? "font-bold text-[#2d232e]" : "text-[#78737a]"}`}>
          {def.irsLine}
        </span>
      </div>

      {/* Label with dot leader */}
      <div className={`flex-1 flex items-center gap-1 min-w-0 ${def.bold ? "font-semibold text-[#2d232e]" : "text-[#474448]"}`}>
        <span className="text-sm truncate">{def.label}</span>
        <span className="flex-1 border-b border-dotted border-[#e0ddcf] min-w-8" />
      </div>

      {/* Line number echo */}
      <div className="w-10 text-right shrink-0">
        <span className="text-[10px] font-mono text-[#9a959c]">{def.irsLine}</span>
      </div>

      {/* Value input */}
      <div className="w-40 shrink-0">
        {def.format === "boolean" || def.fieldType === "checkbox" ? (
          <input
            type="checkbox"
            checked={rawVal === true || rawVal === "X" || rawVal === "Yes"}
            onChange={(e) => onChange(def.fieldId, e.target.checked ? "X" : "")}
            disabled={readonly}
            className="w-4 h-4 accent-[#2d232e]"
          />
        ) : (
          <input
            type="text"
            value={formatDisplay(rawVal, def.format)}
            onChange={(e) => {
              if (readonly) return;
              const raw = def.format === "currency" || def.format === "integer"
                ? e.target.value.replace(/[^0-9.\-]/g, "")
                : e.target.value;
              onChange(def.fieldId, def.format === "currency" ? parseFloat(raw) || 0 : raw);
            }}
            readOnly={readonly}
            className={`w-full text-right text-sm font-mono px-2 py-1.5 rounded-lg border transition-colors outline-none
              ${readonly
                ? "bg-[#f5f4f0] text-[#78737a] border-transparent cursor-default"
                : "bg-white text-[#2d232e] border-[#e0ddcf] focus:border-[#534b52] focus:ring-1 focus:ring-[#534b52]/20"
              }
              ${isEdited ? "border-amber-300 bg-amber-50" : ""}
              ${def.bold ? "font-bold" : ""}
            `}
            placeholder={isComputed ? "auto" : ""}
          />
        )}
      </div>
    </div>
  );
}
