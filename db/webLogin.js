import crypto from "node:crypto";
import { pool, query } from "./index.js";

const REQUEST_TTL_MINUTES = 5;
const CHALLENGE_TTL_MINUTES = 10;
const CODE_TTL_MINUTES = 5;
const MAX_CODE_ATTEMPTS = 5;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function appSecret() {
  return process.env.JWT_SECRET || process.env.TELEGRAM_BOT_TOKEN;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function codeHash(code) {
  return crypto.createHmac("sha256", appSecret()).update(String(code)).digest("hex");
}

function safeEqualHex(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function isRequestId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// ---- Flow A: browser asks, bot approves, browser claims with its private poll secret ----

export async function createLoginRequest(deviceLabel) {
  const pollSecret = crypto.randomBytes(32).toString("base64url");
  const result = await query(
    `INSERT INTO login_requests (poll_secret_hash, device_label, kind, expires_at)
     VALUES ($1, $2, 'approval', NOW() + ($3 || ' minutes')::interval)
     RETURNING id`,
    [sha256(pollSecret), deviceLabel ?? null, String(REQUEST_TTL_MINUTES)],
  );
  return { requestId: result.rows[0].id, pollSecret, expiresInSeconds: REQUEST_TTL_MINUTES * 60 };
}

export async function getPendingLoginRequest(requestId) {
  if (!isRequestId(requestId)) return null;
  const result = await query(
    `SELECT id, device_label FROM login_requests
     WHERE id = $1 AND kind = 'approval' AND status = 'pending' AND expires_at > NOW()`,
    [requestId],
  );
  return result.rowCount > 0 ? { id: result.rows[0].id, deviceLabel: result.rows[0].device_label } : null;
}

async function resolveLoginRequest(requestId, status, accountId) {
  if (!isRequestId(requestId)) return false;
  const result = await query(
    `UPDATE login_requests SET status = $2, user_id = $3
     WHERE id = $1 AND kind = 'approval' AND status = 'pending' AND expires_at > NOW()
     RETURNING id`,
    [requestId, status, accountId],
  );
  return result.rowCount > 0;
}

export function approveLoginRequest(requestId, accountId) {
  return resolveLoginRequest(requestId, "approved", accountId);
}

export function rejectLoginRequest(requestId, accountId) {
  return resolveLoginRequest(requestId, "rejected", accountId);
}

export async function claimLoginRequest(requestId, pollSecret) {
  if (!isRequestId(requestId)) return { status: "not_found" };
  const found = await query(
    `SELECT id, poll_secret_hash, status, expires_at FROM login_requests WHERE id = $1 AND kind = 'approval'`,
    [requestId],
  );
  if (found.rowCount === 0) return { status: "not_found" };
  const row = found.rows[0];

  if (typeof pollSecret !== "string" || !safeEqualHex(sha256(pollSecret), row.poll_secret_hash)) {
    return { status: "forbidden" };
  }

  if (new Date(row.expires_at) <= new Date() && (row.status === "pending" || row.status === "approved")) {
    await query(`UPDATE login_requests SET status = 'expired' WHERE id = $1`, [requestId]);
    return { status: "gone" };
  }

  if (row.status === "pending") return { status: "pending" };
  if (row.status === "rejected") return { status: "rejected" };
  if (row.status !== "approved") return { status: "gone" };

  const claimed = await query(
    `UPDATE login_requests SET status = 'claimed' WHERE id = $1 AND status = 'approved' RETURNING user_id`,
    [requestId],
  );
  if (claimed.rowCount === 0) return { status: "gone" };
  return { status: "approved", accountId: String(claimed.rows[0].user_id) };
}

// ---- Flow C: bot issues a short code, browser types it into a challenge-bound form ----

export async function createCodeChallenge(deviceLabel) {
  const result = await query(
    `INSERT INTO login_requests (poll_secret_hash, device_label, kind, expires_at)
     VALUES ('code_challenge', $1, 'code_challenge', NOW() + ($2 || ' minutes')::interval)
     RETURNING id`,
    [deviceLabel ?? null, String(CHALLENGE_TTL_MINUTES)],
  );
  return { challengeId: result.rows[0].id };
}

export async function issueWebLoginCode(accountId) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const hash = codeHash(code);

    const clash = await query(
      `SELECT 1 FROM one_time_codes
       WHERE purpose = 'web_login' AND code_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()`,
      [hash],
    );
    if (clash.rowCount > 0) continue;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE one_time_codes SET consumed_at = NOW()
         WHERE purpose = 'web_login' AND user_id = $1 AND consumed_at IS NULL`,
        [accountId],
      );
      await client.query(
        `INSERT INTO one_time_codes (purpose, user_id, code_hash, expires_at)
         VALUES ('web_login', $1, $2, NOW() + ($3 || ' minutes')::interval)`,
        [accountId, hash, String(CODE_TTL_MINUTES)],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { code, expiresInSeconds: CODE_TTL_MINUTES * 60 };
  }
  throw new Error("code_generation_failed");
}

export async function consumeWebLoginCode(challengeId, code) {
  if (!isRequestId(challengeId) || typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { error: "invalid_code" };
  }

  const challenge = await query(
    `SELECT id, attempts FROM login_requests
     WHERE id = $1 AND kind = 'code_challenge' AND status = 'pending' AND expires_at > NOW() AND attempts < $2`,
    [challengeId, MAX_CODE_ATTEMPTS],
  );
  if (challenge.rowCount === 0) return { error: "challenge_invalid" };

  const match = await query(
    `SELECT id FROM one_time_codes
     WHERE purpose = 'web_login' AND code_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()`,
    [codeHash(code)],
  );

  let accountId = null;
  if (match.rowCount > 0) {
    const consumed = await query(
      `UPDATE one_time_codes SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL RETURNING user_id`,
      [match.rows[0].id],
    );
    if (consumed.rowCount > 0) accountId = String(consumed.rows[0].user_id);
  }

  if (!accountId) {
    const failed = await query(
      `UPDATE login_requests
       SET attempts = attempts + 1,
           status = CASE WHEN attempts + 1 >= $2 THEN 'expired' ELSE status END
       WHERE id = $1
       RETURNING attempts`,
      [challengeId, MAX_CODE_ATTEMPTS],
    );
    return { error: "invalid_code", attemptsLeft: Math.max(0, MAX_CODE_ATTEMPTS - failed.rows[0].attempts) };
  }

  await query(`UPDATE login_requests SET status = 'claimed', user_id = $2 WHERE id = $1`, [challengeId, accountId]);
  return { accountId };
}

export async function purgeOldLoginArtifacts() {
  await query(`DELETE FROM login_requests WHERE created_at < NOW() - INTERVAL '1 day'`);
  await query(`DELETE FROM one_time_codes WHERE created_at < NOW() - INTERVAL '1 day'`);
}
