export type Firearm = {
  id: string;
  make_model: string;
  caliber: string | null;
  platform: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_location: string | null;
  purchase_value: number | null;
  ffl_license_number: string | null;
  receipt: string | null;
  status: "active" | "stored" | "sold";
  notes: string | null;
  shots_fired: number;
  malfunctions: number;
  last_cleaned_at_shots: number | null;
  clean_interval_rounds: number | null;
  clean_interval_days: number | null;
  date_of_entry: string;
};

export type ReceiptImage = {
  id: string;
  firearm_id: string;
  file_path: string;
  original_name: string | null;
  uploaded_at: string;
};

export type Accessory = {
  id: string;
  firearm_id: string | null;
  make_model: string;
  type: string | null;
  platform: string | null;
  serial_number: string | null;
  acquisition_date: string | null;
  purchase_value: number | null;
  purchase_location: string | null;
  receipt: string | null;
  date_of_entry: string;
};

export type MaintenanceLogEntry = {
  id: string;
  firearm_id: string;
  date: string;
  shots_fired_at_time: number | null;
  type: string;
  notes: string | null;
  created_at: string;
};

export type MalfunctionLogEntry = {
  id: string;
  firearm_id: string;
  date: string;
  round_count_at_failure: number | null;
  malfunction_type: string | null;
  cause: string | null;
  notes: string | null;
  created_at: string;
};

export type ZeroRecord = {
  id: string;
  firearm_id: string;
  date: string;
  distance: string | null;
  ammo_description: string | null;
  optic: string | null;
  adjustment: string | null;
  notes: string | null;
  created_at: string;
};

export type AmmoPurchase = {
  id: string;
  manufacturer: string | null;
  ammo_type: string | null;
  caliber: string;
  grain: number | null;
  lot_number: string | null;
  quantity: number;
  date_purchased: string | null;
  price: number | null;
};

export type AmmoGoal = {
  id: string;
  caliber: string;
  goal_quantity: number;
};

export type AmmoOnHand = {
  caliber: string;
  purchased: number;
  fired: number;
  on_hand: number;
};

export type CourseOfFire = {
  id: string;
  code: string;
  name: string;
  total_rounds: number | null;
  target_type: string | null;
  target_type_id: string | null;
  passing_score_percent: number | null;
  columns_json: string | null;
  scorecard_json: string | null;
  notes: string | null;
};

export type CofPhase = {
  id: string;
  cof_id: string;
  phase_number: number;
  title: string;
  phase_total_rounds: number | null;
};

export type CofString = {
  id: string;
  phase_id: string;
  string_number: number;
  option_label: string | null;
  distance: string | null;
  weapon: string | null;
  rounds: string | null;
  time_limit: string | null;
  position: string | null;
  action: string | null;
};

export type RangeLog = {
  id: string;
  cof_id: string | null;
  firearm_id: string | null;
  date: string;
  range_location: string | null;
  weapon_used: string | null;
  caliber: string | null;
  grain: number | null;
  ammo_lot: string | null;
  weather_conditions: string | null;
  rounds_fired: number | null;
  rounds_counted: number | null;
  total_points: number | null;
  final_score_percent: number | null;
  grader_name: string | null;
  passing_score_percent: number | null;
  custom_fields_json: string | null;
  notes: string | null;
  created_at: string;
};

export type RangeLogZoneCount = {
  id: string;
  range_log_id: string;
  zone_label: string;
  value: number;
  counted: number;
  subtotal: number;
};
