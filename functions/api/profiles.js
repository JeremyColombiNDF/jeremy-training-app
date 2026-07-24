const MAX_STATE_BYTES = 1_800_000;
const PROFILE_ID_RE = /^p_[a-zA-Z0-9_-]{12,80}$/;
const PIN_RE = /^\d{4}$/;
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
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_profile_sessions_profile ON profile_sessions(profile_id)`),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS profile_state (
        profile_id TEXT PRIMARY KEY,
        access_hash TEXT NOT NULL,
        state_json TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        device_id TEXT,
        client_updated_at TEXT
      )
    `)
  ]);
}

function errorResponse(error, fallbackCode) {
  const status = error.status || (error.code === "DB_NOT_CONFIGURED" ? 503 : 500);
  return json({ configured: error.code !== "DB_NOT_CONFIGURED", error: error.code || fallbackCode, message: error.message }, { status });
}

function validateProfileId(value) {
  const profileId = String(value || "").trim();
  if (!PROFILE_ID_RE.test(profileId)) {
    const error = new Error("Identifiant de profil invalide.");
    error.code = "INVALID_PROFILE_ID";
    error.status = 400;
    throw error;
  }
  return profileId;
}

function validatePin(value) {
  const pin = String(value || "").trim();
  if (!PIN_RE.test(pin)) {
    const error = new Error("Le code doit contenir exactement 4 chiffres.");
    error.code = "INVALID_PIN";
    error.status = 400;
    throw error;
  }
  return pin;
}

function sanitizeName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
  if (!name) {
    const error = new Error("Le nom du profil est requis.");
    error.code = "INVALID_PROFILE_NAME";
    error.status = 400;
    throw error;
  }
  return name;
}

function sanitizeColor(value) {
  const color = String(value || "blue");
  return ALLOWED_COLORS.has(color) ? color : "blue";
}

function validateState(value) {
  if (!value || typeof value !== "object" || !value.week || !Array.isArray(value.week.sessions)) {
    const error = new Error("État d'application invalide.");
    error.code = "INVALID_STATE";
    error.status = 400;
    throw error;
  }
  const stateJson = JSON.stringify(value);
  if (new TextEncoder().encode(stateJson).byteLength > MAX_STATE_BYTES) {
    const error = new Error("Les données du profil sont trop volumineuses.");
    error.code = "STATE_TOO_LARGE";
    error.status = 413;
    throw error;
  }
  return stateJson;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes = 24) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return [...values].map(value => value.toString(16).padStart(2, "0")).join("");
}

