import { query } from "../../db/index.js";
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
