"use client";
import type { UnifiedFieldDef, FormSection as SectionDef } from "@/src/schemas/types";
import type { XmlFieldValue } from "@/src/xml/XmlDocument";
import FormField from "./FormField";

interface FormSectionProps {
  section: SectionDef;
  fields: UnifiedFieldDef[];
  values: Record<string, XmlFieldValue>;
  onFieldChange: (fieldId: string, value: string | number) => void;
  editedFields: Set<string>;
}

export default function FormSection({ section, fields, values, onFieldChange, editedFields }: FormSectionProps) {
  if (fields.length === 0) return null;

  return (
    <div className="mb-2">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#e8e7e1] border-y border-[#e0ddcf]">
        {section.sideLabel && (
          <div className="w-6 shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-wider text-[#78737a] writing-vertical-rl" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              {section.sideLabel}
            </span>
          </div>
        )}
        <span className="text-xs font-bold uppercase tracking-wider text-[#474448]">{section.title}</span>
      </div>

      {/* Fields */}
      <div className="divide-y divide-[#e8e7e1]">
        {fields.map((def) => (
          <FormField
            key={def.fieldId}
            def={def}
            value={values[def.fieldId]}
            onChange={onFieldChange}
            isEdited={editedFields.has(def.fieldId)}
          />
        ))}
      </div>
    </div>
  );
}
