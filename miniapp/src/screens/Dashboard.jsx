import { CategoryChart } from "../components/CategoryChart.jsx";
import { ExpenseRow } from "../components/ExpenseRow.jsx";
import { MonthNav } from "../components/MonthNav.jsx";
import { ScreenHeader } from "../components/ScreenHeader.jsx";
import { DollarIcon } from "../components/Icons.jsx";

const cardStyle = {
  background: "var(--tg-theme-secondary-bg-color)",
  border: "1px solid var(--app-glass-border)",
  boxShadow: "var(--app-shadow)",
};

function trendInfo(total, prevTotal, eligible) {
  if (!eligible) return { icon: "⏳", text: "برای مقایسه با ماه قبل چند روز دیگه صبر کن." };
  if (!prevTotal) return { icon: "🌱", text: "این اولین ماهیه که خرج ثبت کردی." };
  const diffPercent = Math.round(((total - prevTotal) / prevTotal) * 100);
  const absPercent = Math.abs(diffPercent).toLocaleString("fa-IR");
  if (diffPercent < 0) return { icon: "📉", text: `نسبت به ماه قبل ${absPercent}٪ کمتر خرج کردی — همینطوری ادامه بده!` };
  if (diffPercent > 0) return { icon: "📈", text: `نسبت به ماه قبل ${absPercent}٪ بیشتر خرج کردی.` };
  return { icon: "➖", text: "خرجت نسبت به ماه قبل تغییری نکرده." };
}

export function Dashboard({
  month,
  onPrevMonth,
  onNextMonth,
  total,
  prevTotal,
  trendEligible = true,
  chartData,
  categories,
  expenses,
  selectedCategory,
  onSelectCategory,
  onOpenHistory,
  isWide,
  avatarPhotoUrl,
  avatarName,
  userFirstName,
  onOpenCurrency,
  debtsSummary,
  onOpenDebts,
}) {
  const visibleExpenses = selectedCategory
    ? expenses.filter((expense) => expense.category === selectedCategory)
    : expenses;

  const trend = trendInfo(total, prevTotal, trendEligible);

  return (
    <div className="fade-in flex flex-col gap-4">
      <ScreenHeader
        subtitle={userFirstName ? `سلام ${userFirstName}! این خلاصه‌ی ماه توئه 🌿` : "سلام! این خلاصه‌ی ماه توئه 🌿"}
        title="دفتر مالی من"
        isWide={isWide}
        avatarPhotoUrl={avatarPhotoUrl}
        avatarName={avatarName}
        action={
          <button
            type="button"
            onClick={onOpenCurrency}
            aria-label="نرخ ارز و طلا"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-tg-text"
            style={{ background: "var(--app-subtle-bg)" }}
          >
            <DollarIcon />
          </button>
        }
      />

      <MonthNav month={month} onPrev={onPrevMonth} onNext={onNextMonth} />

      <section
        className="relative overflow-hidden rounded-3xl p-5 shadow-lg"
        style={{ background: "var(--tg-theme-button-color)", boxShadow: "0 14px 28px -16px var(--tg-theme-button-color)" }}
      >
        <div className="pointer-events-none absolute -left-6 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-8 bottom-[-2.5rem] h-28 w-28 rounded-full bg-white/10" />
        <div className="relative mb-2 text-sm font-medium" style={{ color: "var(--app-hero-subtext)" }}>
          خرج این ماه
        </div>
        <div className="relative text-4xl font-extrabold leading-tight" style={{ color: "var(--app-hero-text)" }}>
          {total.toLocaleString("fa-IR")}{" "}
          <span className="text-lg font-medium" style={{ color: "var(--app-hero-subtext)" }}>
            تومان
          </span>
        </div>
        <div
          className="relative mt-3 inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px]"
          style={{ background: "var(--app-hero-chip-bg)", color: "var(--app-hero-text)" }}
        >
          <span>{trend.icon}</span>
          <span>{trend.text}</span>
        </div>
      </section>

      <section className="glass-card rounded-3xl p-4" style={cardStyle} role="button" onClick={onOpenDebts}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-tg-text">بدهی و قرض</span>
          <button
            type="button"
            className="text-sm font-medium text-tg-link"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDebts();
            }}
          >
            مدیریت
          </button>
        </div>
        {debtsSummary.overdueCount > 0 ? (
          <div className="text-sm font-bold" style={{ color: "var(--tg-theme-destructive-text-color)" }}>
            {debtsSummary.overdueCount.toLocaleString("fa-IR")} قسط عقب‌افتاده · {debtsSummary.overdueTotal.toLocaleString("fa-IR")} تومان
          </div>
        ) : null}
        {debtsSummary.dueSoonCount > 0 ? (
          <div className="text-sm text-tg-text">
            {debtsSummary.dueSoonCount.toLocaleString("fa-IR")} قسط تا ۷ روز آینده · {debtsSummary.dueSoonTotal.toLocaleString("fa-IR")} تومان
          </div>
        ) : null}
        {debtsSummary.remainingBalance > 0 ? (
          <div className="mt-1 text-xs text-tg-hint">مانده کل: {debtsSummary.remainingBalance.toLocaleString("fa-IR")} تومان</div>
        ) : (
          <div className="py-2 text-center text-sm text-tg-hint">بدهی فعالی ثبت نکردی.</div>
        )}
      </section>

      <section className="glass-card rounded-3xl p-4" style={cardStyle}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-tg-text">دسته‌بندی‌ها</span>
          {selectedCategory ? (
            <button className="text-sm font-medium text-tg-link" onClick={() => onSelectCategory(null)}>
              پاک کردن فیلتر
            </button>
          ) : null}
        </div>
        <CategoryChart
          data={chartData}
          categories={categories}
          onSelect={onSelectCategory}
          selectedCategory={selectedCategory}
        />
      </section>

      <section className="glass-card rounded-3xl p-4" style={cardStyle}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-tg-text">آخرین خرج‌ها</span>
          <button className="text-sm font-medium text-tg-link" onClick={onOpenHistory}>
            مشاهده همه
          </button>
        </div>
        <div className="flex flex-col">
          {visibleExpenses.slice(0, 5).map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} categories={categories} />
          ))}
        </div>
        {!visibleExpenses.length ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-tg-hint">
            <span className="text-3xl">🧾</span>
            موردی نیست.
          </div>
        ) : null}
      </section>

      <div className="px-1.5 pb-0.5 pt-1 text-center text-[12.5px] text-tg-hint">
        هر روز ثبت کن، هر ماه واضح‌تر ببین.
      </div>
    </div>
  );
}
