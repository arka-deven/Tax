import { NextRequest, NextResponse } from "next/server";
import { getXmlDocument, upsertXmlDocument, saveFieldOverride } from "@/lib/repositories/xml-documents";
import { UNIFIED_SCHEMAS } from "@/src/schemas";
import { recomputeFields } from "@/src/xml/XmlComputeEngine";
import type { XmlFieldValue } from "@/src/xml/XmlDocument";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string; formCode: string }> }
) {
  const { entityId, formCode } = await params;
  const taxYear = Number(request.nextUrl.searchParams.get("taxYear") ?? 2025);

  const doc = await getXmlDocument(entityId, taxYear, formCode);
  if (!doc) return NextResponse.json({ error: "No XML document found. Run pipeline first." }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string; formCode: string }> }
) {
  const { entityId, formCode } = await params;
  const { fieldId, value, taxYear = 2025 } = await request.json();

  if (!fieldId) return NextResponse.json({ error: "fieldId required" }, { status: 400 });

  const schema = UNIFIED_SCHEMAS[formCode];
  if (!schema) return NextResponse.json({ error: `No schema for form ${formCode}` }, { status: 400 });

  // Load current document
  let doc = await getXmlDocument(entityId, taxYear, formCode);
  if (!doc) return NextResponse.json({ error: "No XML document found" }, { status: 404 });

  // Update the field
  const now = new Date().toISOString();
  doc.fields[fieldId] = { fieldId, value, source: "user_edit", updatedAt: now } as XmlFieldValue;

  // Recompute dependent fields
  doc.fields = recomputeFields(schema, doc.fields);
  doc.version += 1;
  doc.updatedAt = now;

  // Persist
  await upsertXmlDocument(doc);
  await saveFieldOverride(entityId, taxYear, formCode, fieldId, value);

  return NextResponse.json(doc);
}
