import pino from "pino";

export const debtsLogger = pino({
  level: process.env.DEBTS_LOG_LEVEL || "info",
});
