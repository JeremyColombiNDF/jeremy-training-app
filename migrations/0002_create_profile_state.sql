CREATE TABLE IF NOT EXISTS profile_state (
  profile_id TEXT PRIMARY KEY,
  access_hash TEXT NOT NULL,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  device_id TEXT,
  client_updated_at TEXT
);
