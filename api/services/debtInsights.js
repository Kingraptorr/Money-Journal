import { query } from "../../db/index.js";
import { generateDebtInsight } from "./gemini.js";
import { debtsLogger } from "./debtsLogger.js";

function matchesCache(row, summary) {
  if (!row) return false;
  return (
    Number(row.overdue_count) === summary.overdueCount &&
    Number(row.overdue_total) === summary.overdueTotal &&
    Number(row.due_soon_count) === summary.dueSoonCount &&
    Number(row.due_soon_total) === summary.dueSoonTotal &&
    Number(row.remaining_balance) === summary.remainingBalance
  );
}

// Gemini is slow and sometimes unavailable (503), and this runs on the app's initial load, so the
// request never waits long for it: it returns the last stored sentence (or null) and lets the
// generation finish in the background for the next load.
const WAIT_FOR_GENERATION_MS = 2500;
const FAILURE_COOLDOWN_MS = 10 * 60_000;
const inFlight = new Map();
const lastFailureAt = new Map();

async function generateAndStore(userId, summary) {
  const sentence = await generateDebtInsight(summary);
  if (!sentence) throw new Error("empty_debt_insight_response");

  await query(
    `INSERT INTO debt_insights (user_id, overdue_count, overdue_total, due_soon_count, due_soon_total, remaining_balance, sentence, generated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       overdue_count = EXCLUDED.overdue_count,
       overdue_total = EXCLUDED.overdue_total,
       due_soon_count = EXCLUDED.due_soon_count,
       due_soon_total = EXCLUDED.due_soon_total,
       remaining_balance = EXCLUDED.remaining_balance,
       sentence = EXCLUDED.sentence,
       generated_at = NOW()`,
    [
      userId,
      summary.overdueCount,
      summary.overdueTotal,
      summary.dueSoonCount,
      summary.dueSoonTotal,
      summary.remainingBalance,
      sentence,
    ],
  );
  return sentence;
}

function startGeneration(userId, summary) {
  const key = String(userId);

  const job = generateAndStore(userId, summary)
    .then((sentence) => {
      lastFailureAt.delete(key);
      return sentence;
    })
    .catch((error) => {
      lastFailureAt.set(key, Date.now());
      debtsLogger.error({ err: error, userId }, "debt_insight_generation_failed");
      return null;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, job);
  return job;
}

export async function getOrGenerateDebtInsight(userId, summary) {
  if (summary.remainingBalance <= 0) return null;

  const cached = await query(`SELECT * FROM debt_insights WHERE user_id = $1`, [userId]);
  const row = cached.rows[0];

  if (matchesCache(row, summary)) {
    return row.sentence;
  }

  const stale = row?.sentence ?? null;
  const key = String(userId);
  const failedAt = lastFailureAt.get(key);
  // Someone is already generating it, or it failed recently: don't wait, don't pile on.
  if (inFlight.has(key)) return stale;
  if (failedAt && Date.now() - failedAt < FAILURE_COOLDOWN_MS) return stale;

  const job = startGeneration(userId, summary);
  const waited = await Promise.race([
    job,
    new Promise((resolve) => setTimeout(() => resolve(null), WAIT_FOR_GENERATION_MS)),
  ]);
  return waited ?? stale;
}
