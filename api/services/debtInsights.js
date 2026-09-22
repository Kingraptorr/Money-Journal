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

export async function getOrGenerateDebtInsight(userId, summary) {
  if (summary.remainingBalance <= 0) return null;

  const cached = await query(`SELECT * FROM debt_insights WHERE user_id = $1`, [userId]);
  const row = cached.rows[0];

  if (matchesCache(row, summary)) {
    return row.sentence;
  }

  let sentence;
  try {
    sentence = await generateDebtInsight(summary);
    if (!sentence) throw new Error("empty_debt_insight_response");
  } catch (error) {
    debtsLogger.error({ err: error, userId }, "debt_insight_generation_failed");
    return row?.sentence ?? null;
  }

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
