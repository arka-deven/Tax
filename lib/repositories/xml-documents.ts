import { db } from "@/lib/db";
import type { XmlFormDocument } from "@/src/xml/XmlDocument";

export async function getXmlDocument(entityId: string, taxYear: number, formCode: string): Promise<XmlFormDocument | null> {
  const { data, error } = await db
    .from("xml_form_documents")
    .select("document_json")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear)
    .eq("form_code", formCode)
    .maybeSingle();
  if (error || !data) return null;
  return (data as any).document_json as XmlFormDocument;
}

export async function upsertXmlDocument(doc: XmlFormDocument): Promise<void> {
  const id = `xmldoc_${doc.entityId}_${doc.taxYear}_${doc.formCode}`;
  const { error } = await db.from("xml_form_documents").upsert({
    xml_doc_id: id,
    entity_id: doc.entityId,
    tax_year: doc.taxYear,
    form_code: doc.formCode,
    document_json: doc as never,
    version: doc.version,
    updated_at: new Date().toISOString(),
  } as never, { onConflict: "entity_id,tax_year,form_code" });
  if (error) console.warn("Failed to upsert XML document:", error.message);
}

export async function getFieldOverrides(entityId: string, taxYear: number, formCode: string): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .from("xml_field_overrides")
    .select("field_id, override_value")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear)
    .eq("form_code", formCode);
  if (error || !data) return {};
  return Object.fromEntries(data.map((r: any) => [r.field_id, r.override_value]));
}

export async function saveFieldOverride(entityId: string, taxYear: number, formCode: string, fieldId: string, value: unknown): Promise<void> {
  const id = `override_${entityId}_${taxYear}_${formCode}_${fieldId}`;
  const { error } = await db.from("xml_field_overrides").upsert({
    override_id: id,
    entity_id: entityId,
    tax_year: taxYear,
    form_code: formCode,
    field_id: fieldId,
    override_value: value as never,
    overridden_at: new Date().toISOString(),
  } as never, { onConflict: "entity_id,tax_year,form_code,field_id" });
  if (error) console.warn("Failed to save field override:", error.message);
}
