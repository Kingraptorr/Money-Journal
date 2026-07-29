import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "./screens/Dashboard.jsx";
import { History } from "./screens/History.jsx";
import { MonthNav } from "./components/MonthNav.jsx";
import { currentJalaliMonth, monthParam, shiftMonth } from "./utils/jalali.js";
import { deleteExpense, getChart, getHistory, getSummary, updateExpense } from "./utils/api.js";
import { applyTheme, getInitialTheme, persistTheme } from "./utils/theme.js";

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [month, setMonth] = useState(currentJalaliMonth);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [summary, setSummary] = useState({ total: 0 });
  const [chart, setChart] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);

  const currentMonthParam = useMemo(() => monthParam(month), [month]);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, chartData, historyData] = await Promise.all([
        getSummary(currentMonthParam),
        getChart(currentMonthParam),
        getHistory(currentMonthParam, selectedCategory),
      ]);
      setSummary(summaryData ?? { total: 0 });
      setChart(chartData?.data ?? []);
      setExpenses(historyData?.expenses ?? []);
    } catch (loadError) {
      setError(loadError.message || "api_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [currentMonthParam, selectedCategory]);

  async function handleDelete(id) {
    await deleteExpense(id);
    await loadData();
  }

  async function handleUpdate(id, expense) {
    await updateExpense(id, expense);
    await loadData();
  }

  return (
    <main className="safe-bottom mx-auto min-h-screen w-full max-w-md bg-tg-bg px-4 py-5 text-tg-text">
      <MonthNav
        month={month}
        onPrev={() => setMonth((value) => shiftMonth(value, -1))}
        onNext={() => setMonth((value) => shiftMonth(value, 1))}
      />

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-sm text-tg-hint">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-tg-hint border-opacity-20 border-t-tg-link" />
          در حال بارگذاری...
        </div>
      ) : null}
      {error ? (
        <div className="rounded-3xl bg-tg-bg2 p-4 text-sm text-tg-destructive">
          {error === "telegram_init_data_missing"
            ? "برای دیدن داشبورد، آن را از دکمه داشبورد داخل تلگرام باز کن."
            : "دریافت اطلاعات ممکن نشد."}
        </div>
      ) : null}

      {!loading && !error && screen === "dashboard" ? (
        <Dashboard
          total={Number(summary.total ?? 0)}
          chartData={chart}
          expenses={expenses}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onOpenHistory={() => setScreen("history")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : null}

      {!loading && !error && screen === "history" ? (
        <History
          expenses={expenses}
          selectedCategory={selectedCategory}
          total={Number(summary.total ?? 0)}
          onSelectCategory={setSelectedCategory}
          onBack={() => setScreen("dashboard")}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ) : null}
    </main>
  );
}
