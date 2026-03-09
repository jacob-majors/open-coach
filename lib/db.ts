import { createClient } from "@libsql/client";

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    // Fall back to local SQLite file for development
    const dbUrl = (!url || url.includes("placeholder"))
      ? "file:./local.db"
      : url;

    const token = (!url || url.includes("placeholder")) ? undefined : authToken;

    client = createClient({
      url: dbUrl,
      authToken: token,
    });
  }
  return client;
}

export async function initializeDb() {
  const db = getDb();

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      bodyweight_lbs REAL,
      max_rope_grade TEXT,
      max_boulder_grade TEXT,
      target_rope_grade TEXT,
      target_boulder_grade TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'athlete',
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      difficulty_min TEXT,
      difficulty_max TEXT,
      duration_weeks INTEGER DEFAULT 4,
      focus TEXT NOT NULL DEFAULT 'general',
      is_public INTEGER DEFAULT 0,
      is_certified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      protocol_type TEXT NOT NULL DEFAULT 'custom',
      description TEXT,
      purpose TEXT,
      instructions TEXT,
      form_cues TEXT,
      hang_time_s INTEGER,
      rest_time_s INTEGER,
      reps INTEGER,
      sets INTEGER,
      rest_between_sets_s INTEGER DEFAULT 180,
      intensity_percent REAL,
      day_of_week INTEGER,
      week_number INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS user_plans (
      user_id INTEGER NOT NULL REFERENCES users(id),
      plan_id INTEGER NOT NULL REFERENCES plans(id),
      saved_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 0,
      started_at TEXT,
      PRIMARY KEY (user_id, plan_id)
    )`,
    `CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      workout_id INTEGER REFERENCES workouts(id),
      plan_id INTEGER REFERENCES plans(id),
      workout_name TEXT NOT NULL,
      protocol_type TEXT NOT NULL DEFAULT 'custom',
      weight_lbs REAL,
      rpe INTEGER,
      notes TEXT,
      duration_minutes INTEGER,
      sets_completed INTEGER,
      completed_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      edge_mm INTEGER DEFAULT 20,
      bodyweight_lbs REAL NOT NULL,
      added_weight_lbs REAL DEFAULT 0,
      total_weight_lbs REAL NOT NULL,
      percent_bodyweight REAL NOT NULL,
      hang_time_s INTEGER DEFAULT 10,
      notes TEXT,
      tested_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      max_hang_percent REAL,
      max_pullups INTEGER,
      campus_reach_cm REAL,
      vertical_jump_cm REAL,
      l_sit_hold_s INTEGER,
      climbing_grade TEXT,
      limiting_factor TEXT,
      recommendations TEXT,
      generated_plan_id INTEGER REFERENCES plans(id),
      assessed_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS followers (
      follower_id INTEGER NOT NULL REFERENCES users(id),
      following_id INTEGER NOT NULL REFERENCES users(id),
      followed_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id)
    )`,
    `CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS sends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      grade TEXT NOT NULL,
      problem_name TEXT,
      location TEXT,
      style TEXT,
      attempts INTEGER,
      notes TEXT,
      sent_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS benchmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      value REAL NOT NULL,
      notes TEXT,
      recorded_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS practices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      comp_team INTEGER,
      practice_date TEXT NOT NULL,
      start_time TEXT,
      duration_minutes INTEGER DEFAULT 90,
      location TEXT,
      notes TEXT,
      plan_id INTEGER REFERENCES plans(id),
      coach_id INTEGER REFERENCES users(id),
      is_recurring INTEGER DEFAULT 0,
      recurrence_rule TEXT,
      recurrence_end_date TEXT,
      parent_practice_id INTEGER REFERENCES practices(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `ALTER TABLE users ADD COLUMN comp_team INTEGER`,
    `CREATE TABLE IF NOT EXISTS practice_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL REFERENCES users(id),
  session_name TEXT,
  day_type TEXT NOT NULL,
  warmup_id TEXT,
  blocks TEXT NOT NULL DEFAULT '[]',
  cooldown TEXT,
  coach_notes TEXT,
  practice_date TEXT,
  team_filter TEXT,
  total_minutes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)`,
    `CREATE TABLE IF NOT EXISTS kilter_benchmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES users(id),
  coach_id INTEGER NOT NULL REFERENCES users(id),
  climb_name TEXT NOT NULL,
  grade TEXT,
  angle INTEGER,
  notes TEXT,
  is_completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
)`,
  ];

  for (const sql of tables) {
    try {
      await db.execute(sql);
    } catch {
      // Ignore "duplicate column" errors from ALTER TABLE
    }
  }
}
