let cachedUsername = null;

export async function getBotUsername() {
  if (process.env.TELEGRAM_BOT_USERNAME) return process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, "");
  if (cachedUsername) return cachedUsername;

  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
  const data = await response.json();
  if (!data?.ok || !data.result?.username) throw new Error("bot_username_unavailable");
  cachedUsername = data.result.username;
  return cachedUsername;
}

// Best-effort security notice to the account's Telegram chat; never blocks or fails the request.
export async function notifyTelegramUser(telegramId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: Number(telegramId), text }),
    });
  } catch {
    // notification is advisory only
  }
}
