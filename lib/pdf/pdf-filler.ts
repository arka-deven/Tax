import { PDFDocument } from "pdf-lib";
import type { FormPdfMapping, FillContext, FilledPdfResult } from "./types";

/**
 * Formats a numeric value as a currency string (no $ sign, with commas).
 */
function fmtCurrency(val: number): string {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtInteger(val: number): string {
  return Math.round(val).toLocaleString("en-US");
}

function fmtPercent(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

function resolveValue(
  mapping: FormPdfMapping["fields"][number],
  ctx: FillContext
): string | undefined {
  // Static value takes priority
  if (mapping.staticValue !== undefined) return mapping.staticValue;

  // Computed value
  if (mapping.compute) return mapping.compute(ctx);

  // Fact-based value
  if (!mapping.factName) return undefined;
  const raw = ctx.facts[mapping.factName];
  if (raw === undefined || raw === null) return undefined;

  const format = mapping.format ?? "string";
  if (format === "currency" && typeof raw === "number") return fmtCurrency(raw);
  if (format === "integer" && typeof raw === "number") return fmtInteger(raw);
  if (format === "percent" && typeof raw === "number") return fmtPercent(raw);
  if (format === "boolean") return raw ? "Yes" : "Off";

  return String(raw);
}

/**
 * Loads a blank IRS PDF, fills mapped AcroForm fields from tax facts, and
 * returns the filled PDF bytes.
 *
 * @param mapping  - The form-specific field mapping
 * @param ctx      - Tax facts + company metadata
 * @param options  - flatten: true removes editability (default false)
 */
export async function fillPdf(
  mapping: FormPdfMapping,
  ctx: FillContext,
  options: { flatten?: boolean; pdfBytes?: Uint8Array } = {}
): Promise<FilledPdfResult> {
  // Load the blank PDF — either from provided bytes or fetch from /public/
  let pdfDoc: PDFDocument;
  if (options.pdfBytes) {
    pdfDoc = await PDFDocument.load(options.pdfBytes, { ignoreEncryption: true });
  } else {
    const url = `/forms/${ctx.meta.taxYear}/${mapping.pdfFileName}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch PDF: ${url} (${resp.status})`);
    const bytes = await resp.arrayBuffer();
    pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  }

  const form = pdfDoc.getForm();
  let filledCount = 0;
  const unfilledFields: string[] = [];

  for (const fieldMapping of mapping.fields) {
    const value = resolveValue(fieldMapping, ctx);
    if (value === undefined || value === "") {
      unfilledFields.push(fieldMapping.pdfFieldName);
      continue;
    }

    try {
      // Try as text field first
      const textField = form.getTextField(fieldMapping.pdfFieldName);
      textField.setText(value);
      filledCount++;
    } catch {
      try {
        // Try as checkbox
        const checkbox = form.getCheckBox(fieldMapping.pdfFieldName);
        if (value === "Yes" || value === "true" || value === "X") {
          checkbox.check();
        } else {
          checkbox.uncheck();
        }
        filledCount++;
      } catch {
        try {
          // Try as dropdown
          const dropdown = form.getDropdown(fieldMapping.pdfFieldName);
          dropdown.select(value);
          filledCount++;
        } catch {
          // Field not found or incompatible type — skip
          unfilledFields.push(fieldMapping.pdfFieldName);
        }
      }
    }
  }

  if (options.flatten) {
    form.flatten();
  }

  const pdfBytes = await pdfDoc.save();

  return {
    pdfBytes: new Uint8Array(pdfBytes),
    filledCount,
    totalMapped: mapping.fields.length,
    unfilledFields,
  };
}
