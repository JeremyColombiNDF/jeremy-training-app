const MAX_STATE_BYTES = 1_800_000;
const PROFILE_ID_RE = /^[a-zA-Z0-9_-]{12,80}$/;

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
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS profile_state (
      profile_id TEXT PRIMARY KEY,
      access_hash TEXT NOT NULL,
      state_json TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      device_id TEXT,
      client_updated_at TEXT
    )
  `).run();
}

function readCredentials(request) {
  const url = new URL(request.url);
  const profileId = String(url.searchParams.get("profile_id") || "").trim();
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!PROFILE_ID_RE.test(profileId) || token.length < 24 || token.length > 200) {
    const error = new Error("Profil ou clé de synchronisation invalide.");
    error.code = "PROFILE_CREDENTIALS_REQUIRED";
    error.status = 401;
    throw error;
  }
  return { profileId, token };
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function readRemote(env, profileId) {
  return env.DB.prepare(
    "SELECT access_hash, state_json, revision, updated_at, device_id, client_updated_at FROM profile_state WHERE profile_id = ?"
  ).bind(profileId).first();
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
    state: JSON.parse(row.state_json)
  };
}

async function authorizeExisting(row, token) {
  if (!row) return;
  const tokenHash = await sha256Hex(token);
  if (tokenHash !== row.access_hash) {
    const error = new Error("La clé de ce profil n'est pas valide.");
    error.code = "PROFILE_ACCESS_DENIED";
    error.status = 403;
    throw error;
  }
}

function errorResponse(error, fallbackCode) {
  const status = error.status || (error.code === "DB_NOT_CONFIGURED" ? 503 : 500);
  return json({ configured: error.code !== "DB_NOT_CONFIGURED", error: error.code || fallbackCode, message: error.message }, { status });
}

export async function onRequestGet({ request, env }) {
  try {
    await ensureDatabase(env);
    const { profileId, token } = readCredentials(request);
    const row = await readRemote(env, profileId);
    await authorizeExisting(row, token);
    return json(rowPayload(row));
  } catch (error) {
    return errorResponse(error, "SYNC_READ_FAILED");
  }
}

export async function onRequestPut({ request, env }) {
  try {
    await ensureDatabase(env);
    const { profileId, token } = readCredentials(request);
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

    const baseRevision = Number(body.base_revision || 0);
    const deviceId = String(body.device_id || "").slice(0, 100);
    const clientUpdatedAt = String(body.client_updated_at || body.state.updated_at || "").slice(0, 64);
    const now = new Date().toISOString();
    const existing = await readRemote(env, profileId);
    await authorizeExisting(existing, token);

    if (!existing) {
      if (baseRevision !== 0) {
        return json({ error: "SYNC_CONFLICT", ...rowPayload(null) }, { status: 409 });
      }
      const accessHash = await sha256Hex(token);
      const inserted = await env.DB.prepare(`
        INSERT OR IGNORE INTO profile_state (profile_id, access_hash, state_json, revision, updated_at, device_id, client_updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?)
      `).bind(profileId, accessHash, stateJson, now, deviceId, clientUpdatedAt).run();
      if (!inserted.meta?.changes) {
        const latest = await readRemote(env, profileId);
        await authorizeExisting(latest, token);
        return json({ error: "SYNC_CONFLICT", ...rowPayload(latest) }, { status: 409 });
      }
      return json({ ok: true, revision: 1, updated_at: now });
    }

    if (Number(existing.revision) !== baseRevision) {
      return json({ error: "SYNC_CONFLICT", ...rowPayload(existing) }, { status: 409 });
    }

    const nextRevision = baseRevision + 1;
    const updated = await env.DB.prepare(`
      UPDATE profile_state
      SET state_json = ?, revision = ?, updated_at = ?, device_id = ?, client_updated_at = ?
      WHERE profile_id = ? AND revision = ?
    `).bind(stateJson, nextRevision, now, deviceId, clientUpdatedAt, profileId, baseRevision).run();

    if (!updated.meta?.changes) {
      const latest = await readRemote(env, profileId);
      await authorizeExisting(latest, token);
      return json({ error: "SYNC_CONFLICT", ...rowPayload(latest) }, { status: 409 });
    }

    return json({ ok: true, revision: nextRevision, updated_at: now });
  } catch (error) {
    return errorResponse(error, "SYNC_WRITE_FAILED");
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    await ensureDatabase(env);
    const { profileId, token } = readCredentials(request);
    const existing = await readRemote(env, profileId);
    await authorizeExisting(existing, token);
    if (existing) await env.DB.prepare("DELETE FROM profile_state WHERE profile_id = ?").bind(profileId).run();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error, "SYNC_DELETE_FAILED");
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
