import { Router } from "express";
import { isValidEmail, normalizeEmail } from "../../db/accounts.js";
import { addEmailToAccount, issueLinkToken } from "../../db/linking.js";
import { requireAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { getBotUsername, notifyTelegramUser } from "../services/botInfo.js";
import { hashPassword, validatePassword } from "../services/passwords.js";
import { describeAccount, fail, limited, requireTrustedMutation } from "../utils/authHelpers.js";

export const linkRouter = Router();

const linkByAccount = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
const emailByAccount = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

linkRouter.post("/link/telegram", requireAuth, requireTrustedMutation, async (req, res, next) => {
  try {
    const gate = linkByAccount.check(`link:${req.user.id}`);
    if (!gate.allowed) return limited(res, gate);

    let issued;
    try {
      issued = await issueLinkToken(req.user.id);
    } catch (error) {
      if (error.message === "no_email_login") return fail(res, 400, "no_email_login");
      if (error.message === "already_linked") return fail(res, 409, "already_linked");
      throw error;
    }

    const username = await getBotUsername();
    res.status(201).json({
      token: issued.token,
      botLink: `https://t.me/${username}?start=link_${issued.token}`,
      expiresInSeconds: issued.expiresInSeconds,
    });
  } catch (error) {
    next(error);
  }
});

linkRouter.post("/link/email", requireAuth, requireTrustedMutation, async (req, res, next) => {
  try {
    const gate = emailByAccount.check(`linkemail:${req.user.id}`);
    if (!gate.allowed) return limited(res, gate);

    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || !isValidEmail(email)) return fail(res, 400, "invalid_email");
    if (validatePassword(password)) return fail(res, 400, "weak_password");

    let result;
    try {
      result = await addEmailToAccount({
        accountId: req.user.id,
        email,
        passwordHash: await hashPassword(password),
      });
    } catch (error) {
      if (error.message === "email_taken") return fail(res, 409, "email_taken");
      if (error.message === "already_has_email") return fail(res, 409, "already_has_email");
      if (error.message === "no_telegram_login") return fail(res, 400, "no_telegram_login");
      throw error;
    }

    await notifyTelegramUser(
      result.telegramId,
      `🔐 اطلاع امنیتی: ایمیل ${normalizeEmail(email)} به حساب تو اضافه شد و حالا با ایمیل و رمز عبور هم می‌شه وارد وب‌اپ شد. اگه خودت این کار رو نکردی، بلافاصله پیام بده.`,
    );
    res.json({ account: await describeAccount(req.user.id) });
  } catch (error) {
    next(error);
  }
});
