export type SourceSystem = "QBO";

export interface RawSourceRecord {
  raw_source_id: string;
  source_system: SourceSystem;
  entity_id: string;
  tax_year: number;
  payload_json: unknown;
  ingested_at: string; // ISO 8601
  checksum: string;
}
