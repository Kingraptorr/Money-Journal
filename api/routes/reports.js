import { Router } from "express";
import { query } from "../../db/index.js";
import { generateMonthlyReport } from "../services/gemini.js";
import { jalaliMonthRange } from "./expenses.js";

export const reportsRouter = Router();

const MIN_DAYS_INTO_MONTH = 10;
const COOLDOWN_DAYS = 3;
const MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function tehranToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(month || "");
}

function jalaliMonthLabel(month) {
  const [jy, jm] = month.split("-").map(Number);
  return `${MONTHS[jm - 1]} ${jy.toLocaleString("fa-IR", { useGrouping: false })}`;
}

function shiftMonthParam(month, delta) {
  const [jy, jm] = month.split("-").map(Number);
  let ny = jy;
  let nm = jm + delta;
  while (nm < 1) {
    nm += 12;
    ny -= 1;
  }
  while (nm > 12) {
    nm -= 12;
    ny += 1;
  }
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function daysIntoMonth(month) {
  const { start } = jalaliMonthRange(month);
  const startDate = new Date(`${start}T00:00:00Z`);
  const today = tehranToday();
  return Math.round((today.getTime() - startDate.getTime()) / 86400000) + 1;
}

async function checkSummaryEligibility(userId, month) {
  const days = daysIntoMonth(month);
  if (days < MIN_DAYS_INTO_MONTH) {
    const { start } = jalaliMonthRange(month);
    const eligibleAt = new Date(`${start}T00:00:00Z`);
    eligibleAt.setUTCDate(eligibleAt.getUTCDate() + (MIN_DAYS_INTO_MONTH - 1));
    return { eligible: false, reason: "too_early_in_month", eligibleAt: eligibleAt.toISOString() };
  }

  if (process.env.DISABLE_REPORT_COOLDOWN === "true") {
    return { eligible: true, reason: "ok", eligibleAt: null };
  }

  const last = await query(
    `SELECT created_at FROM ai_reports WHERE user_id = $1 AND kind = 'summary' ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  if (last.rowCount > 0) {
    const lastAt = new Date(last.rows[0].created_at);
    const eligibleAt = new Date(lastAt.getTime() + COOLDOWN_DAYS * 86400000);
    if (eligibleAt.getTime() > Date.now()) {
      return { eligible: false, reason: "cooldown", eligibleAt: eligibleAt.toISOString() };
    }
  }

  return { eligible: true, reason: "ok", eligibleAt: null };
}

async function fetchCategoryBreakdown(userId, month) {
  const { start, end } = jalaliMonthRange(month);
  const totals = await query(
    `SELECT category, SUM(amount)::float AS total
     FROM expenses
     WHERE user_id = $1 AND deleted_at IS NULL AND expense_date >= $2 AND expense_date < $3
     GROUP BY category ORDER BY total DESC`,
    [userId, start, end],
  );
  const labels = await query(`SELECT key, label FROM categories WHERE user_id = $1`, [userId]);
  const labelMap = new Map(labels.rows.map((row) => [row.key, row.label]));
  const categories = totals.rows.map((row) => ({
    key: row.category,
    label: labelMap.get(row.category) || row.category,
    total: row.total,
  }));
  const total = categories.reduce((sum, category) => sum + category.total, 0);
  return { categories, total };
}

reportsRouter.get("/status", async (req, res, next) => {
  try {
    const month = req.query.month;
    if (!isValidMonth(month)) throw new Error("invalid_month");
    const status = await checkSummaryEligibility(req.user.id, month);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/history", async (req, res, next) => {
  try {
    const month = req.query.month;
    if (!isValidMonth(month)) throw new Error("invalid_month");
    const result = await query(
      `SELECT kind, content, has_data, created_at
       FROM ai_reports
       WHERE user_id = $1 AND month = $2
       ORDER BY created_at ASC`,
      [req.user.id, month],
    );
    res.json({ reports: result.rows });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post("/generate", async (req, res, next) => {
  try {
    const month = req.body.month;
    const kind = req.body.kind === "deeper" ? "deeper" : "summary";
    if (!isValidMonth(month)) throw new Error("invalid_month");

    if (kind === "summary") {
      const status = await checkSummaryEligibility(req.user.id, month);
      if (!status.eligible) {
        res.status(403).json({ error: status.reason, eligibleAt: status.eligibleAt });
        return;
      }

      const { categories, total } = await fetchCategoryBreakdown(req.user.id, month);
      const monthLabel = jalaliMonthLabel(month);
      const hasData = categories.length > 0;
      const text = hasData
        ? await generateMonthlyReport({ kind: "summary", monthLabel, total, categories })
        : `این ماه (${monthLabel}) هنوز خرجی ثبت نکردی، پس چیزی برای تحلیل نیست. یه خرج ثبت کن و دوباره امتحان کن!`;

      await query(
        `INSERT INTO ai_reports (user_id, month, kind, content, has_data) VALUES ($1, $2, 'summary', $3, $4)`,
        [req.user.id, month, text, hasData],
      );
      res.json({ text, hasData });
      return;
    }

    const lastSummary = await query(
      `SELECT created_at, has_data FROM ai_reports
       WHERE user_id = $1 AND month = $2 AND kind = 'summary'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, month],
    );
    if (lastSummary.rowCount === 0 || !lastSummary.rows[0].has_data) {
      res.status(403).json({ error: "no_summary" });
      return;
    }

    const usedDeeper = await query(
      `SELECT 1 FROM ai_reports
       WHERE user_id = $1 AND month = $2 AND kind = 'deeper' AND created_at > $3
       LIMIT 1`,
      [req.user.id, month, lastSummary.rows[0].created_at],
    );
    if (usedDeeper.rowCount > 0) {
      res.status(403).json({ error: "already_used" });
      return;
    }

    const prevMonth = shiftMonthParam(month, -1);
    const [current, previous] = await Promise.all([
      fetchCategoryBreakdown(req.user.id, month),
      fetchCategoryBreakdown(req.user.id, prevMonth),
    ]);

    const text = await generateMonthlyReport({
      kind: "deeper",
      monthLabel: jalaliMonthLabel(month),
      total: current.total,
      categories: current.categories,
      prevMonthLabel: jalaliMonthLabel(prevMonth),
      prevTotal: previous.total,
      prevCategories: previous.categories,
    });

    await query(
      `INSERT INTO ai_reports (user_id, month, kind, content, has_data) VALUES ($1, $2, 'deeper', $3, true)`,
      [req.user.id, month, text],
    );
    res.json({ text, hasData: true });
  } catch (error) {
    next(error);
  }
});
