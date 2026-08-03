import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExpenseRow } from "../components/ExpenseRow.jsx";
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS_FA } from "../utils/categories.js";

const CURRENCIES = ["IRT", "IRR", "EUR", "USD", "GBP", "TRY"];

function toPersianDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function EditExpenseModal({ expense, onClose, onSave }) {
  const [form, setForm] = useState({
    note: expense.note || expense.merchant || "",
    amount: toPersianDigits(expense.amount ?? ""),
    currency: expense.currency || "IRT",
    category: expense.category || "other",
    expense_date: expense.expense_date_jalali || expense.expense_date || "",
  });
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(expense.id, {
        ...form,
        merchant: null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-10 flex items-end bg-black/40 backdrop-blur-sm">
      <form
        className="safe-bottom flex w-full flex-col gap-3 rounded-t-3xl bg-tg-bg p-4 pt-3 text-tg-text"
        onSubmit={handleSubmit}
      >
        <div className="mx-auto h-1.5 w-10 rounded-pill bg-tg-hint bg-opacity-30" />

        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold">ویرایش خرج</h2>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-pill bg-tg-bg2 text-sm font-medium text-tg-hint"
            onClick={onClose}
            aria-label="بستن"
          >
            ✕
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-tg-hint">
          نام خرج
          <input
            className="rounded-2xl border border-tg-hint border-opacity-15 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none focus:border-tg-link"
            value={form.note}
            onChange={(event) => updateField("note", event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-tg-hint">
          دسته
          <select
            className="rounded-2xl border border-tg-hint border-opacity-15 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none focus:border-tg-link"
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
          >
            {Object.entries(CATEGORY_LABELS_FA).map(([key, label]) => (
              <option key={key} value={key}>
                {CATEGORY_ICONS[key]} {label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-tg-hint">
            مبلغ
            <input
              className="ltr rounded-2xl border border-tg-hint border-opacity-15 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none focus:border-tg-link"
              dir="ltr"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => updateField("amount", toPersianDigits(event.target.value))}
              required
            />
          </label>

          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-tg-hint">
            ارز
            <select
              className="rounded-2xl border border-tg-hint border-opacity-15 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none focus:border-tg-link"
              value={form.currency}
              onChange={(event) => updateField("currency", event.target.value)}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency === "IRT" ? "تومان" : currency}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-tg-hint">
          تاریخ
          <input
            className="ltr rounded-2xl border border-tg-hint border-opacity-15 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none focus:border-tg-link"
            dir="ltr"
            value={form.expense_date}
            onChange={(event) => updateField("expense_date", toPersianDigits(event.target.value))}
            placeholder="۱۴۰۵/۰۴/۲۱"
            required
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-2xl bg-tg-button px-4 py-3 text-base font-bold text-tg-buttonText transition active:scale-[0.98] disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "در حال ذخیره..." : "ذخیره"}
        </button>
      </form>
    </div>,
    document.body,
  );
}

export function History({ expenses, selectedCategory, total, onSelectCategory, onBack, onDelete, onUpdate }) {
  const categories = Object.entries(CATEGORY_LABELS_FA);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
  const visibleExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return expenses;

    return expenses.filter((expense) => {
      const categoryLabel = CATEGORY_LABELS_FA[expense.category] ?? "";
      const haystack = [
        expense.note,
        expense.merchant,
        categoryLabel,
        expense.amount,
        expense.currency,
        expense.expense_date_jalali,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [expenses, searchQuery]);

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-tg-bg2 text-tg-link transition active:scale-90"
          onClick={onBack}
          aria-label="بازگشت"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-tg-text">تاریخچه خرج‌ها</h1>
      </div>

      <section className="rounded-3xl bg-tg-bg2 p-4 shadow-sm shadow-black/5">
        <div className="mb-2 text-sm font-medium text-tg-hint">جمع خرج این ماه</div>
        <div className="text-3xl font-bold text-tg-text">{Number(total ?? 0).toLocaleString("fa-IR")} تومان</div>
      </section>

      <section className="rounded-3xl bg-tg-bg2 p-4 shadow-sm shadow-black/5">
        <div className="mb-3 text-sm font-medium text-tg-hint">دسته‌ها</div>
        <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            className={`flex shrink-0 items-center gap-1 rounded-pill px-3 py-2 text-sm font-medium transition ${
              !selectedCategory ? "bg-tg-link text-white" : "bg-tg-bg text-tg-text"
            }`}
            onClick={() => onSelectCategory(null)}
          >
            همه
          </button>
          {categories.map(([key, label]) => {
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium transition ${
                  isSelected ? "text-white" : "bg-tg-bg text-tg-text"
                }`}
                style={isSelected ? { backgroundColor: CATEGORY_COLORS[key] } : undefined}
                onClick={() => onSelectCategory(key)}
              >
                <span>{CATEGORY_ICONS[key]}</span>
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-tg-bg2 p-4 shadow-sm shadow-black/5">
        <label className="relative block" htmlFor="expense-search">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tg-hint"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3-3" />
          </svg>
          <input
            id="expense-search"
            className="w-full rounded-2xl border border-tg-hint border-opacity-15 bg-tg-bg py-3 pl-3 pr-10 text-sm font-medium text-tg-text outline-none focus:border-tg-link"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="نام خرج، دسته، مبلغ..."
          />
        </label>
      </section>

      <section className="rounded-3xl bg-tg-bg2 p-4 shadow-sm shadow-black/5">
        {visibleExpenses.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} onDelete={onDelete} onEdit={setEditingExpense} />
        ))}
        {!visibleExpenses.length ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-tg-hint">
            <span className="text-3xl">🔍</span>
            موردی نیست.
          </div>
        ) : null}
      </section>

      {editingExpense ? (
        <EditExpenseModal expense={editingExpense} onClose={() => setEditingExpense(null)} onSave={onUpdate} />
      ) : null}
    </div>
  );
}
