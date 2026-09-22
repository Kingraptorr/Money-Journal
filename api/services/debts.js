import { pool, query } from "../../db/index.js";
import { addJalaliMonths } from "../utils/jalaliDate.js";
import { debtsLogger } from "./debtsLogger.js";

function toIsoDate(value) {
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0];
}

export function validateDebtPlanInput({ name, total_amount, installment_count, start_date }) {
  const errors = [];
  if (!String(name ?? "").trim()) errors.push("invalid_name");
  const amount = Number(total_amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push("invalid_amount");
  const count = Number(installment_count);
  if (!Number.isInteger(count) || count <= 0) errors.push("invalid_installment_count");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(start_date ?? ""))) errors.push("invalid_start_date");
  return errors;
}

function computeInstallments({ total_amount, installment_count, start_date }) {
  const totalCents = Math.round(Number(total_amount) * 100);
  const perCents = Math.floor(totalCents / installment_count);
  const installments = [];
  let runningCents = 0;

  for (let seq = 1; seq <= installment_count; seq += 1) {
    const isLast = seq === installment_count;
    const cents = isLast ? totalCents - runningCents : perCents;
    runningCents += cents;
    installments.push({
      seq,
      due_date: addJalaliMonths(start_date, seq - 1),
      amount: (cents / 100).toFixed(2),
    });
  }
  return installments;
}

export async function createDebtPlan(userId, { name, total_amount, currency, installment_count, start_date, note }) {
  const errors = validateDebtPlanInput({ name, total_amount, installment_count, start_date });
  if (errors.length) {
    debtsLogger.warn({ userId, errors }, "debt_validation_rejected");
    const error = new Error(errors[0]);
    error.status = 400;
    throw error;
  }

  const installments = computeInstallments({ total_amount, installment_count, start_date });
  const equalShare = Number(total_amount) / installment_count;
  if (Math.abs(Number(installments[installments.length - 1].amount) - equalShare) > 0.0001) {
    debtsLogger.debug({ userId, installments }, "debt_installments_generated");
  }

  const debtResult = await query(
    `INSERT INTO debts (user_id, name, total_amount, currency, installment_count, start_date, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, total_amount, currency, installment_count, start_date, note, status, created_at`,
    [userId, String(name).trim(), total_amount, currency || "IRT", installment_count, start_date, note || null],
  );
  const debt = { ...debtResult.rows[0], start_date: toIsoDate(debtResult.rows[0].start_date) };

  const values = [];
  const params = [];
  installments.forEach((inst, index) => {
    const offset = index * 4;
    values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
    params.push(debt.id, inst.seq, inst.due_date, inst.amount);
  });
  await query(
    `INSERT INTO debt_installments (debt_id, seq, due_date, amount) VALUES ${values.join(", ")}`,
    params,
  );

  debtsLogger.info(
    { userId, debtId: debt.id, totalAmount: total_amount, installmentCount: installment_count },
    "debt_plan_created",
  );
  return { ...debt, installments };
}

export async function updateDebtPlan(userId, debtId, patch) {
  const debtResult = await query(`SELECT * FROM debts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, [
    debtId,
    userId,
  ]);
  if (!debtResult.rowCount) {
    const error = new Error("not_found");
    error.status = 404;
    throw error;
  }
  const debt = debtResult.rows[0];

  const name = patch.name !== undefined ? String(patch.name ?? "").trim() : debt.name;
  if (!name) {
    const error = new Error("invalid_name");
    error.status = 400;
    throw error;
  }
  const note = patch.note !== undefined ? String(patch.note ?? "").trim() || null : debt.note;

  const wantsStructuralChange =
    patch.total_amount !== undefined || patch.installment_count !== undefined || patch.start_date !== undefined;

  if (!wantsStructuralChange) {
    await query(`UPDATE debts SET name = $1, note = $2 WHERE id = $3`, [name, note, debtId]);
    debtsLogger.info({ userId, debtId }, "debt_plan_updated");
    return;
  }

  const paidResult = await query(
    `SELECT COUNT(*) FILTER (WHERE paid_at IS NOT NULL) AS paid FROM debt_installments WHERE debt_id = $1`,
    [debtId],
  );
  if (Number(paidResult.rows[0].paid) > 0) {
    debtsLogger.warn({ userId, debtId }, "debt_update_blocked_paid_installments");
    const error = new Error("debt_has_paid_installments");
    error.status = 400;
    throw error;
  }

  const total_amount = patch.total_amount !== undefined ? Number(patch.total_amount) : Number(debt.total_amount);
  const installment_count =
    patch.installment_count !== undefined ? Number(patch.installment_count) : debt.installment_count;
  const start_date = patch.start_date !== undefined ? patch.start_date : toIsoDate(debt.start_date);

  const errors = validateDebtPlanInput({ name, total_amount, installment_count, start_date });
  if (errors.length) {
    debtsLogger.warn({ userId, debtId, errors }, "debt_update_validation_rejected");
    const error = new Error(errors[0]);
    error.status = 400;
    throw error;
  }

  const installments = computeInstallments({ total_amount, installment_count, start_date });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE debts SET name = $1, note = $2, total_amount = $3, installment_count = $4, start_date = $5
       WHERE id = $6`,
      [name, note, total_amount, installment_count, start_date, debtId],
    );
    await client.query(`DELETE FROM debt_installments WHERE debt_id = $1`, [debtId]);

    const values = [];
    const params = [];
    installments.forEach((inst, index) => {
      const offset = index * 4;
      values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
      params.push(debtId, inst.seq, inst.due_date, inst.amount);
    });
    await client.query(
      `INSERT INTO debt_installments (debt_id, seq, due_date, amount) VALUES ${values.join(", ")}`,
      params,
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  debtsLogger.info(
    { userId, debtId, totalAmount: total_amount, installmentCount: installment_count },
    "debt_plan_updated",
  );
}

export async function maybeFlipDebtStatus(debtId) {
  const result = await query(
    `SELECT COUNT(*) FILTER (WHERE paid_at IS NULL) AS unpaid, d.status
     FROM debt_installments di JOIN debts d ON d.id = di.debt_id
     WHERE di.debt_id = $1 GROUP BY d.status`,
    [debtId],
  );
  if (!result.rowCount) return;
  const { unpaid, status } = result.rows[0];
  if (Number(unpaid) === 0 && status !== "completed") {
    await query(`UPDATE debts SET status = 'completed' WHERE id = $1`, [debtId]);
    debtsLogger.info({ debtId }, "debt_plan_completed");
  } else if (Number(unpaid) > 0 && status === "completed") {
    await query(`UPDATE debts SET status = 'active' WHERE id = $1`, [debtId]);
  }
}
