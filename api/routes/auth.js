import { Router } from "express";
import { upsertUser } from "../../db/index.js";
import { signSession, validateTelegramInitData } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/telegram", async (req, res, next) => {
  try {
    const { initData } = req.body;

    if (!initData || !validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN)) {
      res.status(401).json({ error: "invalid_telegram_init_data" });
      return;
    }

    const params = new URLSearchParams(initData);
    const telegramUser = JSON.parse(params.get("user"));
    await upsertUser({
      id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
    });

    res.json({
      token: signSession(telegramUser.id),
      user: telegramUser,
    });
  } catch (error) {
    next(error);
  }
});
