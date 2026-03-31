-- QBO OAuth token storage (replaces filesystem .qbo-tokens.json)
create table if not exists qbo_tokens (
  entity_id text primary key,
  token_json jsonb not null default '{}'::jsonb,
  realm_id text,
  updated_at timestamptz not null default now()
);
