/**
 * Database migration script — run with: node scripts/migrate.js
 * Sets up all tables in your Turso database.
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@libsql/client");

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error("Error: TURSO_DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const db = createClient({ url, authToken });
  console.log("Connecting to Turso database...");

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
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
    );

    CREATE TABLE IF NOT EXISTS workouts (
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
    );

    CREATE TABLE IF NOT EXISTS user_plans (
      user_id INTEGER NOT NULL REFERENCES users(id),
      plan_id INTEGER NOT NULL REFERENCES plans(id),
      saved_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 0,
      started_at TEXT,
      PRIMARY KEY (user_id, plan_id)
    );

    CREATE TABLE IF NOT EXISTS logs (
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
    );

    CREATE TABLE IF NOT EXISTS tests (
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
    );

    CREATE TABLE IF NOT EXISTS assessments (
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
    );

    CREATE TABLE IF NOT EXISTS followers (
      follower_id INTEGER NOT NULL REFERENCES users(id),
      following_id INTEGER NOT NULL REFERENCES users(id),
      followed_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `;

  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await db.execute(stmt + ";");
    process.stdout.write(".");
  }

  console.log("\nMigration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
