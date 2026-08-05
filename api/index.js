import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { expensesRouter } from "./routes/expenses.js";
import { categoriesRouter } from "./routes/categories.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/expenses", requireAuth, expensesRouter);
app.use("/api/categories", requireAuth, categoriesRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.message === "invalid_month" ? 400 : 500).json({
    error: error.message === "invalid_month" ? "invalid_month" : "internal_error",
  });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`AI Money Journal API listening on ${port}`);
});
