import type { UnifiedFormSchema } from "../schemas/types";
import type { XmlFormDocument } from "./XmlDocument";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtAmount(val: unknown): string {
  if (typeof val === "number") return val.toFixed(2);
  if (typeof val === "string") { const n = parseFloat(val); return isNaN(n) ? "0.00" : n.toFixed(2); }
  return "0.00";
}

/**
 * Serialize an XmlFormDocument to IRS MeF-compliant XML string.
 */
export function serializeToMefXml(
  doc: XmlFormDocument,
  schema: UnifiedFormSchema
): { xml: string; errors: string[] } {
  const errors: string[] = [];
  const year = doc.taxYear;
  const h = doc.returnHeader;

  // Validate required fields
  for (const def of schema.fields) {
    if (def.xmlRequired && def.xmlElement) {
      const field = doc.fields[def.fieldId];
      if (!field?.value && field?.value !== 0) {
        errors.push(`Required: ${def.xmlElement} (${def.label}) is empty`);
      }
    }
  }

  if (!h.ein || h.ein.replace(/\D/g, "").length < 9) {
    errors.push("EIN is missing or invalid");
  }

  // Build form body lines
  const bodyLines: string[] = [];
  for (const def of schema.fields) {
    if (!def.xmlElement) continue;
    const field = doc.fields[def.fieldId];
    const val = field?.value;
    if (val === null || val === undefined || val === "") continue;

    const formatted = def.format === "currency" || def.format === "integer"
      ? fmtAmount(val)
      : escapeXml(String(val));

    bodyLines.push(`      <${def.xmlElement}>${formatted}</${def.xmlElement}>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Return xmlns="${schema.xml.namespace}" returnVersion="${year}v1.0">
  <ReturnHeader>
    <ReturnTs>${new Date().toISOString()}</ReturnTs>
    <TaxYr>${year}</TaxYr>
    <TaxPeriodBeginDt>${h.taxPeriodBegin}</TaxPeriodBeginDt>
    <TaxPeriodEndDt>${h.taxPeriodEnd}</TaxPeriodEndDt>
    <ReturnTypeCd>${schema.xml.returnTypeCd}</ReturnTypeCd>
    <Filer>
      <EIN>${escapeXml(h.ein.replace(/-/g, ""))}</EIN>
      <BusinessName>
        <BusinessNameLine1Txt>${escapeXml(h.businessName)}</BusinessNameLine1Txt>
      </BusinessName>
      <USAddress>
        <AddressLine1Txt>${escapeXml(h.address.line1)}</AddressLine1Txt>
        <CityNm>${escapeXml(h.address.city)}</CityNm>
        <StateAbbreviationCd>${escapeXml(h.address.state)}</StateAbbreviationCd>
        <ZIPCd>${escapeXml(h.address.zip)}</ZIPCd>
      </USAddress>
    </Filer>
  </ReturnHeader>
  <ReturnData>
    <${schema.xml.rootElement}>
${bodyLines.join("\n")}
    </${schema.xml.rootElement}>
  </ReturnData>
</Return>`;

  return { xml, errors };
}
