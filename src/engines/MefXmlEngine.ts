import { MEF_SCHEMAS } from "../mef/schema-mappings";
import type { TaxFact } from "../models/index.js";

export interface MefGenerationResult {
  xml: string;
  formCode: string;
  returnTypeCd: string;
  validationErrors: string[];
  fieldCount: number;
  filledCount: number;
}

export interface MefContext {
  facts: Record<string, unknown>;
  meta: {
    companyName: string;
    ein: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    taxYear: number;
    entityType?: string;
    dateIncorporated?: string;
    naicsCode?: string;
    principalActivity?: string;
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function fmtAmount(val: unknown): string {
  if (typeof val === "number") return val.toFixed(2);
  if (typeof val === "string") {
    const n = parseFloat(val);
    return isNaN(n) ? "0.00" : n.toFixed(2);
  }
  return "0.00";
}

function fmtDate(year: number, month = 1, day = 1): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Generate MeF-formatted XML for a specific form from tax facts.
 */
export function generateMefXml(formCode: string, ctx: MefContext): MefGenerationResult {
  const schema = MEF_SCHEMAS[formCode];
  if (!schema) {
    return { xml: "", formCode, returnTypeCd: "", validationErrors: [`No MeF schema found for form ${formCode}`], fieldCount: 0, filledCount: 0 };
  }

  const errors: string[] = [];
  const year = ctx.meta.taxYear;

  // Build form body elements
  const bodyLines: string[] = [];
  let filledCount = 0;

  for (const field of schema.fieldMap) {
    const val = ctx.facts[field.factName];
    if (val === undefined || val === null || val === "" || val === 0) {
      if (field.required) {
        errors.push(`Required field ${field.xmlElement} (${field.factName}) is missing or zero`);
      }
      if (field.defaultValue !== undefined) {
        bodyLines.push(`      <${field.xmlElement}>${escapeXml(field.defaultValue)}</${field.xmlElement}>`);
        filledCount++;
      }
      continue;
    }
    const formatted = typeof val === "number" ? fmtAmount(val) : escapeXml(String(val));
    bodyLines.push(`      <${field.xmlElement}>${formatted}</${field.xmlElement}>`);
    filledCount++;
  }

  // Validate EIN
  if (!ctx.meta.ein || ctx.meta.ein.replace(/\D/g, "").length < 9) {
    errors.push("EIN is missing or invalid — required for e-filing");
  }

  // Build full XML document
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Return xmlns="${schema.xmlNamespace}" returnVersion="${year}v1.0">
  <ReturnHeader>
    <ReturnTs>${new Date().toISOString()}</ReturnTs>
    <TaxYr>${year}</TaxYr>
    <TaxPeriodBeginDt>${fmtDate(year, 1, 1)}</TaxPeriodBeginDt>
    <TaxPeriodEndDt>${fmtDate(year, 12, 31)}</TaxPeriodEndDt>
    <ReturnTypeCd>${schema.returnTypeCd}</ReturnTypeCd>
    <Filer>
      <EIN>${escapeXml(ctx.meta.ein?.replace(/-/g, "") ?? "")}</EIN>
      <BusinessName>
        <BusinessNameLine1Txt>${escapeXml(ctx.meta.companyName)}</BusinessNameLine1Txt>
      </BusinessName>
      <USAddress>
        <AddressLine1Txt>${escapeXml(ctx.meta.address ?? "")}</AddressLine1Txt>
        <CityNm>${escapeXml(ctx.meta.city ?? "")}</CityNm>
        <StateAbbreviationCd>${escapeXml(ctx.meta.state ?? "")}</StateAbbreviationCd>
        <ZIPCd>${escapeXml(ctx.meta.zip ?? "")}</ZIPCd>
      </USAddress>
    </Filer>
  </ReturnHeader>
  <ReturnData>
    <${schema.xmlRootElement}>
${bodyLines.join("\n")}
    </${schema.xmlRootElement}>
  </ReturnData>
</Return>`;

  return {
    xml,
    formCode: schema.formCode,
    returnTypeCd: schema.returnTypeCd,
    validationErrors: errors,
    fieldCount: schema.fieldMap.length,
    filledCount,
  };
}

/**
 * Generate MeF XML for all required forms for an entity.
 */
export function generateFullReturn(entityType: string, ctx: MefContext): MefGenerationResult[] {
  const formsByEntity: Record<string, string[]> = {
    c_corp: ["1120"],
    s_corp: ["1120-S"],
    llc_partnership: ["1065"],
    llc_single: ["Sch C"],
    sole_prop: ["Sch C"],
    nonprofit: ["990"],
  };
  const formCodes = formsByEntity[entityType] ?? [];
  return formCodes.map((code) => generateMefXml(code, ctx));
}
