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
