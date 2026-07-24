CREATE TABLE IF NOT EXISTS shared_profiles (
  profile_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  device_id TEXT,
  client_updated_at TEXT
);

CREATE TABLE IF NOT EXISTS profile_sessions (
  session_hash TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_sessions_profile ON profile_sessions(profile_id);
