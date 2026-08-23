import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "./screens/Dashboard.jsx";
import { History } from "./screens/History.jsx";
import { Report } from "./screens/Report.jsx";
import { Settings } from "./screens/Settings.jsx";
import { Categories } from "./screens/Categories.jsx";
import { Currency } from "./screens/Currency.jsx";
import { Debts } from "./screens/Debts.jsx";
import { RailNav } from "./components/RailNav.jsx";
import { TabBar } from "./components/TabBar.jsx";
import { AddIcon, ChartIcon, HistoryIcon, HomeIcon, SettingsIcon } from "./components/Icons.jsx";
import { currentJalaliDate, currentJalaliMonth, monthParam, shiftMonth } from "./utils/jalali.js";
import {
  createCategory,
  createExpense,
  deleteCategory,
  deleteExpense,
  getCategories,
  getChart,
  getDebtsSummary,
  getHistory,
  getSummary,
  updateCategory,
  updateExpense,
} from "./utils/api.js";
import { ACCENT_PRIMARY, applyTheme, getInitialTheme, persistTheme } from "./utils/theme.js";
import { displayName, getTelegramUser } from "./utils/telegramUser.js";

const WIDE_BREAKPOINT = 900;
const TREND_MIN_DAY = 7;

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [month, setMonth] = useState(currentJalaliMonth);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [summary, setSummary] = useState({ total: 0 });
  const [chart, setChart] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [isWide, setIsWide] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= WIDE_BREAKPOINT : false,
  );
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [telegramUser] = useState(getTelegramUser);
  const [prevTotal, setPrevTotal] = useState(0);
  const [debtsSummary, setDebtsSummary] = useState({
    overdueCount: 0,
    overdueTotal: 0,
    dueSoonCount: 0,
    dueSoonTotal: 0,
    remainingBalance: 0,
  });

  const currentMonthParam = useMemo(() => monthParam(month), [month]);
  const previousMonthParam = useMemo(() => monthParam(shiftMonth(month, -1)), [month]);
  const today = currentJalaliDate();
  const isCurrentMonth = month.jy === today.jy && month.jm === today.jm;
  const trendDays = isCurrentMonth ? today.jd : undefined;
  const trendEligible = !isCurrentMonth || today.jd >= TREND_MIN_DAY;

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    function handleResize() {
      setIsWide(window.innerWidth >= WIDE_BREAKPOINT);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, prevSummaryData, chartData, historyData, categoriesData, debtsSummaryData] = await Promise.all([
        getSummary(currentMonthParam),
        getSummary(previousMonthParam, trendDays),
        getChart(currentMonthParam),
        getHistory(currentMonthParam, selectedCategory),
        getCategories(),
        getDebtsSummary(),
      ]);
      setSummary(summaryData ?? { total: 0 });
      setPrevTotal(Number(prevSummaryData?.total ?? 0));
      setChart(chartData?.data ?? []);
      setExpenses(historyData?.expenses ?? []);
      setCategories(categoriesData?.categories ?? []);
      setDebtsSummary(
        debtsSummaryData ?? { overdueCount: 0, overdueTotal: 0, dueSoonCount: 0, dueSoonTotal: 0, remainingBalance: 0 },
      );
    } catch (loadError) {
      setError(loadError.message || "api_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [currentMonthParam, previousMonthParam, selectedCategory]);

  async function refreshCategories() {
    const data = await getCategories();
    setCategories(data?.categories ?? []);
  }

  async function handleDeleteExpense(id) {
    await deleteExpense(id);
    await loadData();
  }

  async function handleUpdateExpense(id, expense) {
    await updateExpense(id, expense);
    await loadData();
  }

  async function handleCreateExpense(expense) {
    await createExpense(expense);
    await loadData();
  }

  async function handleCreateCategory(category) {
    await createCategory(category);
    await refreshCategories();
  }

  async function handleUpdateCategory(key, category) {
    await updateCategory(key, category);
    await refreshCategories();
  }

  async function handleDeleteCategory(key) {
    await deleteCategory(key);
    await refreshCategories();
  }

  function openAddSheet() {
    setEditingExpense(null);
    setShowAddSheet(true);
    setScreen("history");
  }

  function requestEdit(expense) {
    setEditingExpense(expense);
    setShowAddSheet(true);
  }

  const total = Number(summary.total ?? 0);
  const avatarPhotoUrl = telegramUser?.photoUrl ?? null;
  const avatarName = displayName(telegramUser);

  const railActive = { activeBg: `${ACCENT_PRIMARY}1f`, activeColor: ACCENT_PRIMARY };
  const railInactive = { activeBg: "transparent", activeColor: "var(--tg-theme-hint-color)" };
  const navItems = [
    {
      key: "dashboard",
      label: "خانه",
      icon: <HomeIcon />,
      ...(screen === "dashboard" ? railActive : railInactive),
      onClick: () => setScreen("dashboard"),
    },
    {
      key: "history",
      label: "تاریخچه",
      icon: <HistoryIcon />,
      ...(screen === "history" ? railActive : railInactive),
      onClick: () => setScreen("history"),
    },
    {
      key: "add",
      label: "افزودن",
      icon: <AddIcon />,
      activeBg: "var(--tg-theme-button-color)",
      activeColor: "#111111",
      onClick: openAddSheet,
    },
    {
      key: "report",
      label: "گزارش",
      icon: <ChartIcon />,
      ...(screen === "report" ? railActive : railInactive),
      onClick: () => setScreen("report"),
    },
    {
      key: "settings",
      label: "تنظیمات",
      icon: <SettingsIcon />,
      ...(screen === "settings" ? railActive : railInactive),
      onClick: () => setScreen("settings"),
    },
  ];

  const tabItems = navItems.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    onClick: item.onClick,
    color: item.key === "add" ? "#111111" : item.activeColor,
    bg: item.key === "add" ? "var(--tg-theme-button-color)" : item.activeBg,
  }));

  return (
    <div dir="rtl" className="relative flex min-h-screen justify-center bg-tg-bg text-tg-text">
      <div
        className="pointer-events-none fixed -right-[10%] -top-[10%] h-[60vw] max-h-[600px] w-[60vw] max-w-[600px] rounded-full opacity-[.32] blur-[80px]"
        style={{ background: "var(--tg-theme-button-color)" }}
      />
      <div
        className="pointer-events-none fixed -left-[10%] -bottom-[15%] h-[50vw] max-h-[500px] w-[50vw] max-w-[500px] rounded-full opacity-[.22] blur-[90px]"
        style={{ background: "var(--tg-theme-button-color)" }}
      />

      <div className="relative flex w-full max-w-[1180px]">
        {isWide ? (
          <RailNav items={navItems} avatarPhotoUrl={avatarPhotoUrl} avatarName={avatarName} />
        ) : null}

        <main
          className="safe-bottom flex min-w-0 flex-1 flex-col gap-4"
          style={{ padding: isWide ? "28px 32px 100px" : "18px 16px 96px" }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-tg-hint">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-tg-hint border-opacity-20 border-t-tg-link" />
              در حال بارگذاری...
            </div>
          ) : null}
          {error ? (
            <div className="glass-card rounded-3xl p-4 text-sm text-tg-destructive" style={{ background: "var(--tg-theme-secondary-bg-color)", border: "1px solid var(--app-glass-border)" }}>
              {error === "telegram_init_data_missing"
                ? "برای دیدن داشبورد، آن را از دکمه داشبورد داخل تلگرام باز کن."
                : "دریافت اطلاعات ممکن نشد."}
            </div>
          ) : null}

          {!loading && !error && screen === "dashboard" ? (
            <Dashboard
              month={month}
              onPrevMonth={() => setMonth((value) => shiftMonth(value, -1))}
              onNextMonth={() => setMonth((value) => shiftMonth(value, 1))}
              total={total}
              prevTotal={prevTotal}
              trendEligible={trendEligible}
              chartData={chart}
              categories={categories}
              expenses={expenses}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onOpenHistory={() => setScreen("history")}
              isWide={isWide}
              avatarPhotoUrl={avatarPhotoUrl}
              avatarName={avatarName}
              userFirstName={telegramUser?.firstName || avatarName}
              onOpenCurrency={() => setScreen("currency")}
              debtsSummary={debtsSummary}
              onOpenDebts={() => setScreen("debts")}
            />
          ) : null}

          {!loading && !error && screen === "currency" ? (
            <Currency onBack={() => setScreen("dashboard")} />
          ) : null}

          {!loading && !error && screen === "debts" ? (
            <Debts onBack={() => setScreen("dashboard")} onRefreshSummary={loadData} />
          ) : null}

          {!loading && !error && screen === "history" ? (
            <History
              month={month}
              onPrevMonth={() => setMonth((value) => shiftMonth(value, -1))}
              onNextMonth={() => setMonth((value) => shiftMonth(value, 1))}
              total={total}
              categories={categories}
              expenses={expenses}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onDelete={handleDeleteExpense}
              onCreate={handleCreateExpense}
              onUpdate={handleUpdateExpense}
              addSheetOpen={showAddSheet}
              onCloseAdd={() => setShowAddSheet(false)}
              editingExpense={editingExpense}
              onRequestEdit={requestEdit}
              isWide={isWide}
              avatarPhotoUrl={avatarPhotoUrl}
              avatarName={avatarName}
            />
          ) : null}

          {!loading && !error && screen === "report" ? (
            <Report
              month={month}
              onPrevMonth={() => setMonth((value) => shiftMonth(value, -1))}
              onNextMonth={() => setMonth((value) => shiftMonth(value, 1))}
            />
          ) : null}

          {!loading && !error && screen === "settings" ? (
            <Settings
              theme={theme}
              onToggleTheme={toggleTheme}
              onOpenCategories={() => setScreen("categories")}
              isWide={isWide}
              avatarPhotoUrl={avatarPhotoUrl}
              avatarName={avatarName}
            />
          ) : null}

          {!loading && !error && screen === "categories" ? (
            <Categories
              categories={categories}
              onBack={() => setScreen("settings")}
              onCreate={handleCreateCategory}
              onUpdate={handleUpdateCategory}
              onDelete={handleDeleteCategory}
            />
          ) : null}
        </main>
      </div>

      {!isWide ? <TabBar items={tabItems} /> : null}
    </div>
  );
}
