import { query } from "./index.js";
import { isAdminAccount } from "./accounts.js";

export const DAILY_BOT_LIMIT = 10;

const TEHRAN_TODAY_SQL = `(NOW() AT TIME ZONE 'Asia/Tehran')::date`;

export async function isOverBotLimit(userId) {
  if (await isAdminAccount(userId)) return false;
  const result = await query(
    `SELECT count FROM bot_usage_daily WHERE user_id = $1 AND usage_date = ${TEHRAN_TODAY_SQL}`,
    [userId],
  );
  return (result.rows[0]?.count ?? 0) >= DAILY_BOT_LIMIT;
}

export async function recordBotUsage(userId) {
  if (await isAdminAccount(userId)) return;
  await query(
    `INSERT INTO bot_usage_daily (user_id, usage_date, count)
     VALUES ($1, ${TEHRAN_TODAY_SQL}, 1)
     ON CONFLICT (user_id, usage_date) DO UPDATE SET count = bot_usage_daily.count + 1`,
    [userId],
  );
}
