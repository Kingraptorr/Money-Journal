import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { emailAuthRouter } from "./routes/emailAuth.js";
import { telegramLoginRouter } from "./routes/telegramLogin.js";
import { purgeOldLoginArtifacts } from "../db/webLogin.js";
import { expensesRouter } from "./routes/expenses.js";
import { categoriesRouter } from "./routes/categories.js";
import { reportsRouter } from "./routes/reports.js";
import { currencyRouter } from "./routes/currency.js";
import { debtsRouter } from "./routes/debts.js";
import { requireAuth } from "./middleware/auth.js";
import { purgeOldSessions } from "./services/sessions.js";

const app = express();

const allowedOrigins = [process.env.WEB_APP_ORIGIN, ...String(process.env.CORS_EXTRA_ORIGINS ?? "").split(",")]
  .map((value) => value?.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/auth", emailAuthRouter);
app.use("/api/auth", telegramLoginRouter);
app.use("/api/expenses", requireAuth, expensesRouter);
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/reports", requireAuth, reportsRouter);
app.use("/api/currency", requireAuth, currencyRouter);
app.use("/api/debts", requireAuth, debtsRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.message === "invalid_month" ? 400 : 500).json({
    error: error.message === "invalid_month" ? "invalid_month" : "internal_error",
  });
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
app.listen(port, host, () => {
  console.log(`AI Money Journal API listening on ${host}:${port}`);
});

function purgeAuthData() {
  purgeOldSessions().catch((error) => console.error("Session purge failed:", error.message));
  purgeOldLoginArtifacts().catch((error) => console.error("Login artifact purge failed:", error.message));
}

purgeAuthData();
setInterval(purgeAuthData, 24 * 60 * 60 * 1000).unref();
