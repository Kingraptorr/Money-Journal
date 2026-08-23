import { useEffect, useMemo, useState } from "react";
import {
  BackIcon,
  CheckIcon,
  ChevronDownIcon,
  FilterIcon,
  RefreshIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "../components/Icons.jsx";
import { getCurrencyRates } from "../utils/api.js";

const STORAGE_KEY = "ai-money-journal-currency-codes";
const DEFAULT_VISIBLE_CODES = ["USD", "USDT", "EUR", "AED", "AZADI_1_4", "GOL18"];

const BADGE_COLORS = {
  fiat: "#3B6EA8",
  gold: "#D4A017",
  crypto: "#1EA672",
};

const cardStyle = {
  background: "var(--tg-theme-secondary-bg-color)",
  border: "1px solid var(--app-glass-border)",
  boxShadow: "var(--app-shadow)",
};

function loadVisibleCodes() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_VISIBLE_CODES;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_VISIBLE_CODES;
  } catch {
    return DEFAULT_VISIBLE_CODES;
  }
}

function saveVisibleCodes(codes) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

function fmtChange(value) {
  const abs = Math.abs(value);
  if (abs >= 1000) return `${(abs / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 2 })}هزار`;
  return abs.toLocaleString("fa-IR");
}

function badgeText(code) {
  return code.length > 4 ? code.slice(0, 3) : code;
}

export function Currency({ onBack }) {
  const [rates, setRates] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [visibleCodes, setVisibleCodes] = useState(loadVisibleCodes);
  const [filterOpen, setFilterOpen] = useState(false);

  async function load(isRefresh) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getCurrencyRates();
      setRates(data?.rates ?? []);
      setUpdatedAt(data?.updatedAt ?? null);
    } catch (loadError) {
      setError(loadError.message || "api_error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(false);
  }, []);

  function toggleCode(code) {
    setVisibleCodes((current) => {
      const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
      saveVisibleCodes(next);
      return next;
    });
  }

  const visibleRates = useMemo(
    () => rates.filter((rate) => visibleCodes.includes(rate.code)),
    [rates, visibleCodes],
  );

  const updatedAtLabel = updatedAt
    ? `به‌روزرسانی: ${new Date(updatedAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return (
    <div className="fade-in mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="بازگشت"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-tg-text"
            style={{ background: "var(--app-subtle-bg)" }}
          >
            <BackIcon />
          </button>
          <div>
            <div className="text-[22px] font-extrabold text-tg-text">نرخ ارز و طلا</div>
            <div className="mt-0.5 text-[11.5px] font-medium text-tg-hint">{updatedAtLabel}</div>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen((value) => !value)}
            aria-label="انتخاب ارزها"
            className="flex h-[42px] items-center gap-1.5 rounded-pill px-3 text-[12.5px] font-bold text-tg-text"
            style={{ background: "var(--app-subtle-bg)" }}
          >
            <FilterIcon />
            <span>{visibleCodes.length === rates.length ? "همه" : `${visibleCodes.length.toLocaleString("fa-IR")} مورد`}</span>
            <ChevronDownIcon />
          </button>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            aria-label="به‌روزرسانی"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-tg-link"
            style={{ background: "var(--app-subtle-bg)" }}
          >
            <span className={refreshing ? "inline-flex animate-spin" : "inline-flex"}>
              <RefreshIcon />
            </span>
          </button>

          {filterOpen ? (
            <>
              <div
                className="fixed inset-0 z-[15]"
                onClick={() => setFilterOpen(false)}
              />
              <div
                className="glass-card fade-in absolute left-0 top-[48px] z-20 flex max-h-80 w-[230px] flex-col gap-0.5 overflow-y-auto rounded-2xl p-2"
                style={cardStyle}
                onClick={(event) => event.stopPropagation()}
              >
                {rates.map((rate) => {
                  const checked = visibleCodes.includes(rate.code);
                  return (
                    <button
                      key={rate.code}
                      type="button"
                      onClick={() => toggleCode(rate.code)}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-right"
                    >
                      <span
                        className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px]"
                        style={{
                          borderColor: checked ? "var(--tg-theme-button-color)" : "var(--app-glass-border)",
                          background: checked ? "var(--tg-theme-button-color)" : "transparent",
                          color: "#fff",
                        }}
                      >
                        {checked ? <CheckIcon /> : null}
                      </span>
                      <span className="text-[13px] font-semibold text-tg-text">
                        {rate.name} ({rate.code})
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-sm text-tg-hint">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-tg-hint border-opacity-20 border-t-tg-link" />
          در حال دریافت نرخ‌ها...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="glass-card rounded-3xl p-4 text-sm text-tg-destructive" style={cardStyle}>
          دریافت نرخ‌ها ممکن نشد. دوباره امتحان کن.
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid grid-cols-2 gap-3">
          {visibleRates.map((rate) => {
            const badgeColor = BADGE_COLORS[rate.category] ?? BADGE_COLORS.fiat;
            const hasChange = rate.change !== null && rate.change !== 0;
            const isUp = rate.change > 0;
            return (
              <div
                key={rate.code}
                className="glass-card flex min-w-0 flex-col gap-4 rounded-[20px] p-4"
                style={cardStyle}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
                    style={{ background: `${badgeColor}26`, color: badgeColor }}
                  >
                    {badgeText(rate.code)}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-[13.5px] font-bold text-tg-text">{rate.name}</span>
                    <span className="mt-0.5 block text-[11.5px] text-tg-hint">{rate.code}</span>
                  </span>
                </div>
                <div>
                  <span
                    className="mb-1 flex items-center gap-1 text-[12.5px] font-bold"
                    style={{ color: !hasChange ? "var(--tg-theme-hint-color)" : isUp ? "#2FA35A" : "#D9534F" }}
                  >
                    {hasChange ? isUp ? <TrendUpIcon /> : <TrendDownIcon /> : null}
                    {hasChange ? fmtChange(rate.change) : "بدون تغییر"}
                  </span>
                  <span dir="ltr" className="flex items-baseline gap-1 text-[19px] font-extrabold text-tg-text">
                    {rate.sell !== null ? Number(rate.sell).toLocaleString("fa-IR") : "—"}
                    <span className="text-[11px] font-bold text-tg-hint">تومان</span>
                  </span>
                </div>
              </div>
            );
          })}

          {!visibleRates.length ? (
            <div className="col-span-2 flex flex-col items-center gap-2.5 py-14 text-center text-[13.5px] text-tg-hint">
              چیزی برای نمایش انتخاب نشده. از فیلتر بالا ارز اضافه کن.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
