-- Initial schema migration for the dental treatment plan conversion tool.
-- Run once. Pence as integer, timestamptz throughout, uuid primary keys.
-- Practice isolation is enforced by row-level security on every table,
-- scoped through current_practice_id(). See the RLS section at the end.

-- Extensions ----------------------------------------------------------------
-- gen_random_uuid() is built in on Postgres 13+ (Supabase). pgcrypto is a
-- safe fallback if you are on an older base image.
create extension if not exists pgcrypto;

-- Enums ---------------------------------------------------------------------
create type app_user_role      as enum ('owner', 'executor');
create type item_state         as enum ('proposed', 'accepted', 'completed', 'declined');
create type plan_status        as enum ('open', 'accepted', 'completed', 'declined');
create type outreach_channel   as enum ('email', 'sms', 'call');
create type confirmation_method as enum ('auto', 'one_tap');
create type outreach_status    as enum ('drafted', 'approved', 'sent');
create type conversion_type    as enum ('booked', 'completed');

-- Tables --------------------------------------------------------------------

create table practices (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table app_users (
  id           uuid primary key,  -- maps to Supabase auth.users.id
  practice_id  uuid not null references practices(id),
  email        text not null,
  role         app_user_role not null default 'owner',
  created_at   timestamptz not null default now()
);

-- RLS helper ----------------------------------------------------------------
-- Returns the practice for the current auth user. SECURITY DEFINER so it can
-- read app_users without tripping that table's own RLS (avoids recursion).
create or replace function current_practice_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select practice_id from app_users where id = auth.uid()
$$;

create table pms_connections (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references practices(id),
  pms_type     text not null default 'dentally',
  credentials  text not null,    -- ciphertext, encrypted at the app layer
  region       text not null,    -- EU or UK
  created_at   timestamptz not null default now()
);

create table decline_reasons (
  id          integer generated always as identity primary key,
  code        text not null unique,
  label       text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table treatment_plans (
  id                 uuid primary key default gen_random_uuid(),
  practice_id        uuid not null references practices(id),
  pms_connection_id  uuid not null references pms_connections(id),
  pms_plan_id        text not null,
  patient_ref        text not null,
  total_value_pence  integer not null default 0,
  presented_at       timestamptz,
  status             plan_status not null default 'open',  -- stored rollup of item states
  priority_score     numeric,
  priority_override  numeric,
  imported_at        timestamptz,
  last_synced_at     timestamptz,
  created_at         timestamptz not null default now(),
  unique (pms_connection_id, pms_plan_id)
);

create table treatment_plan_items (
  id                       uuid primary key default gen_random_uuid(),
  plan_id                  uuid not null references treatment_plans(id) on delete cascade,
  practice_id              uuid not null references practices(id),
  description              text,
  value_pence              integer not null default 0,
  dentally_treatment_code  text,
  dentally_treatment_type  text,
  state                    item_state not null default 'proposed',
  state_changed_at         timestamptz,
  decline_reason_id        integer references decline_reasons(id) on delete set null,
  closed_via               text,
  created_at               timestamptz not null default now()
);

create table outreach_events (
  id                   uuid primary key default gen_random_uuid(),
  item_id              uuid not null references treatment_plan_items(id) on delete cascade,
  practice_id          uuid not null references practices(id),
  channel              outreach_channel not null,
  drafted_by           uuid references app_users(id) on delete set null,  -- null when AI-drafted
  approved_by          uuid references app_users(id) on delete set null,  -- null until approved
  sent_at              timestamptz,                 -- contact time; ordering key for attribution
  is_confirmed         boolean not null default false,
  confirmation_method  confirmation_method,
  confirmed_at         timestamptz,
  status               outreach_status not null default 'drafted',
  created_at           timestamptz not null default now()
);

create table conversion_events (
  id                  uuid primary key default gen_random_uuid(),
  item_id             uuid not null references treatment_plan_items(id) on delete cascade,
  practice_id         uuid not null references practices(id),
  detected_at         timestamptz not null,
  type                conversion_type not null,
  is_tool_attributed  boolean not null default false,  -- binary item-level credit
  created_at          timestamptz not null default now()
);

create table usage_events (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references practices(id),
  actor_id     uuid references app_users(id) on delete set null,
  event_type   text not null,   -- digest_opened, plan_viewed, draft_generated, draft_sent, call_logged
  entity_type  text,
  entity_id    uuid,
  occurred_at  timestamptz not null default now()
);

create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  practice_id  uuid not null references practices(id),
  actor_id     uuid references app_users(id) on delete set null,
  action       text not null,   -- read, write
  entity_type  text not null,
  entity_id    uuid,
  details      jsonb,           -- context: old/new values, reason, etc.
  occurred_at  timestamptz not null default now()
);

-- Indexes -------------------------------------------------------------------
-- practice_id on every child table backs the RLS predicate.
create index app_users_practice_idx        on app_users (practice_id);
create index pms_connections_practice_idx  on pms_connections (practice_id);
create index plans_practice_idx            on treatment_plans (practice_id);
create index plans_connection_idx          on treatment_plans (pms_connection_id);
create index plans_patient_idx             on treatment_plans (patient_ref);
create index items_practice_idx            on treatment_plan_items (practice_id);
create index items_plan_idx                on treatment_plan_items (plan_id);
create index outreach_practice_idx         on outreach_events (practice_id);
create index outreach_item_sent_idx        on outreach_events (item_id, sent_at);  -- attribution ordering
create index conversion_practice_idx       on conversion_events (practice_id);
create index conversion_item_idx           on conversion_events (item_id);
create index usage_practice_time_idx       on usage_events (practice_id, occurred_at);
create index audit_practice_time_idx       on audit_log (practice_id, occurred_at);

-- Row-level security --------------------------------------------------------
alter table practices            enable row level security;
alter table app_users            enable row level security;
alter table pms_connections      enable row level security;
alter table decline_reasons      enable row level security;
alter table treatment_plans      enable row level security;
alter table treatment_plan_items enable row level security;
alter table outreach_events      enable row level security;
alter table conversion_events    enable row level security;
alter table usage_events         enable row level security;
alter table audit_log            enable row level security;

-- practices: a user sees only their own practice row.
create policy practices_isolation on practices
  for all using (id = current_practice_id()) with check (id = current_practice_id());

-- Practice-scoped operational tables.
create policy app_users_isolation on app_users
  for all using (practice_id = current_practice_id()) with check (practice_id = current_practice_id());
create policy pms_connections_isolation on pms_connections
  for all using (practice_id = current_practice_id()) with check (practice_id = current_practice_id());
create policy plans_isolation on treatment_plans
  for all using (practice_id = current_practice_id()) with check (practice_id = current_practice_id());
create policy items_isolation on treatment_plan_items
  for all using (practice_id = current_practice_id()) with check (practice_id = current_practice_id());
create policy outreach_isolation on outreach_events
  for all using (practice_id = current_practice_id()) with check (practice_id = current_practice_id());
create policy conversion_isolation on conversion_events
  for all using (practice_id = current_practice_id()) with check (practice_id = current_practice_id());

-- usage_events: practice-scoped read and insert (the client logs its own usage).
create policy usage_read on usage_events
  for select using (practice_id = current_practice_id());
create policy usage_insert on usage_events
  for insert with check (practice_id = current_practice_id());

-- audit_log: practice-scoped read only. Writes come from the server via the
-- service role, which bypasses RLS, so the log stays append-only to users.
create policy audit_read on audit_log
  for select using (practice_id = current_practice_id());

-- decline_reasons: global reference list, readable by any authenticated user.
-- Edits go through the service role, so no user write policy.
create policy decline_reasons_read on decline_reasons
  for select using (auth.role() = 'authenticated');

-- Seed: starter decline reasons (edit freely; these are placeholders) -------
insert into decline_reasons (code, label) values
  ('cost',          'Cost'),
  ('timing',        'Not the right time'),
  ('considering',   'Wants to think it over'),
  ('elsewhere',     'Going elsewhere'),
  ('medical',       'Medical or clinical reason'),
  ('no_response',   'No response after follow-up');
