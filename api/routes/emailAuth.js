import { Router } from "express";
import { query } from "../../db/index.js";
import { createEmailAccount, findEmailIdentity, isValidEmail, normalizeEmail } from "../../db/accounts.js";
import { REFRESH_COOKIE, requireAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { hashPassword, validatePassword, verifyAgainstDummy, verifyPassword } from "../services/passwords.js";
import {
  createSession,
  deviceLabelFromUserAgent,
  refreshSession,
  revokeAllSessions,
  revokeSessionByRefreshToken,
} from "../services/sessions.js";
import { parseCookies } from "../utils/cookies.js";
import {
  clearAuthCookies,
  describeAccount,
  fail,
  limited,
  requireTrustedMutation,
  setAuthCookies,
} from "../utils/authHelpers.js";

export const emailAuthRouter = Router();

const loginByEmail = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const loginByIp = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
const signupByIp = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });
const passwordByAccount = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

emailAuthRouter.post("/email/signup", requireTrustedMutation, async (req, res, next) => {
  try {
    const gate = signupByIp.check(`signup:${req.ip}`);
    if (!gate.allowed) return limited(res, gate);

    const { email, password, displayName } = req.body ?? {};
    if (typeof email !== "string" || !isValidEmail(email)) return fail(res, 400, "invalid_email");
    if (validatePassword(password)) return fail(res, 400, "weak_password");

    const normalized = normalizeEmail(email);
    const name = String(displayName ?? "").trim().slice(0, 60) || normalized.split("@")[0];

    let account;
    try {
      account = await createEmailAccount({ email: normalized, passwordHash: await hashPassword(password), displayName: name });
    } catch (error) {
      if (error.message === "email_taken") return fail(res, 409, "email_taken");
      throw error;
    }

    const session = await createSession(account.id, deviceLabelFromUserAgent(req.get("user-agent")));
    setAuthCookies(res, session);
    res.status(201).json({ account: await describeAccount(account.id) });
  } catch (error) {
    next(error);
  }
});

emailAuthRouter.post("/email/login", requireTrustedMutation, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") return fail(res, 400, "invalid_request");

    const normalized = normalizeEmail(email);
    const ipGate = loginByIp.check(`login:ip:${req.ip}`);
    if (!ipGate.allowed) return limited(res, ipGate);
    const emailGate = loginByEmail.check(`login:email:${normalized}`);
    if (!emailGate.allowed) return limited(res, emailGate);

    const identity = await findEmailIdentity(normalized);
    let ok = false;
    if (identity?.passwordHash) ok = await verifyPassword(password, identity.passwordHash);
    else await verifyAgainstDummy(password);

    if (!ok) return fail(res, 401, "invalid_credentials");

    loginByEmail.reset(`login:email:${normalized}`);
    const session = await createSession(identity.accountId, deviceLabelFromUserAgent(req.get("user-agent")));
    setAuthCookies(res, session);
    res.json({ account: await describeAccount(identity.accountId) });
  } catch (error) {
    next(error);
  }
});

emailAuthRouter.post("/refresh", requireTrustedMutation, async (req, res, next) => {
  try {
    const refreshToken = parseCookies(req.get("cookie"))[REFRESH_COOKIE];
    const session = refreshToken ? await refreshSession(refreshToken) : null;
    if (!session) {
      clearAuthCookies(res);
      return fail(res, 401, "unauthorized");
    }
    setAuthCookies(res, session);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

emailAuthRouter.post("/logout", requireTrustedMutation, async (req, res, next) => {
  try {
    const refreshToken = parseCookies(req.get("cookie"))[REFRESH_COOKIE];
    if (refreshToken) await revokeSessionByRefreshToken(refreshToken);
    clearAuthCookies(res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

emailAuthRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const account = await describeAccount(req.user.id);
    if (!account) return fail(res, 401, "unauthorized");
    res.json({ account });
  } catch (error) {
    next(error);
  }
});

emailAuthRouter.post("/password", requireAuth, requireTrustedMutation, async (req, res, next) => {
  try {
    const gate = passwordByAccount.check(`password:${req.user.id}`);
    if (!gate.allowed) return limited(res, gate);

    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== "string") return fail(res, 400, "invalid_request");
    if (validatePassword(newPassword)) return fail(res, 400, "weak_password");

    const identity = await query(
      `SELECT password_hash FROM auth_identities WHERE user_id = $1 AND provider = 'email'`,
      [req.user.id],
    );
    const stored = identity.rows[0]?.password_hash;
    if (!stored) return fail(res, 400, "no_password_login");
    if (!(await verifyPassword(currentPassword, stored))) return fail(res, 401, "invalid_credentials");

    await query(`UPDATE auth_identities SET password_hash = $2 WHERE user_id = $1 AND provider = 'email'`, [
      req.user.id,
      await hashPassword(newPassword),
    ]);
    await revokeAllSessions(req.user.id, req.user.sid);
    passwordByAccount.reset(`password:${req.user.id}`);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
