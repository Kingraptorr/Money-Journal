import { CATEGORY_EMOJIS, CATEGORY_LABELS_FA } from "./categories.js";
import { toJalali } from "./jalali.js";

export function formatAmount(amount, currency = "IRT") {
  const label = currency === "IRT" ? "تومان" : currency;
  return `${Number(amount).toLocaleString("fa-IR")} ${label}`;
}

export function buildConfirmationText(expense) {
  const expenseName = expense.note || expense.merchant || expense.raw_input || "خرج";
  const categoryLabel = CATEGORY_LABELS_FA[expense.category] ?? "سایر";
  const categoryEmoji = CATEGORY_EMOJIS[expense.category] ?? CATEGORY_EMOJIS.other;

  return `دسته بندی: ${categoryEmoji} ${categoryLabel}
نام خرج: ${expenseName}
تاریخ: ${toJalali(expense.date)}
مبلغ: ${formatAmount(expense.amount, expense.currency)}

آیا موارد بالا مورد تاییدن؟`;
}

export function buildDeleteConfirmationText(expense) {
  const expenseName = expense.note || expense.merchant || expense.raw_input || "خرج";

  return `🗑 این رکورد حذف بشه؟

${CATEGORY_LABELS_FA[expense.category] ?? "سایر"} · ${expenseName}
${formatAmount(expense.amount, expense.currency)} · ${toJalali(expense.expense_date)}

مطمئنی؟`;
}
