CREATE TABLE IF NOT EXISTS carryforward_items (
  carryforward_id    TEXT PRIMARY KEY,
  entity_id          TEXT NOT NULL,
  tax_year_originated INTEGER NOT NULL,
  carryforward_type  TEXT NOT NULL,
  original_amount    NUMERIC(18,2) NOT NULL,
  remaining_amount   NUMERIC(18,2) NOT NULL,
  expiration_year    INTEGER,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capital_transactions (
  transaction_id    TEXT PRIMARY KEY,
  entity_id         TEXT NOT NULL,
  tax_year          INTEGER NOT NULL,
  description       TEXT NOT NULL,
  date_acquired     DATE,
  date_sold         DATE NOT NULL,
  proceeds          NUMERIC(18,2) NOT NULL,
  cost_basis        NUMERIC(18,2) NOT NULL,
  gain_loss         NUMERIC(18,2) NOT NULL,
  holding_period    TEXT NOT NULL DEFAULT 'short_term',
  form_8949_box     TEXT DEFAULT 'A',
  source            TEXT DEFAULT 'manual',
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixed_asset_register (
  asset_id               TEXT PRIMARY KEY,
  entity_id              TEXT NOT NULL,
  description            TEXT NOT NULL,
  asset_class            TEXT NOT NULL,
  date_placed_in_service DATE NOT NULL,
  date_disposed          DATE,
  cost_basis             NUMERIC(18,2) NOT NULL,
  salvage_value          NUMERIC(18,2) DEFAULT 0,
  recovery_period_years  INTEGER NOT NULL,
  depreciation_method    TEXT DEFAULT 'MACRS',
  convention             TEXT DEFAULT 'HY',
  section_179_claimed    NUMERIC(18,2) DEFAULT 0,
  bonus_depreciation_claimed NUMERIC(18,2) DEFAULT 0,
  accum_depreciation     NUMERIC(18,2) DEFAULT 0,
  is_listed_property     BOOLEAN DEFAULT FALSE,
  business_use_pct       NUMERIC(5,2) DEFAULT 100,
  source                 TEXT DEFAULT 'manual',
  created_at             TIMESTAMPTZ DEFAULT now()
);
