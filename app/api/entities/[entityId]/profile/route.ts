import { NextRequest, NextResponse } from "next/server";
import { getEntityProfile, upsertEntityProfile } from "@/lib/repositories/entity-profile";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params;
  const profile = await getEntityProfile(entityId);
  return NextResponse.json(profile ?? {});
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params;
  const body = await request.json();
  await upsertEntityProfile({ ...body, entity_id: entityId });
  return NextResponse.json({ ok: true });
}
