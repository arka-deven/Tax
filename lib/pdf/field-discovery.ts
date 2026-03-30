#!/usr/bin/env npx tsx
/**
 * CLI script to discover AcroForm field names in an IRS PDF.
 *
 * Usage:
 *   npx tsx lib/pdf/field-discovery.ts public/forms/2025/f1120.pdf
 *   npx tsx lib/pdf/field-discovery.ts --all
 */

import { readFileSync, readdirSync } from "fs";
import { PDFDocument } from "pdf-lib";
import { resolve, basename } from "path";

async function discoverFields(pdfPath: string) {
  const bytes = readFileSync(pdfPath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  const fields = form.getFields();

  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${basename(pdfPath)}  —  ${fields.length} AcroForm fields`);
  console.log(`${"=".repeat(70)}\n`);

  if (fields.length === 0) {
    console.log("  ⚠  No AcroForm fields found. This PDF may use XFA forms (not supported by pdf-lib).\n");
    return { path: pdfPath, fields: [] };
  }

  const results: { name: string; type: string; value: string }[] = [];

  for (const field of fields) {
    const name = field.getName();
    const type = field.constructor.name.replace("PDF", "").replace("Field", "");
    let value = "";
    try {
      if ("getText" in field && typeof (field as any).getText === "function") {
        value = (field as any).getText() ?? "";
      }
    } catch { /* ignore */ }

    results.push({ name, type, value });
    console.log(`  ${type.padEnd(12)} ${name}${value ? `  = "${value}"` : ""}`);
  }

  console.log(`\n  Total: ${results.length} fields\n`);

  // Output as TypeScript mapping stub
  console.log("// --- TypeScript mapping stub ---");
  console.log(`import type { FormPdfMapping } from "../types";\n`);
  console.log(`export const mapping: FormPdfMapping = {`);
  console.log(`  formCode: "${basename(pdfPath, ".pdf").toUpperCase()}",`);
  console.log(`  pdfFileName: "${basename(pdfPath)}",`);
  console.log(`  taxYear: 2025,`);
  console.log(`  fields: [`);
  for (const r of results) {
    console.log(`    { pdfFieldName: "${r.name}", /* ${r.type} */ },`);
  }
  console.log(`  ],`);
  console.log(`};\n`);

  return { path: pdfPath, fields: results };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    const dir = resolve("public/forms/2025");
    const files = readdirSync(dir).filter((f) => f.endsWith(".pdf")).sort();
    console.log(`Scanning ${files.length} PDFs in ${dir}...\n`);
    for (const file of files) {
      await discoverFields(resolve(dir, file));
    }
  } else if (args.length > 0) {
    await discoverFields(resolve(args[0]));
  } else {
    console.log("Usage:");
    console.log("  npx tsx lib/pdf/field-discovery.ts <path-to-pdf>");
    console.log("  npx tsx lib/pdf/field-discovery.ts --all");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
