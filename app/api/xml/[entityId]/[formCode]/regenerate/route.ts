import { NextRequest, NextResponse } from "next/server";
import { UNIFIED_SCHEMAS } from "@/src/schemas";
import { buildXmlDocument } from "@/src/xml/XmlDocumentBuilder";
import { getXmlDocument, upsertXmlDocument } from "@/lib/repositories/xml-documents";
import type { XmlFieldValue } from "@/src/xml/XmlDocument";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string; formCode: string }> }
) {
  const { entityId, formCode } = await params;
  const body = await request.json();
  const { facts, meta, taxYear = 2025 } = body;

  const schema = UNIFIED_SCHEMAS[formCode];
  if (!schema) return NextResponse.json({ error: `No schema for form ${formCode}` }, { status: 400 });

  // Load existing user overrides to preserve them
  let overrides: Record<string, XmlFieldValue> = {};
  try {
    const existing = await getXmlDocument(entityId, taxYear, formCode);
    if (existing) {
      // Preserve only user-edited fields
      for (const [id, field] of Object.entries(existing.fields)) {
        if (field.source === "user_edit") overrides[id] = field;
      }
    }
  } catch { /* no existing doc */ }

  // Build fresh document from facts, preserving overrides
  const doc = buildXmlDocument(schema, { facts, meta: { ...meta, taxYear } }, overrides);
  doc.entityId = entityId;

  // Persist
  await upsertXmlDocument(doc).catch(() => {});

  return NextResponse.json(doc);
}
