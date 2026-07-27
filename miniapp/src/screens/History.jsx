import { useMemo, useState } from "react";
import { ExpenseRow } from "../components/ExpenseRow.jsx";
import { CATEGORY_LABELS_FA } from "../utils/categories.js";

const CURRENCIES = ["IRT", "IRR", "EUR", "USD", "GBP", "TRY"];

function EditExpenseModal({ expense, onClose, onSave }) {
  const [form, setForm] = useState({
    note: expense.note || expense.merchant || "",
    amount: String(expense.amount ?? ""),
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

  return (
    <div className="fixed inset-0 z-10 flex items-end bg-black bg-opacity-40 px-4 py-5">
      <form className="flex w-full flex-col gap-3 rounded-card bg-tg-bg p-4 text-tg-text" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">ویرایش خرج</h2>
          <button type="button" className="text-sm font-medium text-tg-link" onClick={onClose}>
            بستن
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-tg-hint">
          نام خرج
          <input
            className="rounded-card border border-tg-hint border-opacity-20 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none"
            value={form.note}
            onChange={(event) => updateField("note", event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-tg-hint">
          دسته
          <select
            className="rounded-card border border-tg-hint border-opacity-20 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none"
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
          >
            {Object.entries(CATEGORY_LABELS_FA).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-tg-hint">
            مبلغ
            <input
              className="ltr rounded-card border border-tg-hint border-opacity-20 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none"
              dir="ltr"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => updateField("amount", event.target.value)}
              required
            />
          </label>

          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-tg-hint">
            ارز
            <select
              className="rounded-card border border-tg-hint border-opacity-20 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none"
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
            className="ltr rounded-card border border-tg-hint border-opacity-20 bg-tg-bg2 px-3 py-3 text-base text-tg-text outline-none"
            dir="ltr"
            value={form.expense_date}
            onChange={(event) => updateField("expense_date", event.target.value)}
            placeholder="۱۴۰۵/۰۴/۲۱"
            required
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-card bg-tg-link px-4 py-3 text-base font-bold text-white active:opacity-80 disabled:opacity-60"
          disabled={saving}
        >
          ذخیره
        </button>
      </form>
    </div>
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button className="text-sm font-medium text-tg-link" onClick={onBack}>
          بازگشت
        </button>
        <h1 className="text-xl font-bold text-tg-text">تاریخچه خرج‌ها</h1>
      </div>

      <section className="rounded-card bg-tg-bg2 p-4">
        <div className="mb-2 text-sm font-medium text-tg-hint">جمع خرج این ماه</div>
        <div className="text-3xl font-bold text-tg-text">{Number(total ?? 0).toLocaleString("fa-IR")} تومان</div>
      </section>

      <section className="rounded-card bg-tg-bg2 p-4">
        <label className="mb-3 block text-sm font-medium text-tg-hint" htmlFor="category-filter">
          فیلتر دسته
        </label>
        <select
          id="category-filter"
          className="w-full rounded-card border border-tg-hint border-opacity-20 bg-tg-bg px-3 py-3 text-sm font-medium text-tg-text outline-none"
          value={selectedCategory ?? ""}
          onChange={(event) => onSelectCategory(event.target.value || null)}
        >
          <option value="">همه دسته‌ها</option>
          {categories.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-card bg-tg-bg2 p-4">
        <label className="mb-3 block text-sm font-medium text-tg-hint" htmlFor="expense-search">
          جستجو
        </label>
        <input
          id="expense-search"
          className="w-full rounded-card border border-tg-hint border-opacity-20 bg-tg-bg px-3 py-3 text-sm font-medium text-tg-text outline-none"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="نام خرج، دسته، مبلغ..."
        />
      </section>

      <section className="rounded-card bg-tg-bg2 p-4">
        {visibleExpenses.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} onDelete={onDelete} onEdit={setEditingExpense} />
        ))}
        {!visibleExpenses.length ? <div className="py-8 text-center text-sm text-tg-hint">موردی نیست.</div> : null}
      </section>

      {editingExpense ? (
        <EditExpenseModal expense={editingExpense} onClose={() => setEditingExpense(null)} onSave={onUpdate} />
      ) : null}
    </div>
  );
}
