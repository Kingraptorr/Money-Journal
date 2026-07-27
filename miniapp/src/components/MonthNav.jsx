import { monthLabel } from "../utils/jalali.js";

export function MonthNav({ month, onPrev, onNext }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <button className="p-1 text-lg text-tg-link active:opacity-80" onClick={onNext}>
        ›
      </button>
      <span className="text-xl font-bold text-tg-text">{monthLabel(month)}</span>
      <button className="p-1 text-lg text-tg-link active:opacity-80" onClick={onPrev}>
        ‹
      </button>
    </div>
  );
}
