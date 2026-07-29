import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS_FA } from "../utils/categories.js";

export function ExpenseRow({ expense, onDelete, onEdit }) {
  const label = CATEGORY_LABELS_FA[expense.category] ?? "سایر";
  const currency = expense.currency === "IRT" ? "تومان" : expense.currency;
  const expenseName = expense.note || expense.merchant || label;
  const color = CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.other;

  function requestDelete() {
    if (!onDelete) return;
    if (confirm("این خرج حذف بشه؟")) {
      onDelete(expense.id);
    }
  }

  return (
    <div
      className="flex flex-col gap-2 border-b border-tg-hint border-opacity-10 py-3 last:border-0"
      onDoubleClick={requestDelete}
      onContextMenu={(event) => {
        event.preventDefault();
        requestDelete();
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg"
          style={{ backgroundColor: `${color}26` }}
        >
          {CATEGORY_ICONS[expense.category] ?? "🔖"}
        </span>
        <span className="min-w-0 flex-1 break-words text-base font-medium leading-snug text-tg-text">
          {expenseName}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-tg-hint">
          {[label, expense.expense_date_jalali].filter(Boolean).join(" · ")}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          <span className="ltr text-base font-bold text-tg-text" dir="ltr">
            {expense.amount.toLocaleString("fa-IR")} {currency}
          </span>
          {onEdit ? (
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-tg-link transition active:scale-90 active:bg-tg-bg"
              onClick={() => onEdit(expense)}
              aria-label="ویرایش"
              title="ویرایش"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          ) : null}
          {onDelete ? (
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-tg-destructive transition active:scale-90 active:bg-tg-bg"
              onClick={requestDelete}
              aria-label="حذف"
              title="حذف"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
