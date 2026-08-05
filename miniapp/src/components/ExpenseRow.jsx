import { CategoryIcon, EditIcon, TrashIcon } from "./Icons.jsx";

export function ExpenseRow({ expense, categories, onDelete, onEdit }) {
  const cat = categories.find((c) => c.key === expense.category) ?? { key: expense.category, label: "سایر", color: "#7A7A7A" };
  const currency = expense.currency === "IRT" ? "تومان" : expense.currency;
  const expenseName = expense.note || expense.merchant || cat.label;

  function requestDelete() {
    if (!onDelete) return;
    if (confirm("این خرج حذف بشه؟")) {
      onDelete(expense.id);
    }
  }

  return (
    <div
      className="flex flex-col gap-2 py-3 last:border-0"
      style={{ borderBottom: "1px solid var(--app-divider-color)" }}
      onDoubleClick={requestDelete}
      onContextMenu={(event) => {
        event.preventDefault();
        requestDelete();
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${cat.color}26`, color: cat.color }}
        >
          <CategoryIcon category={cat.key} icon={cat.icon} />
        </span>
        <span className="min-w-0 flex-1 break-words text-base font-medium leading-snug text-tg-text">
          {expenseName}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-tg-hint">
          {[cat.label, expense.expense_date_jalali].filter(Boolean).join(" · ")}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          <span className="ltr text-base font-bold text-tg-text" dir="ltr">
            {expense.amount.toLocaleString("fa-IR")} {currency}
          </span>
          {onEdit ? (
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-tg-link transition active:scale-90"
              onClick={() => onEdit(expense)}
              aria-label="ویرایش"
              title="ویرایش"
            >
              <EditIcon />
            </button>
          ) : null}
          {onDelete ? (
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill transition active:scale-90"
              style={{ background: "var(--app-delete-bg)", color: "var(--tg-theme-destructive-text-color)" }}
              onClick={requestDelete}
              aria-label="حذف"
              title="حذف"
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
