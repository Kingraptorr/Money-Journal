import { getUserState, clearUserState, setUserState } from "../services/state.js";
import { query } from "../../db/index.js";

export async function handleCallback(ctx) {
  const userId = ctx.from.id;
  const data = ctx.callbackQuery.data;
  const current = getUserState(userId);

  if (data === "expense:edit") {
    if (current.state !== "awaiting_confirmation" || !current.payload?.expense) {
      await ctx.answerCallbackQuery({ text: "این درخواست منقضی شده." });
      return;
    }

    setUserState(userId, "awaiting_edit", { expense: current.payload.expense });
    await ctx.answerCallbackQuery();
    await ctx.reply("باشه، فقط نام خرج، مبلغ، یا هر دو رو دوباره بنویس:");
    return;
  }

  if (data === "expense:confirm") {
    if (current.state !== "awaiting_confirmation" || !current.payload?.expense) {
      await ctx.answerCallbackQuery({ text: "این درخواست منقضی شده." });
      return;
    }

    const expense = current.payload.expense;
    await query(
      `INSERT INTO expenses
       (user_id, amount, currency, category, merchant, note, expense_date, raw_input, gemini_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        expense.amount,
        expense.currency,
        expense.category,
        expense.merchant,
        expense.note,
        expense.date,
        expense.raw_input,
        JSON.stringify(expense.gemini_response),
      ],
    );

    clearUserState(userId);
    await ctx.answerCallbackQuery();
    await ctx.reply("✅ ثبت شد!");
    return;
  }

  if (data === "delete:no") {
    clearUserState(userId);
    await ctx.answerCallbackQuery();
    await ctx.reply("باشه، لغو شد.");
    return;
  }

  if (data.startsWith("delete:pick:")) {
    const expenseId = data.replace("delete:pick:", "");
    const result = await query(
      `UPDATE expenses
       SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [expenseId, userId],
    );

    clearUserState(userId);
    await ctx.answerCallbackQuery();
    await ctx.reply(result.rowCount ? "🗑 حذف شد." : "این رکورد پیدا نشد یا قبلاً حذف شده.");
    return;
  }

  if (data.startsWith("delete:yes")) {
    const callbackExpenseId = data.startsWith("delete:yes:")
      ? data.replace("delete:yes:", "")
      : current.payload?.expenseId;

    if (!callbackExpenseId) {
      await ctx.answerCallbackQuery({ text: "این درخواست منقضی شده." });
      return;
    }

    const result = await query(
      `UPDATE expenses
       SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [callbackExpenseId, userId],
    );
    clearUserState(userId);
    await ctx.answerCallbackQuery();
    await ctx.reply(result.rowCount ? "🗑 حذف شد." : "این رکورد پیدا نشد یا قبلاً حذف شده.");
  }
}
