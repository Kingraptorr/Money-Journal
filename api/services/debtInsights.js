import { query } from "../../db/index.js";
import { generateDebtInsight } from "./gemini.js";
import { debtsLogger } from "./debtsLogger.js";

// Gemini is asked for a debt insight at most once per user per Tehran day: the first time the user
// opens the app that day. Every other open that day (and every day the app isn't opened) costs no
// Gemini call and shows the stored sentence. A failed attempt is not retried until the next day.
// The request waits briefly for the first attempt; if Gemini is slower, the sentence is stored when
// it finishes and shows from the next open.
const WAIT_FOR_GENERATION_MS = 2500;

// Atomically claims today's single attempt. Returns true only for the one request that got it.
async function claimTodaysAttempt(userId, summary) {
  const result = await query(
    `INSERT INTO debt_insights
       (user_id, overdue_count, overdue_total, due_soon_count, due_soon_total, remaining_balance, sentence, last_attempt_date)
     VALUES ($1, $2, $3, $4, $5, $6, NULL, (NOW() AT TIME ZONE 'Asia/Tehran')::date)
     ON CONFLICT (user_id) DO UPDATE
       SET last_attempt_date = (NOW() AT TIME ZONE 'Asia/Tehran')::date
       WHERE debt_insights.last_attempt_date IS DISTINCT FROM (NOW() AT TIME ZONE 'Asia/Tehran')::date
     RETURNING sentence`,
    [userId, summary.overdueCount, summary.overdueTotal, summary.dueSoonCount, summary.dueSoonTotal, summary.remainingBalance],
  );
  if (result.rowCount === 0) return { claimed: false, previousSentence: null };
  return { claimed: true, previousSentence: result.rows[0].sentence ?? null };
}

async function generateAndStore(userId, summary) {
  try {
    const sentence = await generateDebtInsight(summary);
    if (!sentence) throw new Error("empty_debt_insight_response");
    await query(
      `UPDATE debt_insights
       SET overdue_count = $2, overdue_total = $3, due_soon_count = $4, due_soon_total = $5,
           remaining_balance = $6, sentence = $7, generated_at = NOW()
       WHERE user_id = $1`,
      [userId, summary.overdueCount, summary.overdueTotal, summary.dueSoonCount, summary.dueSoonTotal, summary.remainingBalance, sentence],
    );
    return sentence;
  } catch (error) {
    debtsLogger.error({ err: error, userId }, "debt_insight_generation_failed");
    return null;
  }
}

export async function getOrGenerateDebtInsight(userId, summary) {
  if (summary.remainingBalance <= 0) return null;

  const attempt = await claimTodaysAttempt(userId, summary);
  if (!attempt.claimed) {
    const stored = await query(`SELECT sentence FROM debt_insights WHERE user_id = $1`, [userId]);
    return stored.rows[0]?.sentence ?? null;
  }

  const job = generateAndStore(userId, summary);
  const generated = await Promise.race([
    job,
    new Promise((resolve) => setTimeout(() => resolve(null), WAIT_FOR_GENERATION_MS)),
  ]);
  return generated ?? attempt.previousSentence;
}
