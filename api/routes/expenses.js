import { Router } from "express";
import jalaali from "jalaali-js";
import { query } from "../../db/index.js";

export const expensesRouter = Router();

function toIsoDate(value) {
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0];
}

function toJalali(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const { jy, jm, jd } = jalaali.toJalaali(y, m, d);
  return toPersianDigits(`${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`);
}

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

const VALID_CURRENCIES = new Set(["IRT", "IRR", "EUR", "USD", "GBP", "TRY"]);

async function isValidCategory(userId, category) {
  const result = await query(`SELECT 1 FROM categories WHERE user_id = $1 AND key = $2`, [userId, category]);
  return result.rowCount > 0;
}

function normalizeDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function parseExpenseDate(value) {
  const normalized = normalizeDigits(value).trim();
  const isoMatch = normalized.match(/^(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const jalaliMatch = normalized.match(/^(13\d{2}|14\d{2})[/-](0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])$/);
  if (!jalaliMatch) throw new Error("invalid_date");

  const [, jyRaw, jmRaw, jdRaw] = jalaliMatch;
  const jy = Number(jyRaw);
  const jm = Number(jmRaw);
  const jd = Number(jdRaw);
  if (!jalaali.isValidJalaaliDate(jy, jm, jd)) throw new Error("invalid_date");

  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

function jalaliMonthRange(month) {
  const [jy, jm] = month.split("-").map(Number);
  if (!jy || !jm || jm < 1 || jm > 12) {
    throw new Error("invalid_month");
  }

  const start = jalaali.toGregorian(jy, jm, 1);
  const nextJm = jm === 12 ? 1 : jm + 1;
  const nextJy = jm === 12 ? jy + 1 : jy;
  const end = jalaali.toGregorian(nextJy, nextJm, 1);
  const pad = (n) => String(n).padStart(2, "0");

  return {
    start: `${start.gy}-${pad(start.gm)}-${pad(start.gd)}`,
    end: `${end.gy}-${pad(end.gm)}-${pad(end.gd)}`,
  };
}

function normalizeExpense(row) {
  const isoDate = toIsoDate(row.expense_date);
  return {
    ...row,
    amount: Number(row.amount),
    expense_date: isoDate,
    expense_date_jalali: toJalali(isoDate),
  };
}

expensesRouter.get("/summary", async (req, res, next) => {
  try {
    const { start, end } = jalaliMonthRange(req.query.month);
    const totalResult = await query(
      `SELECT COALESCE(SUM(amount), 0)::float AS total
       FROM expenses
       WHERE user_id = $1 AND deleted_at IS NULL
         AND expense_date >= $2 AND expense_date < $3`,
      [req.user.id, start, end],
    );
    const categoryResult = await query(
      `SELECT category, SUM(amount)::float AS total
       FROM expenses
       WHERE user_id = $1 AND deleted_at IS NULL
         AND expense_date >= $2 AND expense_date < $3
       GROUP BY category
       ORDER BY total DESC`,
      [req.user.id, start, end],
    );
    res.json({
      month: req.query.month,
      total: totalResult.rows[0].total,
      categories: categoryResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/history", async (req, res, next) => {
  try {
    const { start, end } = jalaliMonthRange(req.query.month);
    const category = req.query.category;
    const params = [req.user.id, start, end];
    const categoryClause = category ? "AND category = $4" : "";
    if (category) params.push(category);

    const result = await query(
      `SELECT id, amount, currency, category, merchant, note, expense_date, created_at
       FROM expenses
       WHERE user_id = $1 AND deleted_at IS NULL
         AND expense_date >= $2 AND expense_date < $3
         ${categoryClause}
       ORDER BY expense_date DESC, created_at DESC`,
      params,
    );
    res.json({ expenses: result.rows.map(normalizeExpense) });
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/chart", async (req, res, next) => {
  try {
    const { start, end } = jalaliMonthRange(req.query.month);
    const result = await query(
      `SELECT category, SUM(amount)::float AS total
       FROM expenses
       WHERE user_id = $1 AND deleted_at IS NULL
         AND expense_date >= $2 AND expense_date < $3
       GROUP BY category
       ORDER BY total DESC`,
      [req.user.id, start, end],
    );
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

expensesRouter.post("/", async (req, res, next) => {
  try {
    const amount = Number(normalizeDigits(req.body.amount).replace(/[,٬]/g, ""));
    const currency = String(req.body.currency ?? "IRT").trim().toUpperCase();
    const category = String(req.body.category ?? "").trim();
    const note = String(req.body.note ?? "").trim();
    const merchant = req.body.merchant ? String(req.body.merchant).trim() : null;
    const expenseDate = parseExpenseDate(req.body.expense_date);

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "invalid_amount" });
      return;
    }

    if (!VALID_CURRENCIES.has(currency)) {
      res.status(400).json({ error: "invalid_currency" });
      return;
    }

    if (!(await isValidCategory(req.user.id, category))) {
      res.status(400).json({ error: "invalid_category" });
      return;
    }

    if (!note) {
      res.status(400).json({ error: "invalid_note" });
      return;
    }

    const result = await query(
      `INSERT INTO expenses (user_id, amount, currency, category, merchant, note, expense_date, raw_input)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, amount, currency, category, merchant, note, expense_date, created_at`,
      [req.user.id, amount, currency, category, merchant, note, expenseDate, "mini_app_manual_entry"],
    );

    res.status(201).json({ expense: normalizeExpense(result.rows[0]) });
  } catch (error) {
    if (error.message === "invalid_date") {
      res.status(400).json({ error: "invalid_date" });
      return;
    }

    next(error);
  }
});

expensesRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE expenses
       SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

expensesRouter.patch("/:id", async (req, res, next) => {
  try {
    const amount = Number(normalizeDigits(req.body.amount).replace(/[,٬]/g, ""));
    const currency = String(req.body.currency ?? "IRT").trim().toUpperCase();
    const category = String(req.body.category ?? "").trim();
    const note = String(req.body.note ?? "").trim();
    const merchant = req.body.merchant ? String(req.body.merchant).trim() : null;
    const expenseDate = parseExpenseDate(req.body.expense_date);

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "invalid_amount" });
      return;
    }

    if (!VALID_CURRENCIES.has(currency)) {
      res.status(400).json({ error: "invalid_currency" });
      return;
    }

    if (!(await isValidCategory(req.user.id, category))) {
      res.status(400).json({ error: "invalid_category" });
      return;
    }

    if (!note) {
      res.status(400).json({ error: "invalid_note" });
      return;
    }

    const result = await query(
      `UPDATE expenses
       SET amount = $1,
           currency = $2,
           category = $3,
           merchant = $4,
           note = $5,
           expense_date = $6
       WHERE id = $7 AND user_id = $8 AND deleted_at IS NULL
       RETURNING id, amount, currency, category, merchant, note, expense_date, created_at`,
      [amount, currency, category, merchant, note, expenseDate, req.params.id, req.user.id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json({ expense: normalizeExpense(result.rows[0]) });
  } catch (error) {
    if (error.message === "invalid_date") {
      res.status(400).json({ error: "invalid_date" });
      return;
    }

    next(error);
  }
});
