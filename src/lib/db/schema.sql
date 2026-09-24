-- Firearms App — local SQLite schema
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
  owner_type text not null check (owner_type in ('firearm','accessory')),
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
  caliber text not null unique,
  goal_quantity integer not null default 0
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
  created_at text not null default (datetime('now'))
);

create table if not exists app_settings (
  key text primary key,
  value text not null
);

create table if not exists count_adjustments (
  id text primary key,
  kind text not null,
  firearm_id text references firearms(id) on delete cascade,
  caliber text,
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

drop view if exists ammo_on_hand;

create view ammo_on_hand as
with purchased as (
  select caliber, sum(quantity) as qty from ammo_purchases group by caliber
),
fired as (
  select caliber, sum(rounds) as qty from (
    select caliber, coalesce(rounds_fired, 0) as rounds from range_log where caliber is not null
    union all
    select caliber, rounds from rounds_fired_log where deduct_from_ammo = 1 and caliber is not null
  ) group by caliber
),
adjusted as (
  select caliber, sum(delta) as qty from count_adjustments where kind = 'ammo' and caliber is not null group by caliber
),
calibers as (
  select caliber from purchased
  union select caliber from fired
  union select caliber from ammo_goals
  union select caliber from adjusted
)
select
  c.caliber,
  coalesce(p.qty, 0) as purchased,
  coalesce(f.qty, 0) as fired,
  coalesce(a.qty, 0) as adjusted,
  coalesce(p.qty, 0) - coalesce(f.qty, 0) + coalesce(a.qty, 0) as on_hand
from calibers c
left join purchased p on p.caliber = c.caliber
left join fired f on f.caliber = c.caliber
left join adjusted a on a.caliber = c.caliber;
