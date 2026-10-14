import { query } from "../../db/index.js";
import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, REFRESH_COOKIE, isTrustedMutation } from "../middleware/auth.js";
import { serializeCookie } from "./cookies.js";

const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export function fail(res, status, error, extra = {}) {
  res.status(status).json({ error, ...extra });
}

export function limited(res, result) {
  res.set("Retry-After", String(result.retryAfterSec));
  fail(res, 429, "rate_limited", { retryAfter: result.retryAfterSec });
}

export function requireTrustedMutation(req, res, next) {
  if (!isTrustedMutation(req)) {
    fail(res, 403, "forbidden");
    return;
  }
  next();
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.append("Set-Cookie", serializeCookie(ACCESS_COOKIE, accessToken, { maxAge: ACCESS_TTL_SECONDS, path: "/api" }));
  res.append("Set-Cookie", serializeCookie(REFRESH_COOKIE, refreshToken, { maxAge: REFRESH_TTL_SECONDS, path: "/api/auth" }));
}

export function clearAuthCookies(res) {
  res.append("Set-Cookie", serializeCookie(ACCESS_COOKIE, "", { maxAge: 0, path: "/api" }));
  res.append("Set-Cookie", serializeCookie(REFRESH_COOKIE, "", { maxAge: 0, path: "/api/auth" }));
}

export async function describeAccount(accountId) {
  const result = await query(
    `SELECT u.id, u.first_name,
            e.provider_user_id AS email,
            (e.password_hash IS NOT NULL) AS has_password,
            (t.id IS NOT NULL) AS has_telegram
     FROM users u
     LEFT JOIN auth_identities e ON e.user_id = u.id AND e.provider = 'email'
     LEFT JOIN auth_identities t ON t.user_id = u.id AND t.provider = 'telegram'
     WHERE u.id = $1`,
    [accountId],
  );
  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  return {
    id: String(row.id),
    displayName: row.first_name ?? "",
    email: row.email ?? null,
    hasPassword: row.has_password === true,
    hasTelegram: row.has_telegram === true,
  };
}

