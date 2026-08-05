import jalaali from "jalaali-js";

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function formatJalali(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const { jy, jm, jd } = jalaali.toJalaali(y, m, d);
  return `${jd.toLocaleString("fa-IR")} ${JALALI_MONTHS[jm - 1]} ${jy.toLocaleString("fa-IR", { useGrouping: false })}`;
}

export function currentJalaliMonth() {
  const { jy, jm } = jalaali.toJalaali(new Date());
  return { jy, jm };
}

export function monthLabel(month) {
  return `${JALALI_MONTHS[month.jm - 1]} ${month.jy.toLocaleString("fa-IR", { useGrouping: false })}`;
}

export function monthParam(month) {
  return `${month.jy}-${String(month.jm).padStart(2, "0")}`;
}

const PERSIAN_WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function formatDayLabel(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const { jy, jm, jd } = jalaali.toJalaali(y, m, d);
  const jalaliDate = `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]}`;

  if (date.getTime() === today.getTime()) return `امروز، ${jalaliDate}`;
  if (date.getTime() === yesterday.getTime()) return `دیروز، ${jalaliDate}`;
  return `${PERSIAN_WEEKDAYS[date.getDay()]}، ${jalaliDate}`;
}

export function shiftMonth(month, delta) {
  let jm = month.jm + delta;
  let jy = month.jy;

  while (jm < 1) {
    jm += 12;
    jy -= 1;
  }

  while (jm > 12) {
    jm -= 12;
    jy += 1;
  }

  return { jy, jm };
}
