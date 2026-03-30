import type { FormPdfMapping } from "../types";

// Primary returns
import { F1120_MAPPING } from "./f1120";
import { F1120S_MAPPING } from "./f1120s";
import { F1065_MAPPING } from "./f1065";
import { F1040SC_MAPPING } from "./f1040sc";
import { F990_MAPPING } from "./f990";
import { F990EZ_MAPPING } from "./f990ez";
import { F990T_MAPPING } from "./f990t";

// Schedules (shared PDFs / embedded pages)
import { SCH_L_MAPPING } from "./schL";
import { SCH_M1_MAPPING } from "./schM1";
import { SCH_M2_MAPPING } from "./schM2";
import { SCH_K_MAPPING } from "./schK";
import { F1120SM3_MAPPING } from "./f1120sm3";
import { F990SA_MAPPING } from "./f990sa";
import { F990SB_MAPPING } from "./f990sb";
import { F1065SK1_MAPPING } from "./f1065sk1";
import { F1065SB1_MAPPING } from "./f1065sb1";
import { K2K3_MAPPING } from "./k2k3";

// Attachments
import { F1040SSE_MAPPING } from "./f1040sse";
import { F1125A_MAPPING } from "./f1125a";
import { F1125E_MAPPING } from "./f1125e";
import { F4562_MAPPING } from "./f4562";
import { F4797_MAPPING } from "./f4797";
import { F1120SD_MAPPING } from "./f1120sd";
import { F8995_MAPPING } from "./f8995";
import { F8990_MAPPING } from "./f8990";
import { F1118_MAPPING } from "./f1118";
import { F8825_MAPPING } from "./f8825";
import { F8829_MAPPING } from "./f8829";
import { F7203_MAPPING } from "./f7203";

/**
 * Maps form codes (as used in FORMS_BY_ENTITY) to their PDF mapping definitions.
 * Every form listed in FORMS_BY_ENTITY should have an entry here so the
 * PDF viewer is used instead of compact cards.
 *
 * NOTE: "990-N" is electronic-only (e-Postcard) — no PDF exists.
 */
export const PDF_MAPPINGS: Record<string, FormPdfMapping> = {
  // ── Primary returns ──────────────────────────────────────────────────────
  "1120":    F1120_MAPPING,
  "1120-S":  F1120S_MAPPING,
  "1065":    F1065_MAPPING,
  "Sch C":   F1040SC_MAPPING,
  "990":     F990_MAPPING,
  "990-EZ":  F990EZ_MAPPING,
  "990-T":   F990T_MAPPING,

  // ── Schedules ────────────────────────────────────────────────────────────
  "Sch L":   SCH_L_MAPPING,
  "Sch M-1": SCH_M1_MAPPING,
  "Sch M-2": SCH_M2_MAPPING,
  "Sch M-3": F1120SM3_MAPPING,
  "Sch K":   SCH_K_MAPPING,
  "Sch K-1": F1065SK1_MAPPING,
  "Sch A":   F990SA_MAPPING,
  "Sch B":   F990SB_MAPPING,
  "Sch B-1": F1065SB1_MAPPING,
  "Sch D":   F1120SD_MAPPING,
  "Sch SE":  F1040SSE_MAPPING,
  "K-2/K-3": K2K3_MAPPING,

  // ── Attachments ──────────────────────────────────────────────────────────
  "1125-A":  F1125A_MAPPING,
  "1125-E":  F1125E_MAPPING,
  "4562":    F4562_MAPPING,
  "4797":    F4797_MAPPING,
  "8995":    F8995_MAPPING,
  "8990":    F8990_MAPPING,
  "1118":    F1118_MAPPING,
  "8825":    F8825_MAPPING,
  "8829":    F8829_MAPPING,
  "7203":    F7203_MAPPING,
};
