import { query } from "../../db/index.js";
import { CATEGORY_LABELS_FA } from "../utils/categories.js";

// Gemini picks the category fresh on every message, so the same text can land in different
// categories on different days. A person's own history is the better signal: if they have
// repeatedly saved this same expense name (or merchant) under one category, use that.
const HISTORY_ROWS = 400;
const RECENT_MATCHES = 5; // only the latest matching expenses vote, so a deliberate change of habit wins over time
const MIN_MATCHES = 2;
const MIN_AGREEMENT = 0.75;
const KEEP_AS_IS = new Set(["coffee", "nastaran"]); // already decided by hard keyword rules

export function nameKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‏‎]/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pure decision: `categories` are the categories of past matching expenses, newest first.
export function decideLearnedCategory(categories) {
  const voters = categories.slice(0, RECENT_MATCHES);
  if (voters.length < MIN_MATCHES) return null;

  const tally = new Map();
  for (const category of voters) tally.set(category, (tally.get(category) ?? 0) + 1);
  const [top, count] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return count / voters.length >= MIN_AGREEMENT ? top : null;
}

export async function applyLearnedCategory(accountId, expense) {
  try {
    if (!expense || KEEP_AS_IS.has(expense.category)) return expense;

    const noteKey = nameKey(expense.note);
    const merchantKey = nameKey(expense.merchant);
    if (!noteKey && merchantKey.length < 3) return expense;

    const history = await query(
      `SELECT category, note, merchant FROM expenses
       WHERE user_id = $1 AND deleted_at IS NULL AND category IS NOT NULL
       ORDER BY created_at DESC LIMIT $2`,
      [accountId, HISTORY_ROWS],
    );

    const matched = history.rows
      .filter((row) => {
        if (noteKey && nameKey(row.note) === noteKey) return true;
        return merchantKey.length >= 3 && nameKey(row.merchant) === merchantKey;
      })
      .map((row) => row.category);

    const learned = decideLearnedCategory(matched);
    if (!learned || learned === expense.category) return expense;
    if (!Object.hasOwn(CATEGORY_LABELS_FA, learned)) return expense; // custom categories can't be shown in the bot yet

    const stillExists = await query(`SELECT 1 FROM categories WHERE user_id = $1 AND key = $2`, [accountId, learned]);
    if (stillExists.rowCount === 0) return expense;

    console.log(`[learned-category] ${expense.category} -> ${learned} (from ${Math.min(matched.length, RECENT_MATCHES)} past matches)`);
    return {
      ...expense,
      category: learned,
      gemini_response: {
        ...(expense.gemini_response ?? {}),
        category_override: { from: expense.category, to: learned, source: "history" },
      },
    };
  } catch (error) {
    console.error("Learned category lookup failed:", error.message);
    return expense;
  }
}
