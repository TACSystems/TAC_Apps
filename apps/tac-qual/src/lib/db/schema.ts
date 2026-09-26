export const SCHEMA_SQL = `-- TAC-QUAL — local SQLite schema.
-- Runs on first launch (see src/lib/db/index.ts). One file at data/tacqual.db
-- inside the app's own data folder. Nothing here talks to a network.

create table if not exists app_settings (
  key text primary key,
  value text not null
);

create table if not exists attachments (
  id text primary key,
  owner_type text not null check (owner_type in ('student','class','instructor')),
  owner_id text not null,
  kind text not null default 'document' check (kind in ('photo','waiver','signin','document','signature')),
  file_path text not null,
  original_name text,
  uploaded_at text not null default (datetime('now'))
);

create index if not exists attachments_owner on attachments(owner_type, owner_id);

create table if not exists dropdown_options (
  id text primary key,
  category text not null,
  value text not null,
  sort_order integer not null default 0,
  created_at text not null default (datetime('now')),
  unique (category, value)
);

create table if not exists checklist_items (
  id text primary key,
  list_name text not null default 'Instructor Bag',
  section text,
  text text not null,
  checked integer not null default 0,
  sort_order integer not null default 0,
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

-- Students. The agency columns are deliberately present and unused: TAC-QUAL
-- is the civilian app, and TAC-QUAL BLUE surfaces them without a schema change.
create table if not exists students (
  id text primary key,
  last_name text not null,
  first_name text not null,
  email text,
  phone text,
  address text,
  date_of_birth text,
  emergency_contact_name text,
  emergency_contact_phone text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  notes text,
  agency text,
  badge_id text,
  rank_title text,
  created_at text not null default (datetime('now')),
  updated_at text,
  created_by text
);

create index if not exists students_name on students(last_name, first_name);

create table if not exists student_firearms (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  make_model text not null,
  caliber text,
  serial_number text,
  notes text,
  sort_order integer not null default 0
);

create index if not exists student_firearms_student on student_firearms(student_id);

create table if not exists classes (
  id text primary key,
  number integer not null unique,
  title text not null,
  date text not null,
  location text,
  status text not null default 'planned' check (status in ('planned','in_progress','complete')),
  notes text,
  created_at text not null default (datetime('now')),
  created_by text
);

create index if not exists classes_date on classes(date);

-- Instructors credited on a class. In 0.2.0 these gain real accounts; the
-- name stays as the printed credit either way.
create table if not exists class_instructors (
  id text primary key,
  class_id text not null references classes(id) on delete cascade,
  name text not null,
  role text not null default 'assistant' check (role in ('lead','assistant','grader')),
  sort_order integer not null default 0
);

create table if not exists class_courses (
  id text primary key,
  class_id text not null references classes(id) on delete cascade,
  cof_id text not null references courses_of_fire(id) on delete cascade,
  sort_order integer not null default 0,
  unique (class_id, cof_id)
);

create table if not exists class_enrollment (
  id text primary key,
  class_id text not null references classes(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  relay integer,
  lane integer,
  notes text,
  unique (class_id, student_id)
);

create index if not exists enrollment_class on class_enrollment(class_id, relay, lane);

-- One scored run of one course by one student in one class. Repeat attempts
-- and remedial runs are extra rows, never overwrites.
create table if not exists score_runs (
  id text primary key,
  class_id text not null references classes(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  cof_id text not null references courses_of_fire(id) on delete cascade,
  attempt integer not null default 1,
  kind text not null default 'qual' check (kind in ('qual','remedial')),
  date text not null,
  firearm_desc text,
  caliber text,
  rounds_counted integer,
  total_points real,
  final_score_percent real,
  passing_score_percent real,
  passed integer not null default 0,
  scored_by text,
  notes text,
  created_at text not null default (datetime('now')),
  unique (class_id, student_id, cof_id, attempt)
);

create index if not exists score_runs_student on score_runs(student_id, cof_id);
create index if not exists score_runs_class on score_runs(class_id);

create table if not exists score_zone_counts (
  id text primary key,
  run_id text not null references score_runs(id) on delete cascade,
  zone_label text not null,
  value real not null,
  counted integer not null default 0,
  subtotal real generated always as (value * counted) stored
);

create index if not exists score_zone_run on score_zone_counts(run_id);

-- Single-row instructor profile (id is always 'me' until 0.2.0 brings accounts).
create table if not exists instructor_profile (
  id text primary key,
  name text not null,
  title text,
  email text,
  phone text,
  signature_attachment_id text references attachments(id) on delete set null,
  notes text,
  updated_at text
);

create table if not exists instructor_certs (
  id text primary key,
  name text not null,
  issuer text,
  number text,
  issued_date text,
  expires_date text,
  notes text,
  sort_order integer not null default 0
);
`;

// Per student and course: how many runs, best and latest score, and when they
// last passed. A view rather than a table, so it can never drift from the runs.
export const VIEWS_SQL = `
drop view if exists student_qualifications;
create view student_qualifications as
select
  r.student_id,
  r.cof_id,
  count(*) as runs,
  sum(case when r.passed = 1 then 1 else 0 end) as passes,
  max(r.final_score_percent) as best_percent,
  (select r2.final_score_percent from score_runs r2
     where r2.student_id = r.student_id and r2.cof_id = r.cof_id
     order by r2.date desc, r2.attempt desc, r2.created_at desc limit 1) as latest_percent,
  (select r3.passed from score_runs r3
     where r3.student_id = r.student_id and r3.cof_id = r.cof_id
     order by r3.date desc, r3.attempt desc, r3.created_at desc limit 1) as latest_passed,
  (select max(r4.date) from score_runs r4
     where r4.student_id = r.student_id and r4.cof_id = r.cof_id and r4.passed = 1) as last_passed_date,
  max(r.date) as last_run_date
from score_runs r
group by r.student_id, r.cof_id;
`;
