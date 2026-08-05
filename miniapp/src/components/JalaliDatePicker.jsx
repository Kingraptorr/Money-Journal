import { useState } from "react";
import jalaali from "jalaali-js";
import { createPortal } from "react-dom";
import { JALALI_MONTHS } from "../utils/jalali.js";

const PERSIAN_WEEKDAY_LETTERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function isoToJalali(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return jalaali.toJalaali(y, m, d);
}

function jalaliToIso(jy, jm, jd) {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

function shiftViewMonth({ jy, jm }, delta) {
  let nextJm = jm + delta;
  let nextJy = jy;
  while (nextJm < 1) {
    nextJm += 12;
    nextJy -= 1;
  }
  while (nextJm > 12) {
    nextJm -= 12;
    nextJy += 1;
  }
  return { jy: nextJy, jm: nextJm };
}

function weekdayIndexOfFirst(jy, jm) {
  const iso = jalaliToIso(jy, jm, 1);
  const [y, m, d] = iso.split("-").map(Number);
  const jsDay = new Date(y, m - 1, d).getDay();
  return (jsDay + 1) % 7;
}

export function JalaliDatePicker({ value, onChange, label = "تاریخ" }) {
  const selected = isoToJalali(value);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState({ jy: selected.jy, jm: selected.jm });

  function openPicker() {
    setViewMonth({ jy: selected.jy, jm: selected.jm });
    setOpen(true);
  }

  const dayCount = jalaali.jalaaliMonthLength(viewMonth.jy, viewMonth.jm);
  const leadingBlanks = weekdayIndexOfFirst(viewMonth.jy, viewMonth.jm);
  const dayLabel = `${toPersianDigits(selected.jd)} ${JALALI_MONTHS[selected.jm - 1]} ${toPersianDigits(selected.jy)}`;

  return (
    <>
      <div className="mb-1.5 text-xs font-semibold text-tg-hint">{label}</div>
      <button
        type="button"
        onClick={openPicker}
        className="mb-3.5 w-full rounded-2xl border px-3.5 py-3 text-right text-sm text-tg-text outline-none"
        style={{ borderColor: "var(--app-glass-border)", background: "var(--app-subtle-bg)" }}
      >
        {dayLabel}
      </button>

      {open
        ? createPortal(
            <div
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
            >
              <div
                onClick={(event) => event.stopPropagation()}
                className="glass-card fade-in w-full max-w-[420px] rounded-t-3xl p-5"
                style={{
                  background: "var(--tg-theme-secondary-bg-color)",
                  border: "1px solid var(--app-glass-border)",
                }}
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-pill" style={{ background: "var(--app-track-bg)" }} />

                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewMonth((month) => shiftViewMonth(month, -1))}
                    aria-label="ماه قبل"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-tg-link"
                    style={{ background: "var(--app-subtle-bg)" }}
                  >
                    ›
                  </button>
                  <span className="text-sm font-bold text-tg-text">
                    {JALALI_MONTHS[viewMonth.jm - 1]} {toPersianDigits(viewMonth.jy)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewMonth((month) => shiftViewMonth(month, 1))}
                    aria-label="ماه بعد"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-tg-link"
                    style={{ background: "var(--app-subtle-bg)" }}
                  >
                    ‹
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-tg-hint">
                  {PERSIAN_WEEKDAY_LETTERS.map((letter, index) => (
                    <span key={index}>{letter}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: leadingBlanks }).map((_, index) => (
                    <span key={`blank-${index}`} />
                  ))}
                  {Array.from({ length: dayCount }).map((_, index) => {
                    const jd = index + 1;
                    const isSelected =
                      selected.jy === viewMonth.jy && selected.jm === viewMonth.jm && selected.jd === jd;
                    return (
                      <button
                        key={jd}
                        type="button"
                        onClick={() => {
                          onChange(jalaliToIso(viewMonth.jy, viewMonth.jm, jd));
                          setOpen(false);
                        }}
                        className="flex h-10 items-center justify-center rounded-xl text-sm font-medium transition"
                        style={{
                          background: isSelected ? "var(--tg-theme-button-color)" : "transparent",
                          color: isSelected ? "#ffffff" : "var(--tg-theme-text-color)",
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        {toPersianDigits(jd)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
