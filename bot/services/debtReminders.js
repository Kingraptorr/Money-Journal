import { query } from "../../db/index.js";
import { formatAmount } from "../utils/format.js";

const DUE_SOON_OFFSETS = [0, 1, 3];

function overdueSentence(row) {
  const days = Number(-row.days_until_due).toLocaleString("fa-IR");
  return `قسط «${row.name}» به مبلغ ${formatAmount(row.amount, row.currency)} ${days} روزه که از موعدش گذشته، بهتره هر چه زودتر تسویه‌اش کنی.`;
}

function dueSoonSentence(row) {
  const timeText =
    row.days_until_due === 0
      ? "امروز"
      : row.days_until_due === 1
        ? "فردا"
        : `${Number(row.days_until_due).toLocaleString("fa-IR")} روز دیگه`;
  return `قسط «${row.name}» به مبلغ ${formatAmount(row.amount, row.currency)} هم ${timeText} سررسیدشه.`;
}

function buildMessage(rows) {
  const overdue = rows.filter((row) => row.days_until_due < 0);
  const dueSoon = rows.filter((row) => row.days_until_due >= 0);

  const lines = [
    "سلام! یه یادآوری کوچولو در مورد اقساطت دارم 🙂",
    ...overdue.map(overdueSentence),
    ...dueSoon.map(dueSoonSentence),
  ];

  return lines.join("\n\n");
}

export async function sendDebtReminders(bot) {
  const result = await query(
    `SELECT d.user_id, d.name, d.currency, di.amount,
            (di.due_date - (NOW() AT TIME ZONE 'Asia/Tehran')::date) AS days_until_due
     FROM debt_installments di
     JOIN debts d ON d.id = di.debt_id
     WHERE d.deleted_at IS NULL
       AND d.status = 'active'
       AND di.paid_at IS NULL
       AND (
         (di.due_date - (NOW() AT TIME ZONE 'Asia/Tehran')::date) = ANY($1::int[])
         OR di.due_date < (NOW() AT TIME ZONE 'Asia/Tehran')::date
       )
     ORDER BY d.user_id, di.due_date ASC`,
    [DUE_SOON_OFFSETS],
  );

  const rowsByUser = new Map();
  for (const row of result.rows) {
    const list = rowsByUser.get(row.user_id) ?? [];
    list.push({ ...row, days_until_due: Number(row.days_until_due), amount: Number(row.amount) });
    rowsByUser.set(row.user_id, list);
  }

  const outcomes = await Promise.allSettled(
    Array.from(rowsByUser.entries()).map(([userId, rows]) => bot.api.sendMessage(userId, buildMessage(rows))),
  );

  outcomes.forEach((outcome, index) => {
    if (outcome.status === "rejected") {
      const userId = Array.from(rowsByUser.keys())[index];
      console.error(`Debt reminder failed for user ${userId}:`, outcome.reason?.message ?? outcome.reason);
    }
  });

  return rowsByUser.size;
}
