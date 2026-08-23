import { Router } from "express";
import { query } from "../../db/index.js";
import { createDebtPlan, maybeFlipDebtStatus, validateDebtPlanInput } from "../services/debts.js";
import { debtsLogger } from "../services/debtsLogger.js";

export const debtsRouter = Router();

function toIsoDate(value) {
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0];
}

function normalizePlanRow(row, installmentRows) {
  const paidCount = installmentRows.filter((i) => i.paid_at).length;
  const unpaid = installmentRows.filter((i) => !i.paid_at).sort((a, b) => a.seq - b.seq);
  const remainingBalance = unpaid.reduce((sum, i) => sum + Number(i.amount), 0);
  return {
    id: row.id,
    name: row.name,
    total_amount: Number(row.total_amount),
    currency: row.currency,
    installment_count: row.installment_count,
    start_date: toIsoDate(row.start_date),
    note: row.note,
    status: row.status,
    paidCount,
    remainingBalance,
    nextDueInstallment: unpaid.length
      ? { dueDate: toIsoDate(unpaid[0].due_date), amount: Number(unpaid[0].amount) }
      : null,
  };
}

debtsRouter.get("/", async (req, res, next) => {
  try {
    const status = ["active", "completed", "all"].includes(req.query.status) ? req.query.status : "active";
    const statusClause = status === "all" ? "" : "AND d.status = $2";
    const params = status === "all" ? [req.user.id] : [req.user.id, status];

    const debtsResult = await query(
      `SELECT * FROM debts d WHERE d.user_id = $1 AND d.deleted_at IS NULL ${statusClause} ORDER BY d.created_at DESC`,
      params,
    );
    const debtIds = debtsResult.rows.map((r) => r.id);
    const installmentsResult = debtIds.length
      ? await query(`SELECT * FROM debt_installments WHERE debt_id = ANY($1::uuid[]) ORDER BY seq ASC`, [debtIds])
      : { rows: [] };

    const plans = debtsResult.rows.map((row) =>
      normalizePlanRow(row, installmentsResult.rows.filter((i) => i.debt_id === row.id)),
    );
    res.json({ debts: plans });
  } catch (error) {
    debtsLogger.error({ err: error }, "debt_route_error");
    next(error);
  }
});

debtsRouter.get("/summary", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT di.amount, di.due_date
       FROM debt_installments di
       JOIN debts d ON d.id = di.debt_id
       WHERE d.user_id = $1 AND d.deleted_at IS NULL AND d.status = 'active' AND di.paid_at IS NULL`,
      [req.user.id],
    );
    const todayResult = await query(`SELECT (NOW() AT TIME ZONE 'Asia/Tehran')::date AS today`);
    const today = todayResult.rows[0].today;
    const inSevenDays = new Date(today);
    inSevenDays.setDate(inSevenDays.getDate() + 7);

    let overdueCount = 0;
    let overdueTotal = 0;
    let dueSoonCount = 0;
    let dueSoonTotal = 0;
    let remainingBalance = 0;
    for (const row of result.rows) {
      const amount = Number(row.amount);
      remainingBalance += amount;
      const due = new Date(row.due_date);
      if (due < today) {
        overdueCount += 1;
        overdueTotal += amount;
      } else if (due <= inSevenDays) {
        dueSoonCount += 1;
        dueSoonTotal += amount;
      }
    }

    const summary = { overdueCount, overdueTotal, dueSoonCount, dueSoonTotal, remainingBalance };
    debtsLogger.debug({ userId: req.user.id, ...summary }, "debt_summary_computed");
    res.json(summary);
  } catch (error) {
    debtsLogger.error({ err: error }, "debt_route_error");
    next(error);
  }
});

debtsRouter.get("/:id", async (req, res, next) => {
  try {
    const debtResult = await query(
      `SELECT * FROM debts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.user.id],
    );
    if (!debtResult.rowCount) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const installmentsResult = await query(
      `SELECT * FROM debt_installments WHERE debt_id = $1 ORDER BY seq ASC`,
      [req.params.id],
    );
    const plan = normalizePlanRow(debtResult.rows[0], installmentsResult.rows);
    plan.installments = installmentsResult.rows.map((i) => ({
      seq: i.seq,
      dueDate: toIsoDate(i.due_date),
      amount: Number(i.amount),
      paidAt: i.paid_at,
    }));
    res.json({ debt: plan });
  } catch (error) {
    debtsLogger.error({ err: error }, "debt_route_error");
    next(error);
  }
});

debtsRouter.post("/", async (req, res, next) => {
  try {
    const { name, total_amount, currency, installment_count, start_date, note } = req.body;
    const errors = validateDebtPlanInput({ name, total_amount, installment_count, start_date });
    if (errors.length) {
      res.status(400).json({ error: errors[0] });
      return;
    }

    const plan = await createDebtPlan(req.user.id, {
      name,
      total_amount: Number(total_amount),
      currency: currency || "IRT",
      installment_count: Number(installment_count),
      start_date,
      note: note || null,
    });
    res.status(201).json({ debt: plan });
  } catch (error) {
    if (error.status === 400) {
      res.status(400).json({ error: error.message });
      return;
    }
    debtsLogger.error({ err: error }, "debt_route_error");
    next(error);
  }
});

debtsRouter.patch("/:id", async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "invalid_name" });
      return;
    }
    const note = req.body.note ? String(req.body.note).trim() : null;

    const result = await query(
      `UPDATE debts SET name = $1, note = $2
       WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
       RETURNING id, name, note`,
      [name, note, req.params.id, req.user.id],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ debt: result.rows[0] });
  } catch (error) {
    debtsLogger.error({ err: error }, "debt_route_error");
    next(error);
  }
});

debtsRouter.delete("/:id", async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE debts SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id`,
      [req.params.id, req.user.id],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    debtsLogger.info({ userId: req.user.id, debtId: req.params.id }, "debt_plan_deleted");
    res.json({ ok: true });
  } catch (error) {
    debtsLogger.error({ err: error }, "debt_route_error");
    next(error);
  }
});

debtsRouter.post("/:id/installments/:seq/pay", async (req, res, next) => {
  try {
    const owns = await query(
      `SELECT id FROM debts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.user.id],
    );
    if (!owns.rowCount) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const result = await query(
      `UPDATE debt_installments SET paid_at = NOW()
       WHERE debt_id = $1 AND seq = $2 AND paid_at IS NULL
       RETURNING id, amount`,
      [req.params.id, req.params.seq],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    await maybeFlipDebtStatus(req.params.id);
    debtsLogger.info(
      { userId: req.user.id, debtId: req.params.id, seq: req.params.seq, amount: result.rows[0].amount },
      "debt_installment_paid",
    );
    res.json({ ok: true });
  } catch (error) {
    debtsLogger.error({ err: error }, "debt_route_error");
    next(error);
  }
});

debtsRouter.post("/:id/installments/:seq/unpay", async (req, res, next) => {
  try {
    const owns = await query(
      `SELECT id FROM debts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.user.id],
    );
    if (!owns.rowCount) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const result = await query(
      `UPDATE debt_installments SET paid_at = NULL
       WHERE debt_id = $1 AND seq = $2 AND paid_at IS NOT NULL
       RETURNING id`,
      [req.params.id, req.params.seq],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    await maybeFlipDebtStatus(req.params.id);
    debtsLogger.info({ userId: req.user.id, debtId: req.params.id, seq: req.params.seq }, "debt_installment_unpaid");
    res.json({ ok: true });
  } catch (error) {
    debtsLogger.error({ err: error }, "debt_route_error");
    next(error);
  }
});
