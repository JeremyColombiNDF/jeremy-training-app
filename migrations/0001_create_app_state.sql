CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  device_id TEXT,
  client_updated_at TEXT
);
