import type { UnifiedFormSchema } from "../schemas/types";
import type { XmlFormDocument, XmlFieldValue } from "./XmlDocument";
import { recomputeFields } from "./XmlComputeEngine";

export interface BuildContext {
  facts: Record<string, unknown>;
  meta: {
    companyName?: string;
    ein?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    taxYear: number;
    entityType?: string;
  };
}

/**
 * Build an XmlFormDocument from pipeline facts using a unified schema.
 * If existingOverrides are provided, user-edited fields are preserved.
 */
export function buildXmlDocument(
  schema: UnifiedFormSchema,
  ctx: BuildContext,
  existingOverrides?: Record<string, XmlFieldValue>
): XmlFormDocument {
  const now = new Date().toISOString();
  const fields: Record<string, XmlFieldValue> = {};

  // First pass: populate from facts, meta, and static values
  for (const def of schema.fields) {
    // Check if user has an override for this field
    if (existingOverrides?.[def.fieldId]?.source === "user_edit") {
      fields[def.fieldId] = existingOverrides[def.fieldId];
      continue;
    }

    let value: string | number | boolean | null = null;

    if (def.metaSource) {
      // Meta-sourced field (company name, EIN, address, etc.)
      const metaVal = (ctx.meta as Record<string, unknown>)[def.metaSource];
      value = metaVal != null ? String(metaVal) : null;
    } else if (def.staticValue !== undefined) {
      value = def.staticValue;
    } else if (def.factName) {
      const raw = ctx.facts[def.factName];
      if (raw !== undefined && raw !== null) {
        value = typeof raw === "number" ? raw : typeof raw === "boolean" ? raw : String(raw);
      }
    }
    // Skip computed fields in first pass — they'll be computed below

    if (def.fieldType !== "computed") {
      fields[def.fieldId] = {
        fieldId: def.fieldId,
        value,
        source: "pipeline",
        updatedAt: now,
      };
    }
  }

  // Second pass: compute all computed fields
  const withComputed = recomputeFields(schema, fields);

  return {
    formCode: schema.formCode,
    entityId: ctx.meta.entityType ?? "",
    taxYear: ctx.meta.taxYear,
    fields: withComputed,
    returnHeader: {
      ein: ctx.meta.ein ?? "",
      businessName: ctx.meta.companyName ?? "",
      address: {
        line1: ctx.meta.address ?? "",
        city: ctx.meta.city ?? "",
        state: ctx.meta.state ?? "",
        zip: ctx.meta.zip ?? "",
      },
      taxPeriodBegin: `${ctx.meta.taxYear}-01-01`,
      taxPeriodEnd: `${ctx.meta.taxYear}-12-31`,
    },
    version: 1,
    updatedAt: now,
  };
}
