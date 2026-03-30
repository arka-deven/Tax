import type { UnifiedFormSchema } from "./types";
import { F1120_SCHEMA } from "./forms/f1120";

/**
 * Central registry of all unified form schemas.
 * Keyed by form code (same keys as FORMS_BY_ENTITY in page.tsx).
 */
export const UNIFIED_SCHEMAS: Record<string, UnifiedFormSchema> = {
  "1120": F1120_SCHEMA,
  // Phase 4: Add remaining form schemas here
  // "1120-S": F1120S_SCHEMA,
  // "1065": F1065_SCHEMA,
  // "Sch C": F1040SC_SCHEMA,
  // "990": F990_SCHEMA,
};
