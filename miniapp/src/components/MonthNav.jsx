import { monthLabel } from "../utils/jalali.js";

export function MonthNav({ month, onPrev, onNext }) {
  return (
    <div
      className="glass-card flex items-center justify-between rounded-[18px] p-1.5"
      style={{
        background: "var(--tg-theme-secondary-bg-color)",
        border: "1px solid var(--app-glass-border)",
        boxShadow: "var(--app-shadow)",
      }}
    >
      <button
        className="flex h-10 w-10 items-center justify-center rounded-[13px] text-lg text-tg-link transition active:scale-90"
        onClick={onPrev}
        aria-label="ماه قبل"
      >
        ‹
      </button>
      <span className="text-[15px] font-bold text-tg-text">{monthLabel(month)}</span>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-[13px] text-lg text-tg-link transition active:scale-90"
        onClick={onNext}
        aria-label="ماه بعد"
      >
        ›
      </button>
    </div>
  );
}
