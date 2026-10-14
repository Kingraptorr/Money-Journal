import crypto from "node:crypto";
import { query } from "../../db/index.js";
import { signAccessToken } from "../middleware/auth.js";

const REUSE_GRACE_MS = 10_000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function deviceLabelFromUserAgent(userAgent) {
  const ua = String(userAgent ?? "");
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "unknown device";
  return `${browser} on ${os}`.slice(0, 80);
}

export async function createSession(accountId, deviceLabel) {
  const refreshToken = crypto.randomBytes(32).toString("base64url");
  const result = await query(
    `INSERT INTO sessions (user_id, refresh_token_hash, device_label, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
     RETURNING id`,
    [accountId, hashToken(refreshToken), deviceLabel ?? null],
  );
  const sessionId = result.rows[0].id;
  return { sessionId, refreshToken, accessToken: signAccessToken(accountId, sessionId) };
}

export async function refreshSession(refreshToken) {
  const found = await query(
    `SELECT id, user_id, device_label, expires_at, revoked_at FROM sessions WHERE refresh_token_hash = $1`,
    [hashToken(refreshToken)],
  );
  if (found.rowCount === 0) return null;
  const session = found.rows[0];

  if (session.revoked_at) {
    // A rotated or logged-out token being replayed outside the short grace window means it leaked.
    if (Date.now() - new Date(session.revoked_at).getTime() > REUSE_GRACE_MS) {
      await revokeAllSessions(session.user_id);
    }
    return null;
  }
  if (new Date(session.expires_at) <= new Date()) return null;

  const revoked = await query(`UPDATE sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL RETURNING id`, [session.id]);
  if (revoked.rowCount === 0) return null;

  const next = await createSession(String(session.user_id), session.device_label);
  return { accountId: String(session.user_id), ...next };
}

export async function revokeSessionByRefreshToken(refreshToken) {
  await query(`UPDATE sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`, [hashToken(refreshToken)]);
}

export async function revokeAllSessions(accountId, exceptSessionId = null) {
  await query(
    `UPDATE sessions SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [accountId, exceptSessionId],
  );
}

export async function purgeOldSessions() {
  await query(`DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days' OR revoked_at < NOW() - INTERVAL '7 days'`);
}
