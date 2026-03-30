import { NextRequest, NextResponse } from "next/server";
import { generateMefXml } from "@/src/engines/MefXmlEngine";
import type { MefContext } from "@/src/engines/MefXmlEngine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params;
  const body = await request.json();
  const { formCode, facts, meta } = body as {
    formCode: string;
    facts: Record<string, unknown>;
    meta: MefContext["meta"];
  };

  if (!formCode || !facts || !meta) {
    return NextResponse.json({ error: "formCode, facts, and meta are required" }, { status: 400 });
  }

  const result = generateMefXml(formCode, { facts, meta });

  if (result.validationErrors.length > 0) {
    return NextResponse.json({
      xml: result.xml,
      errors: result.validationErrors,
      fieldCount: result.fieldCount,
      filledCount: result.filledCount,
      status: "has_errors",
    });
  }

  return NextResponse.json({
    xml: result.xml,
    errors: [],
    fieldCount: result.fieldCount,
    filledCount: result.filledCount,
    status: "ready",
  });
}
