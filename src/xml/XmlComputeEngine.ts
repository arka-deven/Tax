import type { UnifiedFormSchema, UnifiedFieldDef } from "../schemas/types";
import type { XmlFieldValue } from "./XmlDocument";

/**
 * Recompute all computed fields in the form based on current values.
 * Returns updated field values for computed fields only.
 */
export function recomputeFields(
  schema: UnifiedFormSchema,
  fields: Record<string, XmlFieldValue>
): Record<string, XmlFieldValue> {
  const updated = { ...fields };
  const now = new Date().toISOString();

  // Process fields in order (schemas are in display order, which is also dependency order)
  for (const def of schema.fields) {
    if (def.fieldType !== "computed" || !def.computeExpr) continue;

    const { op, operands } = def.computeExpr;
    const values = operands.map((id) => {
      const v = updated[id]?.value;
      return typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) || 0 : 0;
    });

    let result: number;
    if (op === "+") {
      result = values.reduce((a, b) => a + b, 0);
    } else {
      // "-" means first operand minus sum of rest
      result = values[0] - values.slice(1).reduce((a, b) => a + b, 0);
    }

    updated[def.fieldId] = {
      fieldId: def.fieldId,
      value: Math.round(result * 100) / 100,
      source: "computed",
      updatedAt: now,
    };
  }

  return updated;
}
