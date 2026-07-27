import jalaali from "jalaali-js";

export function toJalali(isoDate) {
  const normalizedDate = isoDate instanceof Date ? isoDate.toISOString().split("T")[0] : String(isoDate);
  const [y, m, d] = normalizedDate.split("-").map(Number);
  const { jy, jm, jd } = jalaali.toJalaali(y, m, d);
  return toPersianDigits(`${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`);
}

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}
