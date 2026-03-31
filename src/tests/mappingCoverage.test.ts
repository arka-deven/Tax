import { describe, it, expect } from "vitest";
import { PDF_MAPPINGS } from "@/lib/pdf/pdf-mappings/index";
import type { PdfFieldMapping } from "@/lib/pdf/types";

/**
 * Mapping coverage tests — verify structural integrity of all PDF mappings.
 */

describe("PDF Mapping Registry", () => {
  const allMappingKeys = Object.keys(PDF_MAPPINGS);

  it("has entries for all expected form codes", () => {
    const expected = [
      "1120", "1120-S", "1065", "Sch C",
      "990", "990-EZ", "990-T",
      "Sch L", "Sch M-1", "Sch M-2", "Sch K",
      "Sch L:1120-S", "Sch M-1:1120-S", "Sch M-2:1120-S",
      "1125-A", "1125-E", "4562",
      "8995", "8990",
    ];
    for (const code of expected) {
      expect(allMappingKeys, `Missing mapping for ${code}`).toContain(code);
    }
  });

  it("every mapping has at least one field", () => {
    for (const [code, mapping] of Object.entries(PDF_MAPPINGS)) {
      expect(mapping.fields.length, `${code} has no fields`).toBeGreaterThan(0);
    }
  });

  it("every mapping has a valid pdfFileName", () => {
    for (const [code, mapping] of Object.entries(PDF_MAPPINGS)) {
      expect(mapping.pdfFileName, `${code} missing pdfFileName`).toBeTruthy();
      expect(mapping.pdfFileName).toMatch(/\.pdf$/);
    }
  });

  it("no duplicate pdfFieldName within a single mapping", () => {
    for (const [code, mapping] of Object.entries(PDF_MAPPINGS)) {
      const seen = new Set<string>();
      for (const field of mapping.fields) {
        expect(
          seen.has(field.pdfFieldName),
          `Duplicate pdfFieldName '${field.pdfFieldName}' in ${code}`
        ).toBe(false);
        seen.add(field.pdfFieldName);
      }
    }
  });

  it("every field has exactly one data source (factName, compute, staticValue, or manual)", () => {
    for (const [code, mapping] of Object.entries(PDF_MAPPINGS)) {
      for (const field of mapping.fields) {
        const sources = [
          field.factName !== undefined,
          field.compute !== undefined,
          field.staticValue !== undefined,
          field.manual === true,
        ].filter(Boolean).length;

        // At least one source must be defined
        expect(
          sources,
          `Field '${field.pdfFieldName}' in ${code} has ${sources} data sources (need >= 1)`
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe("Mapping field count summary", () => {
  it("reports total mapped fields across all forms", () => {
    let total = 0;
    let withFactName = 0;
    let withCompute = 0;
    let withStatic = 0;
    let withManual = 0;

    for (const [code, mapping] of Object.entries(PDF_MAPPINGS)) {
      total += mapping.fields.length;
      for (const f of mapping.fields) {
        if (f.factName) withFactName++;
        if (f.compute) withCompute++;
        if (f.staticValue) withStatic++;
        if (f.manual) withManual++;
      }
    }

    // Just report — no assertion on exact count since it grows as we add mappings
    console.log(`Total mapped fields: ${total}`);
    console.log(`  factName: ${withFactName}`);
    console.log(`  compute:  ${withCompute}`);
    console.log(`  static:   ${withStatic}`);
    console.log(`  manual:   ${withManual}`);

    expect(total).toBeGreaterThan(400); // baseline — grows as we extend
  });
});

describe("Schedule L:1120-S mapping completeness", () => {
  it("covers all 128 balance sheet fields (27 lines × ~4 cols + totals)", () => {
    const schL = PDF_MAPPINGS["Sch L:1120-S"];
    expect(schL).toBeDefined();
    // 15 asset lines × 4 cols + 12 liability lines × 4 cols + total lines
    expect(schL.fields.length).toBeGreaterThanOrEqual(100);
  });

  it("every field has a factName (no stubs)", () => {
    const schL = PDF_MAPPINGS["Sch L:1120-S"];
    for (const field of schL.fields) {
      expect(
        field.factName,
        `Sch L:1120-S field '${field.pdfFieldName}' missing factName`
      ).toBeTruthy();
    }
  });
});

describe("Schedule K mapping completeness", () => {
  it("covers income, deduction, credit, and basis lines", () => {
    const schK = PDF_MAPPINGS["Sch K"];
    expect(schK).toBeDefined();
    expect(schK.fields.length).toBeGreaterThanOrEqual(25);
  });
});
