const MAX_STATE_BYTES = 1_800_000;
const PROFILE_ID_RE = /^p_[a-zA-Z0-9_-]{12,80}$/;
const ALLOWED_COLORS = new Set(["blue", "indigo", "violet", "teal", "green", "orange", "pink", "red"]);

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

async function ensureDatabase(env) {
  if (!env.DB) {
    const error = new Error("La liaison D1 nommée DB n'est pas configurée.");
    error.code = "DB_NOT_CONFIGURED";
    throw error;
  }
  await env.DB.batch([
    env.DB.prepare(`
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
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS profile_sessions (
        session_hash TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT NOT NULL
      )
    `),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_profile_sessions_profile ON profile_sessions(profile_id)`)
  ]);
}

function readProfileId(request) {
  const profileId = String(new URL(request.url).searchParams.get("profile_id") || "").trim();
  if (!PROFILE_ID_RE.test(profileId)) {
    const error = new Error("Identifiant de profil invalide.");
    error.code = "INVALID_PROFILE_ID";
    error.status = 400;
    throw error;
  }
  return profileId;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function authorizeSession(env, request, profileId) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 24) {
    const error = new Error("Ce profil doit être déverrouillé sur cet appareil.");
    error.code = "PROFILE_SESSION_REQUIRED";
    error.status = 401;
    throw error;
  }
  const sessionHash = await sha256Hex(token);
  const row = await env.DB.prepare(`
    SELECT profile_id FROM profile_sessions WHERE session_hash = ? AND profile_id = ?
  `).bind(sessionHash, profileId).first();
  if (!row) {
    const error = new Error("L'accès mémorisé à ce profil n'est plus valide.");
    error.code = "PROFILE_SESSION_INVALID";
    error.status = 403;
    throw error;
  }
  env.DB.prepare("UPDATE profile_sessions SET last_used_at = ? WHERE session_hash = ?")
    .bind(new Date().toISOString(), sessionHash).run().catch(() => {});
}

async function readRemote(env, profileId) {
  return env.DB.prepare(`
    SELECT profile_id, name, color, state_json, revision, updated_at, created_at, device_id, client_updated_at
    FROM shared_profiles WHERE profile_id = ?
  `).bind(profileId).first();
}

function rowPayload(row) {
  if (!row) return { configured: true, exists: false, revision: 0 };
  return {
    configured: true,
    exists: true,
    revision: Number(row.revision),
    updated_at: row.updated_at,
    device_id: row.device_id || "",
    client_updated_at: row.client_updated_at || "",
    profile: { id: row.profile_id, name: row.name, color: row.color, updated_at: row.updated_at, created_at: row.created_at },
    state: JSON.parse(row.state_json)
  };
}

function sanitizeProfileMeta(state, row) {
  const name = String(state?.profile?.name || row.name || "Profil").trim().replace(/\s+/g, " ").slice(0, 32) || row.name;
  const requestedColor = String(state?.profile?.color || row.color || "blue");
  const color = ALLOWED_COLORS.has(requestedColor) ? requestedColor : row.color;
  return { name, color };
}

function errorResponse(error, fallbackCode) {
  const status = error.status || (error.code === "DB_NOT_CONFIGURED" ? 503 : 500);
  return json({ configured: error.code !== "DB_NOT_CONFIGURED", error: error.code || fallbackCode, message: error.message }, { status });
}

export async function onRequestGet({ request, env }) {
  try {
    await ensureDatabase(env);
    const profileId = readProfileId(request);
    await authorizeSession(env, request, profileId);
    const row = await readRemote(env, profileId);
    if (!row) return json({ error: "PROFILE_NOT_FOUND", message: "Ce profil n'existe plus." }, { status: 404 });
    return json(rowPayload(row));
  } catch (error) {
    return errorResponse(error, "SYNC_READ_FAILED");
  }
}

export async function onRequestPut({ request, env }) {
  try {
    await ensureDatabase(env);
    const profileId = readProfileId(request);
    await authorizeSession(env, request, profileId);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_STATE_BYTES) return json({ error: "STATE_TOO_LARGE" }, { status: 413 });

    const body = await request.json();
    if (!body || typeof body !== "object" || !body.state?.week || !Array.isArray(body.state.week.sessions)) {
      return json({ error: "INVALID_STATE", message: "État d'application invalide." }, { status: 400 });
    }
    const stateJson = JSON.stringify(body.state);
    if (new TextEncoder().encode(stateJson).byteLength > MAX_STATE_BYTES) {
      return json({ error: "STATE_TOO_LARGE" }, { status: 413 });
    }

    const existing = await readRemote(env, profileId);
    if (!existing) return json({ error: "PROFILE_NOT_FOUND", message: "Ce profil n'existe plus." }, { status: 404 });
    const baseRevision = Number(body.base_revision || 0);
    if (Number(existing.revision) !== baseRevision) {
      return json({ error: "SYNC_CONFLICT", ...rowPayload(existing) }, { status: 409 });
    }

    const nextRevision = baseRevision + 1;
    const now = new Date().toISOString();
    const meta = sanitizeProfileMeta(body.state, existing);
    const updated = await env.DB.prepare(`
      UPDATE shared_profiles
      SET state_json = ?, revision = ?, updated_at = ?, device_id = ?, client_updated_at = ?, name = ?, color = ?
      WHERE profile_id = ? AND revision = ?
    `).bind(
      stateJson, nextRevision, now,
      String(body.device_id || "").slice(0, 100),
      String(body.client_updated_at || body.state.updated_at || "").slice(0, 64),
      meta.name, meta.color, profileId, baseRevision
    ).run();

    if (!updated.meta?.changes) {
      const latest = await readRemote(env, profileId);
      return json({ error: "SYNC_CONFLICT", ...rowPayload(latest) }, { status: 409 });
    }
    return json({ ok: true, revision: nextRevision, updated_at: now, profile: { id: profileId, name: meta.name, color: meta.color } });
  } catch (error) {
    return errorResponse(error, "SYNC_WRITE_FAILED");
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
