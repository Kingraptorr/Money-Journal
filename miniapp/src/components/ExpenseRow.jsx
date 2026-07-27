import { CATEGORY_LABELS_FA } from "../utils/categories.js";

export function ExpenseRow({ expense, onDelete, onEdit }) {
  const label = CATEGORY_LABELS_FA[expense.category] ?? "سایر";
  const currency = expense.currency === "IRT" ? "تومان" : expense.currency;
  const expenseName = expense.note || expense.merchant || "خرج";

  function requestDelete() {
    if (!onDelete) return;
    if (confirm("این خرج حذف بشه؟")) {
      onDelete(expense.id);
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-tg-hint border-opacity-20 py-3"
      onDoubleClick={requestDelete}
      onContextMenu={(event) => {
        event.preventDefault();
        requestDelete();
      }}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-base font-medium text-tg-text">{label}</span>
        <span className="truncate text-sm text-tg-hint">{[expenseName, expense.expense_date_jalali].filter(Boolean).join(" · ")}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="ltr text-base font-bold text-tg-text" dir="ltr">
          {expense.amount.toLocaleString("fa-IR")} {currency}
        </span>
        {onEdit ? (
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-tg-link active:opacity-80"
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-tg-destructive active:opacity-80"
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
  );
}
