import { CategoryChart } from "../components/CategoryChart.jsx";
import { ExpenseRow } from "../components/ExpenseRow.jsx";
import { CATEGORY_LABELS_FA } from "../utils/categories.js";

export function Dashboard({ total, chartData, expenses, selectedCategory, onSelectCategory, onOpenHistory }) {
  const visibleExpenses = selectedCategory
    ? expenses.filter((expense) => expense.category === selectedCategory)
    : expenses;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-card bg-tg-bg2 p-4">
        <div className="mb-2 text-sm font-medium text-tg-hint">خرج این ماه</div>
        <div className="text-3xl font-bold text-tg-text">{total.toLocaleString("fa-IR")} تومان</div>
      </section>

      <section className="rounded-card bg-tg-bg2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-tg-hint">دسته‌بندی‌ها</span>
          {selectedCategory ? (
            <button className="text-sm font-medium text-tg-link" onClick={() => onSelectCategory(null)}>
              همه
            </button>
          ) : null}
        </div>
        <CategoryChart data={chartData} onSelect={onSelectCategory} />
        {selectedCategory ? (
          <div className="mt-2 text-sm text-tg-hint">{CATEGORY_LABELS_FA[selectedCategory]}</div>
        ) : null}
      </section>

      <section className="rounded-card bg-tg-bg2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-tg-hint">آخرین خرج‌ها</span>
          <button className="text-sm font-medium text-tg-link" onClick={onOpenHistory}>
            مشاهده همه
          </button>
        </div>
        {visibleExpenses.slice(0, 5).map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} />
        ))}
        {!visibleExpenses.length ? <div className="py-6 text-center text-sm text-tg-hint">موردی نیست.</div> : null}
      </section>
    </div>
  );
}
