import crypto from "crypto";
import jwt from "jsonwebtoken";
import { parseCookies } from "../utils/cookies.js";

export const ACCESS_COOKIE = "mj_access";
export const REFRESH_COOKIE = "mj_refresh";
export const ACCESS_TTL_SECONDS = 15 * 60;

function jwtSecret() {
  return process.env.JWT_SECRET || process.env.TELEGRAM_BOT_TOKEN;
}

export function validateTelegramInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (computedHash.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

export function signSession(userId) {
  return jwt.sign({ userId: String(userId) }, jwtSecret(), { expiresIn: "30d" });
}

export function signAccessToken(accountId, sessionId) {
  return jwt.sign({ userId: String(accountId), sid: sessionId }, jwtSecret(), { expiresIn: ACCESS_TTL_SECONDS });
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Cookie-authenticated writes must be same-origin JSON: a cross-site page cannot send
// application/json without a CORS preflight, which our allowlist refuses.
export function isTrustedMutation(req) {
  const type = String(req.get("content-type") ?? "").toLowerCase();
  if (!type.startsWith("application/json")) return false;
  const origin = req.get("origin");
  if (origin && origin !== process.env.WEB_APP_ORIGIN) return false;
  return true;
}

export function requireAuth(req, res, next) {
  const header = req.get("authorization") ?? "";
  let token = header.startsWith("Bearer ") ? header.slice(7) : null;
  let fromCookie = false;

  if (!token) {
    token = parseCookies(req.get("cookie"))[ACCESS_COOKIE] ?? null;
    fromCookie = Boolean(token);
  }

  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret());
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (fromCookie && !SAFE_METHODS.has(req.method) && !isTrustedMutation(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  req.user = { id: payload.userId, sid: payload.sid ?? null };
  next();
}
