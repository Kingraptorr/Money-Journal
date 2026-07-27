import crypto from "crypto";
import jwt from "jsonwebtoken";

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
  return jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET || process.env.TELEGRAM_BOT_TOKEN, {
    expiresIn: "30d",
  });
}

export function requireAuth(req, res, next) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || process.env.TELEGRAM_BOT_TOKEN);
    req.user = { id: payload.userId };
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}
