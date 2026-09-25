export const SCHEMA_SQL = `-- Firearms App — local SQLite schema
-- This runs automatically on first launch (see src/lib/db/index.ts).
-- Everything lives in a single file at data/firearms.db, next to this project,
-- on whatever machine the app is running on. Nothing here talks to a network.

create table if not exists firearms (
  id text primary key,
  make_model text not null,
  nickname text,
  caliber text,
  platform text,
  serial_number text,
  purchase_date text,
  purchase_location text,
  purchase_value real,
  ffl_license_number text,
  receipt text,
  status text not null default 'active' check (status in ('active','stored','sold')),
  notes text,
  shots_fired integer not null default 0,
  malfunctions integer not null default 0,
  last_cleaned_at_shots integer,
  clean_interval_rounds integer,
  clean_interval_days integer,
  date_of_entry text not null default (datetime('now'))
);

create table if not exists attachments (
  id text primary key,
  owner_type text not null check (owner_type in ('firearm','accessory','document')),
  owner_id text not null,
  kind text not null default 'receipt' check (kind in ('receipt','photo','bill_of_sale','document')),
  file_path text not null,
  original_name text,
  uploaded_at text not null default (datetime('now'))
);

create index if not exists attachments_owner on attachments(owner_type, owner_id);

create table if not exists firearm_dispositions (
  id text primary key,
  firearm_id text not null references firearms(id) on delete cascade,
  date text not null,
  type text not null default 'Sold',
  recipient_name text,
  recipient_ffl text,
  recipient_address text,
  price real,
  notes text,
  created_at text not null default (datetime('now'))
);

create table if not exists accessories (
  id text primary key,
  firearm_id text references firearms(id) on delete set null,
  make_model text not null,
  type text,
  platform text,
  serial_number text,
  acquisition_date text,
  purchase_value real,
  purchase_location text,
  receipt text,
  date_of_entry text not null default (datetime('now'))
);

create table if not exists accessory_mounts (
  id text primary key,
  accessory_id text not null references accessories(id) on delete cascade,
  firearm_id text references firearms(id) on delete set null,
  firearm_label text,
  from_date text,
  to_date text,
  notes text,
  created_at text not null default (datetime('now'))
);

create table if not exists maintenance_log (
  id text primary key,
  firearm_id text not null references firearms(id) on delete cascade,
  date text not null,
  shots_fired_at_time integer,
  type text not null default 'cleaning',
  notes text,
  created_at text not null default (datetime('now'))
);

create table if not exists malfunction_log (
  id text primary key,
  firearm_id text not null references firearms(id) on delete cascade,
  date text not null,
  round_count_at_failure integer,
  malfunction_type text,
  cause text,
  notes text,
  created_at text not null default (datetime('now'))
);

create table if not exists zero_records (
  id text primary key,
  firearm_id text not null references firearms(id) on delete cascade,
  date text not null,
  distance text,
  ammo_description text,
  optic text,
  adjustment text,
  notes text,
  created_at text not null default (datetime('now'))
);

create table if not exists ammo_purchases (
  id text primary key,
  manufacturer text,
  ammo_type text,
  caliber text not null,
  grain integer,
  lot_number text,
  quantity integer not null default 0,
  date_purchased text,
  price real
);

create table if not exists ammo_goals (
  id text primary key,
  caliber text not null,
  ammo_type text,
  grain integer,
  goal_quantity integer not null default 0
);

create table if not exists range_sessions (
  id text primary key,
  number integer not null unique,
  date text not null,
  location text,
  notes text,
  created_at text not null default (datetime('now'))
);

create table if not exists target_types (
  id text primary key,
  name text not null unique,
  description text,
  created_at text not null default (datetime('now'))
);

create table if not exists target_type_zones (
  id text primary key,
  target_type_id text not null references target_types(id) on delete cascade,
  zone_label text not null,
  value real not null,
  sort_order integer not null default 0
);

create table if not exists courses_of_fire (
  id text primary key,
  code text not null unique,
  name text not null,
  total_rounds real,
  target_type text,
  target_type_id text references target_types(id) on delete set null,
  passing_score_percent real,
  columns_json text,
  scorecard_json text,
  categories_json text,
  notes text
);

create table if not exists cof_phases (
  id text primary key,
  cof_id text not null references courses_of_fire(id) on delete cascade,
  phase_number integer not null,
  title text not null,
  phase_total_rounds real,
  notes text,
  unique (cof_id, phase_number)
);

create table if not exists cof_strings (
  id text primary key,
  phase_id text not null references cof_phases(id) on delete cascade,
  sort_order integer not null default 0,
  row_type text not null default 'string',
  string_number real,
  option_label text,
  distance text,
  weapon text,
  rounds text,
  time_limit text,
  position text,
  action text,
  extra_json text
);

-- Personal range log: your own runs, tied to your own armory.
create table if not exists range_log (
  id text primary key,
  cof_id text references courses_of_fire(id) on delete set null,
  firearm_id text references firearms(id) on delete set null,
  date text not null,
  range_location text,
  weapon_used text,
  caliber text,
  grain integer,
  ammo_lot text,
  weather_conditions text,
  rounds_fired integer,
  rounds_counted integer,
  total_points real,
  final_score_percent real,
  grader_name text,
  passing_score_percent real,
  custom_fields_json text,
  notes text,
  session_id text references range_sessions(id) on delete set null,
  ammo_type text,
  ammo_grain integer,
  ammo_manufacturer text,
  created_at text not null default (datetime('now'))
);

create table if not exists range_log_zone_counts (
  id text primary key,
  range_log_id text not null references range_log(id) on delete cascade,
  zone_label text not null,
  value real not null,
  counted integer not null default 0,
  subtotal real generated always as (value * counted) stored
);

create table if not exists dropdown_options (
  id text primary key,
  category text not null,
  value text not null,
  sort_order integer not null default 0,
  unique (category, value)
);

create table if not exists rounds_fired_log (
  id text primary key,
  firearm_id text references firearms(id) on delete set null,
  date text not null,
  rounds integer not null,
  caliber text,
  ammo_lot text,
  deduct_from_ammo integer not null default 1,
  notes text,
  range_location text,
  session_id text references range_sessions(id) on delete set null,
  ammo_type text,
  ammo_grain integer,
  ammo_manufacturer text,
  created_at text not null default (datetime('now'))
);

create table if not exists app_settings (
  key text primary key,
  value text not null
);

create table if not exists documents (
  id text primary key,
  doc_type text not null,
  title text not null,
  issuer text,
  number text,
  holder text,
  firearm_id text references firearms(id) on delete set null,
  status text,
  issued_date text,
  expires_date text,
  notes text,
  created_at text not null default (datetime('now'))
);

create table if not exists checklist_items (
  id text primary key,
  list_name text not null default 'Range Bag',
  section text,
  text text not null,
  checked integer not null default 0,
  sort_order integer not null default 0,
  created_at text not null default (datetime('now'))
);

create table if not exists count_adjustments (
  id text primary key,
  kind text not null,
  firearm_id text references firearms(id) on delete cascade,
  caliber text,
  ammo_type text,
  grain integer,
  manufacturer text,
  date text not null,
  delta integer not null,
  set_to integer,
  note text,
  created_at text not null default (datetime('now'))
);

create table if not exists firearm_counters (
  id text primary key,
  firearm_id text not null references firearms(id) on delete cascade,
  name text not null,
  start_date text not null,
  start_shots integer not null default 0,
  interval_rounds integer,
  notes text,
  created_at text not null default (datetime('now'))
);
`;
