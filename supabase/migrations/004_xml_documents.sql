-- XML Form Documents: single source of truth for tax return data
-- Stores the full form document as JSONB for efficient field-level updates.
-- MeF XML is serialized on demand from this data.

CREATE TABLE IF NOT EXISTS xml_form_documents (
  xml_doc_id        TEXT PRIMARY KEY,
  entity_id         TEXT NOT NULL,
  tax_year          INTEGER NOT NULL,
  form_code         TEXT NOT NULL,
  document_json     JSONB NOT NULL,
  xml_snapshot      TEXT,
  version           INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, tax_year, form_code)
);

CREATE INDEX IF NOT EXISTS idx_xfd_entity_year
  ON xml_form_documents(entity_id, tax_year);

-- Track user-edited fields so pipeline regeneration preserves them
CREATE TABLE IF NOT EXISTS xml_field_overrides (
  override_id       TEXT PRIMARY KEY,
  entity_id         TEXT NOT NULL,
  tax_year          INTEGER NOT NULL,
  form_code         TEXT NOT NULL,
  field_id          TEXT NOT NULL,
  override_value    JSONB NOT NULL,
  overridden_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  overridden_by     TEXT,
  UNIQUE (entity_id, tax_year, form_code, field_id)
);

CREATE INDEX IF NOT EXISTS idx_xfo_entity_form
  ON xml_field_overrides(entity_id, tax_year, form_code);
