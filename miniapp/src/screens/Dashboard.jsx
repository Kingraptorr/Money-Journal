import { CategoryChart } from "../components/CategoryChart.jsx";
import { ExpenseRow } from "../components/ExpenseRow.jsx";

function SunIcon(props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <path
        strokeLinecap="round"
        d="M12 2.5v2.25M12 19.25v2.25M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.4 19.6l1.6-1.6M18 6l1.6-1.6"
      />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function Dashboard({
  total,
  chartData,
  expenses,
  selectedCategory,
  onSelectCategory,
  onOpenHistory,
  theme,
  onToggleTheme,
}) {
  const visibleExpenses = selectedCategory
    ? expenses.filter((expense) => expense.category === selectedCategory)
    : expenses;

  return (
    <div className="fade-in flex flex-col gap-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-tg-button to-tg-link p-5 shadow-lg shadow-black/10">
        <div className="pointer-events-none absolute -left-6 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-8 bottom-[-2.5rem] h-28 w-28 rounded-full bg-white/10" />
        <div className="relative mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-white/80">خرج این ماه</span>
          {onToggleTheme ? (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "حالت روشن" : "حالت تیره"}
              title={theme === "dark" ? "حالت روشن" : "حالت تیره"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition active:scale-90"
            >
              {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
        <div className="relative text-4xl font-extrabold leading-tight text-white">
          {total.toLocaleString("fa-IR")} <span className="text-lg font-medium text-white/80">تومان</span>
        </div>
      </section>

      <section className="rounded-3xl bg-tg-bg2 p-4 shadow-sm shadow-black/5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-tg-text">دسته‌بندی‌ها</span>
          {selectedCategory ? (
            <button className="text-sm font-medium text-tg-link" onClick={() => onSelectCategory(null)}>
              پاک کردن فیلتر
            </button>
          ) : null}
        </div>
        <CategoryChart data={chartData} onSelect={onSelectCategory} selectedCategory={selectedCategory} />
      </section>

      <section className="rounded-3xl bg-tg-bg2 p-4 shadow-sm shadow-black/5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-tg-text">آخرین خرج‌ها</span>
          <button className="text-sm font-medium text-tg-link" onClick={onOpenHistory}>
            مشاهده همه
          </button>
        </div>
        <div className="flex flex-col">
          {visibleExpenses.slice(0, 5).map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} />
          ))}
        </div>
        {!visibleExpenses.length ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-tg-hint">
            <span className="text-3xl">🧾</span>
            موردی نیست.
          </div>
        ) : null}
      </section>
    </div>
  );
}
