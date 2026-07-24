const STATE_ID = "primary";
const MAX_STATE_BYTES = 1_500_000;

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
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      device_id TEXT,
      client_updated_at TEXT
    )
  `).run();
}

async function readRemote(env) {
  return env.DB.prepare(
    "SELECT state_json, revision, updated_at, device_id, client_updated_at FROM app_state WHERE id = ?"
  ).bind(STATE_ID).first();
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

export async function onRequestGet({ env }) {
  try {
    await ensureDatabase(env);
    return json(rowPayload(await readRemote(env)));
  } catch (error) {
    const status = error.code === "DB_NOT_CONFIGURED" ? 503 : 500;
    return json({ configured: false, error: error.code || "SYNC_READ_FAILED", message: error.message }, { status });
  }
}

export async function onRequestPut({ request, env }) {
  try {
    await ensureDatabase(env);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_STATE_BYTES) return json({ error: "STATE_TOO_LARGE" }, { status: 413 });

    const body = await request.json();
    if (!body || typeof body !== "object" || !body.state?.week?.sessions) {
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
    const existing = await readRemote(env);

    if (!existing) {
      if (baseRevision !== 0) {
        return json({ error: "SYNC_CONFLICT", ...rowPayload(null) }, { status: 409 });
      }
      const inserted = await env.DB.prepare(`
        INSERT OR IGNORE INTO app_state (id, state_json, revision, updated_at, device_id, client_updated_at)
        VALUES (?, ?, 1, ?, ?, ?)
      `).bind(STATE_ID, stateJson, now, deviceId, clientUpdatedAt).run();
      if (!inserted.meta?.changes) {
        const latest = await readRemote(env);
        return json({ error: "SYNC_CONFLICT", ...rowPayload(latest) }, { status: 409 });
      }
      return json({ ok: true, revision: 1, updated_at: now });
    }

    if (Number(existing.revision) !== baseRevision) {
      return json({ error: "SYNC_CONFLICT", ...rowPayload(existing) }, { status: 409 });
    }

    const nextRevision = baseRevision + 1;
    const updated = await env.DB.prepare(`
      UPDATE app_state
      SET state_json = ?, revision = ?, updated_at = ?, device_id = ?, client_updated_at = ?
      WHERE id = ? AND revision = ?
    `).bind(stateJson, nextRevision, now, deviceId, clientUpdatedAt, STATE_ID, baseRevision).run();

    if (!updated.meta?.changes) {
      const latest = await readRemote(env);
      return json({ error: "SYNC_CONFLICT", ...rowPayload(latest) }, { status: 409 });
    }

    return json({ ok: true, revision: nextRevision, updated_at: now });
  } catch (error) {
    const status = error.code === "DB_NOT_CONFIGURED" ? 503 : 500;
    return json({ configured: false, error: error.code || "SYNC_WRITE_FAILED", message: error.message }, { status });
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
