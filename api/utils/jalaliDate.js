import jalaali from "jalaali-js";

export function addJalaliMonths(isoDate, months) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const { jy, jm, jd } = jalaali.toJalaali(y, m, d);

  let targetJm = jm + months;
  let targetJy = jy;
  while (targetJm < 1) {
    targetJm += 12;
    targetJy -= 1;
  }
  while (targetJm > 12) {
    targetJm -= 12;
    targetJy += 1;
  }

  const dayCount = jalaali.jalaaliMonthLength(targetJy, targetJm);
  const { gy, gm, gd } = jalaali.toGregorian(targetJy, targetJm, Math.min(jd, dayCount));
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}
