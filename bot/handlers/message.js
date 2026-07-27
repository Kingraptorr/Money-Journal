import { InlineKeyboard } from "grammy";
import { upsertUser, query } from "../../db/index.js";
import { extractExpense } from "../services/gemini.js";
import { clearUserState, getUserState, setUserState } from "../services/state.js";
import { buildConfirmationText, buildDeleteConfirmationText } from "../utils/format.js";
import { CATEGORY_LABELS_FA } from "../utils/categories.js";

const DELETE_STOPWORDS = [
  "اون",
  "این",
  "رو",
  "را",
  "حذف",
  "پاک",
  "کن",
  "کردن",
  "آخرین",
  "رکورد",
  "خرج",
  "خرید",
  "امروز",
  "دیروز",
  "پریروز",
];

function tokenizeDeletionHint(hint = "") {
  return hint
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !DELETE_STOPWORDS.includes(token));
}

function expenseListLabel(expense, index) {
  const name = expense.note || expense.merchant || CATEGORY_LABELS_FA[expense.category] || "خرج";
  return `${index + 1}. ${name} · ${Number(expense.amount).toLocaleString("fa-IR")} ${expense.currency === "IRT" ? "تومان" : expense.currency}`;
}

function meaningfulNameFromText(text) {
  return String(text ?? "")
    .replace(/[۰-۹٠-٩\d.,٬]+/g, "")
    .replace(/\b(تومن|تومان|ریال|هزار|میلیون|ملیون|دلار|یورو|پوند|لیر)\b/g, "")
    .replace(/\b(دادم|خریدم|پرداخت کردم|خرج کردم|شد|بود)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeEditedExpense(originalExpense, editedInput, extraction) {
  const meaningfulName = meaningfulNameFromText(editedInput);
  const hasEditedName = meaningfulName.length > 0;
  const hasEditedAmount = extraction?.action === "log" && extraction.amount != null;

  return {
    ...originalExpense,
    amount: hasEditedAmount ? extraction.amount : originalExpense.amount,
    currency: hasEditedAmount ? extraction.currency : originalExpense.currency,
    category: hasEditedName ? extraction.category || "other" : originalExpense.category,
    merchant: hasEditedName ? extraction.merchant ?? null : originalExpense.merchant,
    note: hasEditedName ? extraction.note || extraction.merchant || meaningfulName : originalExpense.note,
    date: extraction?.date || originalExpense.date,
    raw_input: `${originalExpense.raw_input}\nEDIT: ${editedInput}`,
    gemini_response: {
      original: originalExpense.gemini_response,
      edit: extraction,
      merged_from_edit: true,
    },
  };
}

async function handleDeleteIntent(ctx, extraction) {
  const userId = ctx.from.id;
  let result;

  if (extraction.target === "specific" && extraction.hint) {
    const hintTokens = tokenizeDeletionHint(extraction.hint);
    const tokenClauses = hintTokens.map(
      (_token, index) =>
        `(note ILIKE $${index + 2} OR merchant ILIKE $${index + 2} OR raw_input ILIKE $${index + 2})`,
    );

    result = await query(
      `SELECT *
       FROM expenses
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND expense_date >= CURRENT_DATE - INTERVAL '60 days'
         ${tokenClauses.length ? `AND (${tokenClauses.join(" OR ")})` : ""}
       ORDER BY expense_date DESC, created_at DESC
       LIMIT 5`,
      [userId, ...hintTokens.map((token) => `%${token}%`)],
    );
  } else {
    result = await query(
      `SELECT *
       FROM expenses
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY expense_date DESC, created_at DESC
       LIMIT 1`,
      [userId],
    );
  }

  if (result.rows.length === 0) {
    await ctx.reply("رکوردی برای حذف پیدا نکردم. کمی دقیق‌تر بگو کدوم خرج رو می‌خوای حذف کنی؟");
    return;
  }

  if (result.rows.length > 1) {
    const keyboard = new InlineKeyboard();
    result.rows.forEach((expense, index) => {
      keyboard.text(String(index + 1), `delete:pick:${expense.id}`);
      if (index % 3 === 2) keyboard.row();
    });
    keyboard.row().text("لغو", "delete:no");

    const lines = result.rows.map(expenseListLabel);
    await ctx.reply(`چند مورد پیدا کردم. کدوم حذف بشه؟\n\n${lines.join("\n")}`, {
      reply_markup: keyboard,
    });
    return;
  }

  const expense = result.rows[0];
  await ctx.reply(buildDeleteConfirmationText(expense), {
    reply_markup: new InlineKeyboard()
      .text("بله، حذف کن", `delete:yes:${expense.id}`)
      .text("نه", "delete:no"),
  });
}

async function sendPendingConfirmation(ctx, pendingExpense) {
  setUserState(ctx.from.id, "awaiting_confirmation", { expense: pendingExpense });
  await ctx.reply(buildConfirmationText(pendingExpense), {
    reply_markup: new InlineKeyboard()
      .text("بله ✓", "expense:confirm")
      .text("ویرایش ✎", "expense:edit"),
  });
}

async function processEditedText(ctx, rawInput, current) {
  let extraction;
  const meaningfulName = meaningfulNameFromText(rawInput);

  try {
    extraction = await extractExpense(rawInput);
  } catch (error) {
    console.error("Expense edit extraction failed:", error);
    await ctx.reply("ویرایش رو نتونستم تحلیل کنم. لطفاً فقط نام خرج، مبلغ، یا هر دو رو بنویس.");
    return;
  }

  if (extraction.action === "delete" || (extraction.action === "irrelevant" && !meaningfulName)) {
    await ctx.reply("برای ویرایش، فقط نام خرج، مبلغ، یا هر دو رو بنویس.");
    return;
  }

  if (extraction.action === "irrelevant" && meaningfulName) {
    extraction = {
      action: "log",
      amount: null,
      currency: current.payload.expense.currency,
      category: "other",
      merchant: null,
      date: current.payload.expense.date,
      note: meaningfulName,
      confidence: 0.7,
      needs_clarification: false,
      clarification_question: null,
      edit_name_only_fallback: true,
    };
  }

  const editedExpense = mergeEditedExpense(current.payload.expense, rawInput, extraction);
  clearUserState(ctx.from.id);
  await sendPendingConfirmation(ctx, editedExpense);
}

export async function processUserText(ctx, rawInput, options = {}) {
  await upsertUser(ctx.from);
  const current = getUserState(ctx.from.id);

  if (current.state === "awaiting_edit" && current.payload?.expense) {
    await processEditedText(ctx, rawInput, current);
    return;
  }

  let extraction;

  try {
    extraction = await extractExpense(rawInput);
  } catch (error) {
    console.error("Expense extraction failed:", error);
    await ctx.reply(
      options.source === "voice"
        ? "صدات رو دریافت کردم، ولی پردازش متنش با مشکل روبه‌رو شد. لطفاً کوتاه‌تر و واضح‌تر بفرست یا متنش رو بنویس."
        : "فعلاً نتونستم متن رو تحلیل کنم. لطفاً چند دقیقه دیگه دوباره امتحان کن.",
    );
    return;
  }

  if (extraction.action === "irrelevant" || extraction.needs_clarification) {
    if (options.source === "voice") {
      const heard = String(rawInput ?? "").trim();
      await ctx.reply(
        `صدات رو این‌طوری شنیدم: «${heard || "نامشخص"}»

${extraction.clarification_question ?? "مبلغ یا نوع خرج واضح نبود. لطفاً دوباره واضح‌تر بگو یا متنش رو بنویس."}`,
      );
      return;
    }

    await ctx.reply(extraction.clarification_question ?? "متوجه نشدم! می‌تونی یه خرج بنویسی؟");
    return;
  }

  if (extraction.action === "delete") {
    await handleDeleteIntent(ctx, extraction);
    return;
  }

  if (extraction.action !== "log") {
    await ctx.reply("متوجه نشدم! می‌تونی یه خرج بنویسی؟ مثلاً: ناهار ۵۰ هزار تومان");
    return;
  }

  const pendingExpense = {
    ...extraction,
    raw_input: rawInput,
    gemini_response: extraction,
  };

  await sendPendingConfirmation(ctx, pendingExpense);
}

export async function handleTextMessage(ctx) {
  await processUserText(ctx, ctx.message.text);
}
