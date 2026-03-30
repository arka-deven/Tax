import { NextRequest, NextResponse } from "next/server";
import { getXmlDocument } from "@/lib/repositories/xml-documents";
import { UNIFIED_SCHEMAS } from "@/src/schemas";
import { serializeToMefXml } from "@/src/xml/XmlSerializer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string; formCode: string }> }
) {
  const { entityId, formCode } = await params;
  const { taxYear = 2025 } = await request.json();

  const schema = UNIFIED_SCHEMAS[formCode];
  if (!schema) return NextResponse.json({ error: `No schema for ${formCode}` }, { status: 400 });

  const doc = await getXmlDocument(entityId, taxYear, formCode);
  if (!doc) return NextResponse.json({ error: "No XML document found" }, { status: 404 });

  const { xml, errors } = serializeToMefXml(doc, schema);

  return NextResponse.json({
    xml,
    errors,
    status: errors.length === 0 ? "ready" : "has_errors",
    fieldCount: schema.fields.filter(f => f.xmlElement).length,
    filledCount: schema.fields.filter(f => f.xmlElement && doc.fields[f.fieldId]?.value != null).length,
  });
}