async function pinHash(pin, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: new TextEncoder().encode(salt),
    iterations: 60000
  }, key, 256);
  return [...new Uint8Array(bits)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function authorizationToken(request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

async function createSession(env, profileId) {
  const token = `s_${randomHex(32)}`;
  const sessionHash = await sha256Hex(token);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO profile_sessions (session_hash, profile_id, created_at, last_used_at)
    VALUES (?, ?, ?, ?)
  `).bind(sessionHash, profileId, now, now).run();
  return token;
}

async function authorizeSession(env, request, profileId) {
  const token = authorizationToken(request);
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
  return token;
}

async function readProfile(env, profileId) {
  return env.DB.prepare(`
    SELECT profile_id, name, color, pin_hash, pin_salt, state_json, revision, updated_at, created_at, device_id, client_updated_at
    FROM shared_profiles WHERE profile_id = ?
  `).bind(profileId).first();
}

function publicProfile(row) {
  return {
    id: row.profile_id,
    name: row.name,
    color: row.color,
    updated_at: row.updated_at,
    created_at: row.created_at
  };
}

function unlockedPayload(row, sessionToken) {
  return {
    ok: true,
    profile: publicProfile(row),
    session_token: sessionToken,
    revision: Number(row.revision || 0),
    updated_at: row.updated_at,
    state: JSON.parse(row.state_json)
  };
}

async function pinIsValid(env, row, pin) {
  const adminPin = String(env.ADMIN_PIN || "").trim();
  if (adminPin && pin === adminPin) return true;
  return (await pinHash(pin, row.pin_salt)) === row.pin_hash;
}

function newerState(localState, remoteRow) {
  if (!remoteRow) return localState;
  let remoteState;
  try { remoteState = JSON.parse(remoteRow.state_json); }
  catch { return localState; }
  const localDate = Date.parse(localState?.updated_at || "") || 0;
  const remoteDate = Date.parse(remoteRow.client_updated_at || remoteState?.updated_at || remoteRow.updated_at || "") || 0;
  return remoteDate > localDate ? remoteState : localState;
}

async function createProfile(request, env, body, { legacy = false } = {}) {
  const name = sanitizeName(body.name);
  const color = sanitizeColor(body.color);
  const pin = validatePin(body.pin);
  const profileId = body.profile_id ? validateProfileId(body.profile_id) : `p_${randomHex(18)}`;
  let selectedState = body.state;

  if (legacy) {
    const legacyToken = String(body.legacy_token || "");
    const oldRow = await env.DB.prepare(`
      SELECT access_hash, state_json, revision, updated_at, device_id, client_updated_at
      FROM profile_state WHERE profile_id = ?
    `).bind(profileId).first();
    if (oldRow) {
      const legacyHash = await sha256Hex(legacyToken);
      if (legacyHash !== oldRow.access_hash) {
        const error = new Error("L'ancien accès de ce profil n'est pas valide.");
        error.code = "LEGACY_ACCESS_DENIED";
        error.status = 403;
        throw error;
      }
      selectedState = newerState(body.state, oldRow);
    }
  }

  const stateJson = validateState(selectedState);
  const now = new Date().toISOString();
  const salt = randomHex(16);
  const hashedPin = await pinHash(pin, salt);
  const existing = await readProfile(env, profileId);
  if (existing) {
    return json({ error: "PROFILE_ALREADY_EXISTS", profile: publicProfile(existing), message: "Ce profil existe déjà dans la liste commune." }, { status: 409 });
  }

  const inserted = await env.DB.prepare(`
    INSERT OR IGNORE INTO shared_profiles (
      profile_id, name, color, pin_hash, pin_salt, state_json, revision, updated_at, created_at, device_id, client_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `).bind(
    profileId, name, color, hashedPin, salt, stateJson, now, now,
    String(body.device_id || "").slice(0, 100),
    String(selectedState.updated_at || now).slice(0, 64)
  ).run();

  if (!inserted.meta?.changes) {
    const latest = await readProfile(env, profileId);
    return json({ error: "PROFILE_ALREADY_EXISTS", profile: latest ? publicProfile(latest) : null, message: "Ce profil vient d'être créé ailleurs." }, { status: 409 });
  }

  const row = await readProfile(env, profileId);
  const sessionToken = await createSession(env, profileId);
  return json(unlockedPayload(row, sessionToken), { status: 201 });
}

export async function onRequestGet({ env }) {
  try {
    await ensureDatabase(env);
    const result = await env.DB.prepare(`
      SELECT profile_id, name, color, updated_at, created_at
      FROM shared_profiles
      ORDER BY updated_at DESC, name COLLATE NOCASE ASC
    `).all();
    return json({ configured: true, profiles: (result.results || []).map(publicProfile) });
  } catch (error) {
    return errorResponse(error, "PROFILE_LIST_FAILED");
  }
}

export async function onRequestPost({ request, env }) {
  try {
    await ensureDatabase(env);
    const body = await request.json();
    const action = String(body?.action || "");

    if (action === "create") return createProfile(request, env, body);
    if (action === "publish_legacy") return createProfile(request, env, body, { legacy: true });

    if (action === "unlock") {
      const profileId = validateProfileId(body.profile_id);
      const pin = validatePin(body.pin);
      const row = await readProfile(env, profileId);
      if (!row) return json({ error: "PROFILE_NOT_FOUND", message: "Ce profil n'existe plus." }, { status: 404 });
      if (!(await pinIsValid(env, row, pin))) {
        return json({ error: "INVALID_PROFILE_PIN", message: "Code incorrect." }, { status: 403 });
      }
      const sessionToken = await createSession(env, profileId);
      return json(unlockedPayload(row, sessionToken));
    }

    return json({ error: "UNKNOWN_ACTION", message: "Action inconnue." }, { status: 400 });
  } catch (error) {
    return errorResponse(error, "PROFILE_ACTION_FAILED");
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    await ensureDatabase(env);
    const body = await request.json();
    const profileId = validateProfileId(body.profile_id);
    await authorizeSession(env, request, profileId);
    const row = await readProfile(env, profileId);
    if (!row) return json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });

    const name = body.name === undefined ? row.name : sanitizeName(body.name);
    const color = body.color === undefined ? row.color : sanitizeColor(body.color);
    let pinHashValue = row.pin_hash;
    let pinSaltValue = row.pin_salt;
    if (body.pin !== undefined && String(body.pin).trim()) {
      const pin = validatePin(body.pin);
      pinSaltValue = randomHex(16);
      pinHashValue = await pinHash(pin, pinSaltValue);
    }
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE shared_profiles
      SET name = ?, color = ?, pin_hash = ?, pin_salt = ?, updated_at = ?
      WHERE profile_id = ?
    `).bind(name, color, pinHashValue, pinSaltValue, now, profileId).run();
    const updated = await readProfile(env, profileId);
    return json({ ok: true, profile: publicProfile(updated) });
  } catch (error) {
    return errorResponse(error, "PROFILE_UPDATE_FAILED");
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    await ensureDatabase(env);
    const url = new URL(request.url);
    const profileId = validateProfileId(url.searchParams.get("profile_id"));
    await authorizeSession(env, request, profileId);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM profile_sessions WHERE profile_id = ?").bind(profileId),
      env.DB.prepare("DELETE FROM shared_profiles WHERE profile_id = ?").bind(profileId)
    ]);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error, "PROFILE_DELETE_FAILED");
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
