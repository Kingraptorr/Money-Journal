import { Router } from "express";
import { query } from "../../db/index.js";

export const currencyRouter = Router();

currencyRouter.get("/rates", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT code, name_fa, category, sell, buy, change, updated_at
       FROM currency_rates
       ORDER BY sort_order ASC`,
    );
    const rates = result.rows.map((row) => ({
      code: row.code,
      name: row.name_fa,
      category: row.category,
      sell: row.sell === null ? null : Number(row.sell),
      buy: row.buy === null ? null : Number(row.buy),
      change: row.change === null ? null : Number(row.change),
      updatedAt: row.updated_at,
    }));
    const updatedAt = rates.reduce((latest, rate) => {
      if (!rate.updatedAt) return latest;
      return !latest || rate.updatedAt > latest ? rate.updatedAt : latest;
    }, null);

    res.json({ rates, updatedAt });
  } catch (error) {
    next(error);
  }
});
