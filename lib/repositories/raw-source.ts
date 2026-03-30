import { db } from "@/lib/db";
import type { RawSourceRecord } from "@/src/models";

export async function upsertRawSource(record: RawSourceRecord) {
  const { error } = await db
    .from("raw_source_records")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({
      raw_source_id: record.raw_source_id,
      source_system: record.source_system,
      entity_id: record.entity_id,
      tax_year: record.tax_year,
      payload_json: record.payload_json as object,
      ingested_at: record.ingested_at,
      checksum: record.checksum,
    } as never);
  if (error) throw error;
}

export async function getRawSource(rawSourceId: string): Promise<RawSourceRecord | null> {
  const { data, error } = await db
    .from("raw_source_records")
    .select("*")
    .eq("raw_source_id", rawSourceId)
    .single();
  if (error) return null;
  return data as unknown as RawSourceRecord;
}

export async function getLatestRawSource(entityId: string, taxYear: number): Promise<RawSourceRecord | null> {
  const { data, error } = await db
    .from("raw_source_records")
    .select("*")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear)
    .order("ingested_at", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data as unknown as RawSourceRecord;
}
