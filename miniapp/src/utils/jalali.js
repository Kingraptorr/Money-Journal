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
