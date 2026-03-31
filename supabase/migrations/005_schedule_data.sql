-- Schedule-level structured data for form filling.
-- The tax_facts table stores scalar values; these tables store
-- structured/multi-row data that feeds Schedule K, K-1, L, M-1, M-2.

-- ── Schedule K line items (entity-level distributive share) ──────────────────
-- One row per Schedule K line per entity per year.
-- These are the totals BEFORE per-owner allocation.
CREATE TABLE IF NOT EXISTS schedule_k_items (
  sk_item_id      TEXT PRIMARY KEY,
  entity_id       TEXT NOT NULL,
  tax_year        INTEGER NOT NULL,
  line_number     TEXT NOT NULL,          -- "1", "2", "3a", "4", ...
  description     TEXT NOT NULL,
  amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
  code            TEXT,                   -- IRS code letter for K-1 (e.g. "A", "B")
  source          TEXT DEFAULT 'computed', -- computed | manual | carryforward
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sk_entity_year ON schedule_k_items(entity_id, tax_year);

-- ── K-1 allocations (per-owner share of Schedule K) ─────────────────────────
-- One row per K-1 line per owner per year.
CREATE TABLE IF NOT EXISTS k1_allocations (
  k1_alloc_id     TEXT PRIMARY KEY,
  entity_id       TEXT NOT NULL,
  owner_id        TEXT NOT NULL,
  tax_year        INTEGER NOT NULL,
  k_line_number   TEXT NOT NULL,          -- matches schedule_k_items.line_number
  allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  allocation_pct  NUMERIC(6,3) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_k1_owner_year ON k1_allocations(owner_id, tax_year);

-- ── Balance sheet periods (Schedule L BOY/EOY data) ─────────────────────────
-- One row per balance sheet line per entity per year, with BOY and EOY columns.
CREATE TABLE IF NOT EXISTS balance_sheet_periods (
  bs_period_id    TEXT PRIMARY KEY,
  entity_id       TEXT NOT NULL,
  tax_year        INTEGER NOT NULL,
  line_number     TEXT NOT NULL,          -- "1" (cash), "2a" (AR), etc.
  description     TEXT NOT NULL,
  boy_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  eoy_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  source          TEXT DEFAULT 'qbo',     -- qbo | manual | computed
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bsp_entity_year ON balance_sheet_periods(entity_id, tax_year);

-- ── Entity officers / shareholders (Form 1120-S Schedule B table) ───────────
-- Distinct from entity_owners (which is ownership %). This captures
-- the officer compensation table on page 2 of 1120-S.
CREATE TABLE IF NOT EXISTS entity_officers (
  officer_id          TEXT PRIMARY KEY,
  entity_id           TEXT NOT NULL,
  tax_year            INTEGER NOT NULL,
  name                TEXT NOT NULL,
  title               TEXT,
  ssn                 TEXT,
  percent_of_time     NUMERIC(5,2) DEFAULT 100,
  percent_of_stock    NUMERIC(6,3) DEFAULT 0,
  compensation        NUMERIC(18,2) DEFAULT 0,
  is_common_stock     BOOLEAN DEFAULT TRUE,
  is_preferred_stock  BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eo_entity_year ON entity_officers(entity_id, tax_year);

-- ── M-2 reconciliation (AAA / OAA / Retained Earnings analysis) ─────────────
-- One row per reconciliation column per entity per year.
CREATE TABLE IF NOT EXISTS m2_reconciliation (
  m2_id               TEXT PRIMARY KEY,
  entity_id           TEXT NOT NULL,
  tax_year            INTEGER NOT NULL,
  column_name         TEXT NOT NULL,       -- "aaa", "oaa", "retained_earnings", "partners_capital"
  boy_balance         NUMERIC(18,2) DEFAULT 0,
  net_income          NUMERIC(18,2) DEFAULT 0,
  other_additions     NUMERIC(18,2) DEFAULT 0,
  distributions       NUMERIC(18,2) DEFAULT 0,
  other_reductions    NUMERIC(18,2) DEFAULT 0,
  eoy_balance         NUMERIC(18,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_m2_entity_year ON m2_reconciliation(entity_id, tax_year);

-- ── Schedule B entity questions (checkboxes + answers) ──────────────────────
-- Stores yes/no/text answers to the "Other Information" section.
CREATE TABLE IF NOT EXISTS schedule_b_answers (
  answer_id       TEXT PRIMARY KEY,
  entity_id       TEXT NOT NULL,
  tax_year        INTEGER NOT NULL,
  form_code       TEXT NOT NULL,           -- "1120-S", "1065", "1120"
  question_number TEXT NOT NULL,           -- "1", "2", "3", etc.
  answer_value    TEXT,                    -- "yes", "no", or text
  sub_answer      TEXT,                    -- for follow-up text fields
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sba_entity_year ON schedule_b_answers(entity_id, tax_year);

-- ── Form field registry (maps every PDF field to its data source) ───────────
-- This is the "Rosetta Stone" — one row per PDF field per form per year.
CREATE TABLE IF NOT EXISTS form_field_registry (
  registry_id     TEXT PRIMARY KEY,
  form_id         TEXT NOT NULL,           -- "f1120s", "f1065", etc.
  tax_year        INTEGER NOT NULL,
  pdf_field_name  TEXT NOT NULL,           -- exact AcroForm field name
  irs_line        TEXT,                    -- "1a", "7", "Sch K Line 1"
  description     TEXT,
  fact_name       TEXT,                    -- reference to tax_facts.fact_name
  data_source     TEXT NOT NULL,           -- "tax_facts" | "entity_profile" | "schedule_k" | "balance_sheet" | "entity_officers" | "manual"
  data_type       TEXT DEFAULT 'currency', -- currency | string | boolean | date | integer
  page_number     INTEGER DEFAULT 1,
  is_computed     BOOLEAN DEFAULT FALSE,
  formula         TEXT,                    -- if computed: "gross_receipts_total - returns_allowances_total"
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ffr_form_year ON form_field_registry(form_id, tax_year);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ffr_unique_field ON form_field_registry(form_id, tax_year, pdf_field_name);
