import { Router } from "express";
import {
  claimLoginRequest,
  consumeWebLoginCode,
  createCodeChallenge,
  createLoginRequest,
} from "../../db/webLogin.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { getBotUsername } from "../services/botInfo.js";
import { createSession, deviceLabelFromUserAgent } from "../services/sessions.js";
import { describeAccount, fail, limited, requireTrustedMutation, setAuthCookies } from "../utils/authHelpers.js";

export const telegramLoginRouter = Router();

const requestByIp = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
const pollByIp = createRateLimiter({ windowMs: 60 * 1000, max: 90 });
const challengeByIp = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
const codeByIp = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });

async function startSession(req, res, accountId) {
  const session = await createSession(accountId, deviceLabelFromUserAgent(req.get("user-agent")));
  setAuthCookies(res, session);
  return describeAccount(accountId);
}

telegramLoginRouter.post("/telegram/request", requireTrustedMutation, async (req, res, next) => {
  try {
    const gate = requestByIp.check(`tgreq:${req.ip}`);
    if (!gate.allowed) return limited(res, gate);

    const { requestId, pollSecret, expiresInSeconds } = await createLoginRequest(
      deviceLabelFromUserAgent(req.get("user-agent")),
    );
    const username = await getBotUsername();
    res.status(201).json({
      requestId,
      pollSecret,
      botLink: `https://t.me/${username}?start=web_${requestId}`,
      expiresInSeconds,
    });
  } catch (error) {
    next(error);
  }
});

telegramLoginRouter.get("/telegram/poll", async (req, res, next) => {
  try {
    const gate = pollByIp.check(`tgpoll:${req.ip}`);
    if (!gate.allowed) return limited(res, gate);

    const result = await claimLoginRequest(String(req.query.requestId ?? ""), req.get("x-poll-secret"));

    if (result.status === "pending") return res.status(202).json({ status: "pending" });
    if (result.status === "approved") {
      const account = await startSession(req, res, result.accountId);
      return res.json({ status: "approved", account });
    }
    if (result.status === "rejected") return fail(res, 403, "rejected");
    if (result.status === "gone") return fail(res, 410, "expired");
    if (result.status === "forbidden") return fail(res, 401, "unauthorized");
    return fail(res, 404, "not_found");
  } catch (error) {
    next(error);
  }
});

telegramLoginRouter.post("/code/challenge", requireTrustedMutation, async (req, res, next) => {
  try {
    const gate = challengeByIp.check(`challenge:${req.ip}`);
    if (!gate.allowed) return limited(res, gate);

    const { challengeId } = await createCodeChallenge(deviceLabelFromUserAgent(req.get("user-agent")));
    res.status(201).json({ challengeId });
  } catch (error) {
    next(error);
  }
});

telegramLoginRouter.post("/code", requireTrustedMutation, async (req, res, next) => {
  try {
    const gate = codeByIp.check(`code:${req.ip}`);
    if (!gate.allowed) return limited(res, gate);

    const { challengeId, code } = req.body ?? {};
    const result = await consumeWebLoginCode(challengeId, code);

    if (result.accountId) {
      const account = await startSession(req, res, result.accountId);
      return res.json({ account });
    }
    if (result.error === "challenge_invalid") return fail(res, 410, "challenge_expired");
    return fail(res, 401, "invalid_code", result.attemptsLeft === undefined ? {} : { attemptsLeft: result.attemptsLeft });
  } catch (error) {
    next(error);
  }
});
