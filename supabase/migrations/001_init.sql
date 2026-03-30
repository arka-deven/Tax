-- Tax Engine — initial schema
-- Run this in: Supabase Dashboard → SQL Editor

-- ── Raw source records ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raw_source_records (
  raw_source_id   TEXT PRIMARY KEY,
  source_system   TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  tax_year        INTEGER NOT NULL,
  payload_json    JSONB NOT NULL,
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rsr_entity_year ON raw_source_records(entity_id, tax_year);

-- ── Canonical ledger accounts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canonical_ledger_accounts (
  canonical_account_id  TEXT PRIMARY KEY,
  raw_source_id         TEXT NOT NULL REFERENCES raw_source_records(raw_source_id),
  entity_id             TEXT NOT NULL,
  account_number        TEXT NOT NULL,
  account_name          TEXT NOT NULL,
  account_type          TEXT NOT NULL,
  account_subtype       TEXT NOT NULL,
  normal_balance        TEXT NOT NULL CHECK (normal_balance IN ('debit','credit')),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  source_refs           TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_cla_entity ON canonical_ledger_accounts(entity_id);

-- ── Canonical ledger entries ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canonical_ledger_entries (
  canonical_entry_id  TEXT PRIMARY KEY,
  raw_source_id       TEXT NOT NULL REFERENCES raw_source_records(raw_source_id),
  entity_id           TEXT NOT NULL,
  posting_date        DATE NOT NULL,
  tax_year            INTEGER NOT NULL,
  debit_amount        NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
  account_id          TEXT NOT NULL,
  counterparty_id     TEXT,
  memo                TEXT,
  class_id            TEXT,
  location_id         TEXT,
  source_refs         TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_cle_entity_year ON canonical_ledger_entries(entity_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_cle_account ON canonical_ledger_entries(account_id);

-- ── Trial balance lines ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trial_balance_lines (
  tb_line_id          TEXT PRIMARY KEY,
  entity_id           TEXT NOT NULL,
  tax_year            INTEGER NOT NULL,
  account_id          TEXT NOT NULL,
  beginning_balance   NUMERIC(18,2) NOT NULL DEFAULT 0,
  activity_debits     NUMERIC(18,2) NOT NULL DEFAULT 0,
  activity_credits    NUMERIC(18,2) NOT NULL DEFAULT 0,
  ending_balance      NUMERIC(18,2) NOT NULL DEFAULT 0,
  adjusted_balance    NUMERIC(18,2) NOT NULL DEFAULT 0,
  adjustment_ids      TEXT[] NOT NULL DEFAULT '{}',
  source_refs         TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_tbl_entity_year ON trial_balance_lines(entity_id, tax_year);

-- ── Tax adjustments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_adjustments (
  adjustment_id       TEXT PRIMARY KEY,
  entity_id           TEXT NOT NULL,
  tax_year            INTEGER NOT NULL,
  adjustment_type     TEXT NOT NULL,
  target_tb_line_id   TEXT NOT NULL REFERENCES trial_balance_lines(tb_line_id),
  amount              NUMERIC(18,2) NOT NULL,
  direction           TEXT NOT NULL CHECK (direction IN ('debit','credit')),
  reason_code         TEXT NOT NULL,
  note                TEXT,
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by         TEXT,
  approved_at         TIMESTAMPTZ,
  source_refs         TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_ta_entity_year ON tax_adjustments(entity_id, tax_year);

-- ── Tax code mappings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_code_mappings (
  mapping_id          TEXT PRIMARY KEY,
  entity_id           TEXT NOT NULL,
  tax_year            INTEGER NOT NULL,
  tb_line_id          TEXT NOT NULL REFERENCES trial_balance_lines(tb_line_id),
  semantic_category   TEXT NOT NULL,
  tax_code            TEXT NOT NULL,
  target_form         TEXT NOT NULL,
  target_schedule     TEXT,
  target_line         TEXT NOT NULL,
  mapping_method      TEXT NOT NULL,
  confidence_score    NUMERIC(4,3) NOT NULL DEFAULT 0,
  requires_review     BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason_code  TEXT,
  explanation         TEXT NOT NULL,
  source_refs         TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_tcm_entity_year ON tax_code_mappings(entity_id, tax_year);

-- ── Tax facts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_facts (
  tax_fact_id                   TEXT PRIMARY KEY,
  entity_id                     TEXT NOT NULL,
  tax_year                      INTEGER NOT NULL,
  fact_name                     TEXT NOT NULL,
  fact_value_json               JSONB NOT NULL,
  value_type                    TEXT NOT NULL,
  confidence_score              NUMERIC(4,3) NOT NULL DEFAULT 0,
  is_unknown                    BOOLEAN NOT NULL DEFAULT FALSE,
  derived_from_mapping_ids      TEXT[] NOT NULL DEFAULT '{}',
  derived_from_adjustment_ids   TEXT[] NOT NULL DEFAULT '{}',
  explanation                   TEXT NOT NULL,
  UNIQUE (entity_id, tax_year, fact_name)
);
CREATE INDEX IF NOT EXISTS idx_tf_entity_year ON tax_facts(entity_id, tax_year);

-- ── Rule definitions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rule_definitions (
  rule_id               TEXT PRIMARY KEY,
  rule_family           TEXT NOT NULL,
  rule_version          TEXT NOT NULL,
  tax_year              INTEGER NOT NULL,
  entity_scope          TEXT[] NOT NULL DEFAULT '{}',
  jurisdiction_scope    TEXT[] NOT NULL DEFAULT '{}',
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  condition_json        JSONB NOT NULL,
  action_json           JSONB NOT NULL,
  on_unknown_json       JSONB NOT NULL DEFAULT '{}',
  source_document       TEXT NOT NULL,
  source_section        TEXT NOT NULL,
  source_citation_text  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','deprecated')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  supersedes_rule_id    TEXT
);

-- ── Diagnostics ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnostics (
  diagnostic_id         TEXT PRIMARY KEY,
  entity_id             TEXT NOT NULL,
  tax_year              INTEGER NOT NULL,
  severity              TEXT NOT NULL CHECK (severity IN ('blocking_error','warning','info')),
  category              TEXT NOT NULL,
  code                  TEXT NOT NULL,
  title                 TEXT NOT NULL,
  message               TEXT NOT NULL,
  affected_forms        TEXT[] NOT NULL DEFAULT '{}',
  affected_lines        TEXT[] NOT NULL DEFAULT '{}',
  source_rule_ids       TEXT[] NOT NULL DEFAULT '{}',
  source_mapping_ids    TEXT[] NOT NULL DEFAULT '{}',
  source_tb_line_ids    TEXT[] NOT NULL DEFAULT '{}',
  resolution_status     TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open','resolved','waived')),
  resolution_note       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at           TIMESTAMPTZ,
  resolved_by           TEXT
);
CREATE INDEX IF NOT EXISTS idx_diag_entity_year ON diagnostics(entity_id, tax_year);

-- ── Review workpapers ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_workpapers (
  workpaper_id              TEXT PRIMARY KEY,
  entity_id                 TEXT NOT NULL,
  tax_year                  INTEGER NOT NULL,
  workpaper_type            TEXT NOT NULL,
  title                     TEXT NOT NULL,
  description               TEXT NOT NULL DEFAULT '',
  attached_source_refs      TEXT[] NOT NULL DEFAULT '{}',
  attached_mapping_ids      TEXT[] NOT NULL DEFAULT '{}',
  attached_rule_ids         TEXT[] NOT NULL DEFAULT '{}',
  attached_diagnostic_ids   TEXT[] NOT NULL DEFAULT '{}',
  preparer_note             TEXT,
  reviewer_note             TEXT,
  signoff_status            TEXT NOT NULL DEFAULT 'open',
  signed_off_by             TEXT,
  signed_off_at             TIMESTAMPTZ
);

-- ── Form requirements ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_requirements (
  form_requirement_id     TEXT PRIMARY KEY,
  entity_id               TEXT NOT NULL,
  tax_year                INTEGER NOT NULL,
  form_code               TEXT NOT NULL,
  schedule_code           TEXT,
  requirement_status      TEXT NOT NULL CHECK (requirement_status IN ('required','possible','blocked','not_required')),
  triggered_by_rule_ids   TEXT[] NOT NULL DEFAULT '{}',
  triggered_by_fact_ids   TEXT[] NOT NULL DEFAULT '{}',
  explanation             TEXT NOT NULL,
  confidence_score        NUMERIC(4,3) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fr_entity_year ON form_requirements(entity_id, tax_year);

-- ── Filing packages ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS filing_packages (
  filing_package_id       TEXT PRIMARY KEY,
  entity_id               TEXT NOT NULL,
  tax_year                INTEGER NOT NULL,
  form_set                TEXT[] NOT NULL DEFAULT '{}',
  assembly_status         TEXT NOT NULL DEFAULT 'assembled',
  validation_status       TEXT NOT NULL DEFAULT 'pending',
  review_status           TEXT NOT NULL DEFAULT 'pending',
  transmission_status     TEXT NOT NULL DEFAULT 'pending',
  acknowledgement_status  TEXT NOT NULL DEFAULT 'pending',
  last_status_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_message          TEXT,
  UNIQUE (entity_id, tax_year)
);
