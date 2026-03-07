export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  bodyweight_lbs: number | null;
  max_rope_grade: string | null;
  max_boulder_grade: string | null;
  target_rope_grade: string | null;
  target_boulder_grade: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Plan {
  id: number;
  creator_id: number;
  title: string;
  description: string | null;
  difficulty_min: string | null;
  difficulty_max: string | null;
  duration_weeks: number;
  focus: string;
  is_public: boolean;
  is_certified: boolean;
  creator_username?: string;
  workout_count?: number;
  save_count?: number;
  created_at: string;
}

export interface Workout {
  id: number;
  plan_id: number | null;
  name: string;
  protocol_type: ProtocolType;
  description: string | null;
  purpose: string | null;
  instructions: string | null;
  form_cues: string | null;
  hang_time_s: number | null;
  rest_time_s: number | null;
  reps: number | null;
  sets: number | null;
  rest_between_sets_s: number | null;
  intensity_percent: number | null;
  day_of_week: number | null;
  week_number: number | null;
  order_index: number;
}

export type ProtocolType =
  | "max_hang"
  | "repeaters"
  | "density_hang"
  | "limit_bouldering"
  | "campus_board"
  | "arc_training"
  | "core"
  | "antagonist"
  | "mobility"
  | "custom";

export interface Log {
  id: number;
  user_id: number;
  workout_id: number | null;
  plan_id: number | null;
  workout_name: string;
  protocol_type: ProtocolType;
  weight_lbs: number | null;
  rpe: number | null;
  notes: string | null;
  duration_minutes: number | null;
  sets_completed: number | null;
  completed_at: string;
}

export interface Test {
  id: number;
  user_id: number;
  edge_mm: number;
  bodyweight_lbs: number;
  added_weight_lbs: number;
  total_weight_lbs: number;
  percent_bodyweight: number;
  hang_time_s: number;
  notes: string | null;
  tested_at: string;
}

export interface Assessment {
  id: number;
  user_id: number;
  max_hang_percent: number | null;
  max_pullups: number | null;
  campus_reach_cm: number | null;
  vertical_jump_cm: number | null;
  l_sit_hold_s: number | null;
  climbing_grade: string | null;
  limiting_factor: string | null;
  recommendations: string | null;
  generated_plan_id: number | null;
  assessed_at: string;
}

export interface Activity {
  id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  type: "workout_logged" | "test_recorded" | "plan_published" | "plan_saved" | "following";
  title: string;
  subtitle: string | null;
  metadata: string | null;
  created_at: string;
}

export interface TimerState {
  phase: "idle" | "hang" | "rest" | "rest_between_sets" | "complete";
  secondsLeft: number;
  currentRep: number;
  currentSet: number;
  totalReps: number;
  totalSets: number;
}

export interface WorkoutProtocol {
  name: string;
  type: ProtocolType;
  hangTime: number;
  restTime: number;
  reps: number;
  sets: number;
  restBetweenSets: number;
  intensityPercent?: number;
}

export interface BenchmarkEntry {
  grade: string;
  minPercent: number;
  maxPercent: number;
  label: string;
}

export interface AssessmentInput {
  maxHangPercent: number;
  maxPullups: number;
  campusReachCm?: number;
  verticalJumpCm?: number;
  lSitHoldS?: number;
  climbingGrade: string;
}

export interface AssessmentResult {
  limitingFactor: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  focusAreas: string[];
  estimatedPotential: string;
}
