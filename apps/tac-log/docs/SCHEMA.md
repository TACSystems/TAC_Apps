# TAC-LOG database schema

Generated from a fresh v0.9.0 database. SQLite (SQLCipher when encryption is on), file `firearms.db` in the data folder. Upgrades are numbered steps in `apps/tac-log/src/lib/db/index.ts` (`MIGRATIONS`), recorded in `schema_migrations`.

## firearms

Each firearm: identity, purchase details, status, lifetime rounds fired and cleaning counters.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| make_model | TEXT | required |
| nickname | TEXT |  |
| caliber | TEXT |  |
| platform | TEXT |  |
| serial_number | TEXT |  |
| purchase_date | TEXT |  |
| purchase_location | TEXT |  |
| purchase_value | REAL |  |
| ffl_license_number | TEXT |  |
| receipt | TEXT |  |
| status | TEXT | required, default 'active' |
| notes | TEXT |  |
| shots_fired | INTEGER | required, default 0 |
| malfunctions | INTEGER | required, default 0 |
| last_cleaned_at_shots | INTEGER |  |
| clean_interval_rounds | INTEGER |  |
| clean_interval_days | INTEGER |  |
| date_of_entry | TEXT | required, default datetime('now') |

## attachments

Photos, receipts, bills of sale and document scans. Files live in data/receipts (sealed when encryption is on); this row points at them.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| owner_type | TEXT | required |
| owner_id | TEXT | required |
| kind | TEXT | required, default 'receipt' |
| file_path | TEXT | required |
| original_name | TEXT |  |
| uploaded_at | TEXT | required, default datetime('now') |

## firearm_dispositions

Sale / transfer records for a firearm.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| firearm_id | TEXT | required, → firearms.id (cascade) |
| date | TEXT | required |
| type | TEXT | required, default 'Sold' |
| recipient_name | TEXT |  |
| recipient_ffl | TEXT |  |
| recipient_address | TEXT |  |
| price | REAL |  |
| notes | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## accessories

Serialized accessories (optics, lights, suppressors) and which firearm they are mounted on now.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| firearm_id | TEXT | → firearms.id (set null) |
| make_model | TEXT | required |
| type | TEXT |  |
| platform | TEXT |  |
| serial_number | TEXT |  |
| acquisition_date | TEXT |  |
| purchase_value | REAL |  |
| purchase_location | TEXT |  |
| receipt | TEXT |  |
| date_of_entry | TEXT | required, default datetime('now') |

## accessory_mounts

History of which firearm an accessory was mounted on, and when.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| accessory_id | TEXT | required, → accessories.id (cascade) |
| firearm_id | TEXT | → firearms.id (set null) |
| firearm_label | TEXT |  |
| from_date | TEXT |  |
| to_date | TEXT |  |
| notes | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## maintenance_log

Cleaning, inspection, repair and part-replacement entries. Only type Cleaning resets the cleaning counter.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| firearm_id | TEXT | required, → firearms.id (cascade) |
| date | TEXT | required |
| shots_fired_at_time | INTEGER |  |
| type | TEXT | required, default 'cleaning' |
| notes | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## malfunction_log

Malfunctions with the round count at the time.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| firearm_id | TEXT | required, → firearms.id (cascade) |
| date | TEXT | required |
| round_count_at_failure | INTEGER |  |
| malfunction_type | TEXT |  |
| cause | TEXT |  |
| notes | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## zero_records

Zero data per firearm (distance, optic, ammo, adjustment).

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| firearm_id | TEXT | required, → firearms.id (cascade) |
| date | TEXT | required |
| distance | TEXT |  |
| ammo_description | TEXT |  |
| optic | TEXT |  |
| adjustment | TEXT |  |
| notes | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## ammo_purchases

Every ammo purchase. On hand is computed, never stored.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| manufacturer | TEXT |  |
| ammo_type | TEXT |  |
| caliber | TEXT | required |
| grain | INTEGER |  |
| lot_number | TEXT |  |
| quantity | INTEGER | required, default 0 |
| date_purchased | TEXT |  |
| price | REAL |  |

## ammo_goals

Ammo goals per caliber, optionally narrowed to a type and grain (unique on caliber + type + grain).

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| caliber | TEXT | required |
| ammo_type | TEXT |  |
| grain | INTEGER |  |
| goal_quantity | INTEGER | required, default 0 |

## range_sessions

