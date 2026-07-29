import { monthLabel } from "../utils/jalali.js";

function ChevronRightIcon(props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}

function ChevronLeftIcon(props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function MonthNav({ month, onPrev, onNext }) {
  return (
    <div className="mb-5 flex items-center justify-between rounded-2xl bg-tg-bg2 p-1.5 shadow-sm shadow-black/5">
      <button
        className="flex h-10 w-10 items-center justify-center rounded-xl text-tg-link transition active:scale-90 active:bg-tg-bg"
        onClick={onPrev}
        aria-label="ماه قبل"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
      <span className="text-base font-bold text-tg-text">{monthLabel(month)}</span>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-xl text-tg-link transition active:scale-90 active:bg-tg-bg"
        onClick={onNext}
        aria-label="ماه بعد"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