One trip to the range: date + location, numbered (#0001…). Entries join automatically by date and location.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| number | INTEGER | required |
| date | TEXT | required |
| location | TEXT |  |
| notes | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## target_types

Reusable targets; each has scoring zones.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| name | TEXT | required |
| description | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## target_type_zones

Scoring zones (label + point value) for a target type.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| target_type_id | TEXT | required, → target_types.id (cascade) |
| zone_label | TEXT | required |
| value | REAL | required |
| sort_order | INTEGER | required, default 0 |

## courses_of_fire

Courses of fire: details, passing score, columns, scorecard fields and categories (JSON).

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| code | TEXT | required |
| name | TEXT | required |
| total_rounds | REAL |  |
| target_type | TEXT |  |
| target_type_id | TEXT | → target_types.id (set null) |
| passing_score_percent | REAL |  |
| columns_json | TEXT |  |
| scorecard_json | TEXT |  |
| categories_json | TEXT |  |
| notes | TEXT |  |

## cof_phases

Phases of a course.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| cof_id | TEXT | required, → courses_of_fire.id (cascade) |
| phase_number | INTEGER | required |
| title | TEXT | required |
| phase_total_rounds | REAL |  |
| notes | TEXT |  |

## cof_strings

Strings (and instruction/transition rows) within a phase; custom column values in extra_json.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| phase_id | TEXT | required, → cof_phases.id (cascade) |
| sort_order | INTEGER | required, default 0 |
| row_type | TEXT | required, default 'string' |
| string_number | REAL |  |
| option_label | TEXT |  |
| distance | TEXT |  |
| weapon | TEXT |  |
| rounds | TEXT |  |
| time_limit | TEXT |  |
| position | TEXT |  |
| action | TEXT |  |
| extra_json | TEXT |  |

## range_log

Course runs: one scored run of a course by one firearm, with zone counts, score, ammo used and its session.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| cof_id | TEXT | → courses_of_fire.id (set null) |
| firearm_id | TEXT | → firearms.id (set null) |
| date | TEXT | required |
| range_location | TEXT |  |
| weapon_used | TEXT |  |
| caliber | TEXT |  |
| grain | INTEGER |  |
| ammo_lot | TEXT |  |
| weather_conditions | TEXT |  |
| rounds_fired | INTEGER |  |
| rounds_counted | INTEGER |  |
| total_points | REAL |  |
| final_score_percent | REAL |  |
| grader_name | TEXT |  |
| passing_score_percent | REAL |  |
| custom_fields_json | TEXT |  |
| notes | TEXT |  |
| session_id | TEXT | → range_sessions.id (set null) |
| ammo_type | TEXT |  |
| ammo_grain | INTEGER |  |
| ammo_manufacturer | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## range_log_zone_counts

Hits per scoring zone for a course run.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| range_log_id | TEXT | required, → range_log.id (cascade) |
| zone_label | TEXT | required |
| value | REAL | required |
| counted | INTEGER | required, default 0 |

## dropdown_options

Editable dropdown lists (calibers, platforms, locations, weather, categories…).

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| category | TEXT | required |
| value | TEXT | required |
| sort_order | INTEGER | required, default 0 |

## rounds_fired_log

Practice rounds per firearm (not scored), with ammo used, location and session.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| firearm_id | TEXT | → firearms.id (set null) |
| date | TEXT | required |
| rounds | INTEGER | required |
| caliber | TEXT |  |
| ammo_lot | TEXT |  |
| deduct_from_ammo | INTEGER | required, default 1 |
| notes | TEXT |  |
| range_location | TEXT |  |
| session_id | TEXT | → range_sessions.id (set null) |
| ammo_type | TEXT |  |
| ammo_grain | INTEGER |  |
| ammo_manufacturer | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## app_settings

Key/value settings (JSON values): display, defaults, dashboard layout, remembered sections, backup settings, tour state.

| Column | Type | Notes |
| --- | --- | --- |
| key | TEXT | primary key |
| value | TEXT | required |

## documents

Permits, NFA stamps, memberships and licenses with issue/expiry dates.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| doc_type | TEXT | required |
| title | TEXT | required |
| issuer | TEXT |  |
| number | TEXT |  |
| holder | TEXT |  |
| firearm_id | TEXT | → firearms.id (set null) |
| status | TEXT |  |
| issued_date | TEXT |  |
| expires_date | TEXT |  |
| notes | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## checklist_items

Range bag (and other) checklist items with checked state.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| list_name | TEXT | required, default 'Range Bag' |
| section | TEXT |  |
| text | TEXT | required |
| checked | INTEGER | required, default 0 |
| sort_order | INTEGER | required, default 0 |
| created_at | TEXT | required, default datetime('now') |

## count_adjustments

Dated count corrections: firearm rounds fired, or ammo on hand for a caliber/type/grain/brand line.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| kind | TEXT | required |
| firearm_id | TEXT | → firearms.id (cascade) |
| caliber | TEXT |  |
| ammo_type | TEXT |  |
| grain | INTEGER |  |
| manufacturer | TEXT |  |
| date | TEXT | required |
| delta | INTEGER | required |
| set_to | INTEGER |  |
| note | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## firearm_counters

Part counters (barrel, springs…) measured from a starting shot count.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| firearm_id | TEXT | required, → firearms.id (cascade) |
| name | TEXT | required |
| start_date | TEXT | required |
| start_shots | INTEGER | required, default 0 |
| interval_rounds | INTEGER |  |
| notes | TEXT |  |
| created_at | TEXT | required, default datetime('now') |

## schema_migrations

Numbered upgrade steps already applied (0.9.0+).

| Column | Type | Notes |
| --- | --- | --- |
| id | INTEGER | primary key |
| name | TEXT | required |
| applied_at | TEXT | required, default datetime('now') |

## Views

- **ammo_stock**: Computed: purchased − fired + corrections per caliber/type/grain/brand line. Fired rows with no ammo pick form the 'Not specified' line.
- **ammo_on_hand**: Computed: ammo_stock totals per caliber (plus calibers that only have goals).
