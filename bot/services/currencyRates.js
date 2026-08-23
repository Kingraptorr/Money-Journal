import { query } from "../../db/index.js";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// Order here also drives display order in the app; the first six are the
// app's default-visible set (USD, USDT, EUR, AED, 1/4 Azadi, Gold Gram).
const CURRENCY_LIST = [
  { code: "USD", name: "دلار آمریکا", category: "fiat", sellField: "usd1", buyField: "usd2" },
  { code: "USDT", name: "تتر", category: "crypto" },
  { code: "EUR", name: "یورو", category: "fiat", sellField: "eur1", buyField: "eur2" },
  { code: "AED", name: "درهم امارات", category: "fiat", sellField: "aed1", buyField: "aed2" },
  { code: "AZADI_1_4", name: "ربع سکه آزادی", category: "gold", sellField: "azadi1_4", buyField: "azadi1_42" },
  { code: "GOL18", name: "گرم طلای ۱۸ عیار", category: "gold", sellField: "gol18", buyField: null },

  { code: "GBP", name: "پوند انگلیس", category: "fiat", sellField: "gbp1", buyField: "gbp2" },
  { code: "CHF", name: "فرانک سوئیس", category: "fiat", sellField: "chf1", buyField: "chf2" },
  { code: "CAD", name: "دلار کانادا", category: "fiat", sellField: "cad1", buyField: "cad2" },
  { code: "AUD", name: "دلار استرالیا", category: "fiat", sellField: "aud1", buyField: "aud2" },
  { code: "TRY", name: "لیر ترکیه", category: "fiat", sellField: "try1", buyField: "try2" },
  { code: "CNY", name: "یوان چین", category: "fiat", sellField: "cny1", buyField: "cny2" },
  { code: "SAR", name: "ریال عربستان", category: "fiat", sellField: "sar1", buyField: "sar2" },
  { code: "QAR", name: "ریال قطر", category: "fiat", sellField: "qar1", buyField: "qar2" },
  { code: "KWD", name: "دینار کویت", category: "fiat", sellField: "kwd1", buyField: "kwd2" },
  { code: "BHD", name: "دینار بحرین", category: "fiat", sellField: "bhd1", buyField: "bhd2" },
  { code: "OMR", name: "ریال عمان", category: "fiat", sellField: "omr1", buyField: "omr2" },
  { code: "IQD", name: "دینار عراق", category: "fiat", sellField: "iqd1", buyField: "iqd2" },
  { code: "INR", name: "روپیه هند", category: "fiat", sellField: "inr1", buyField: "inr2" },
  { code: "MYR", name: "رینگیت مالزی", category: "fiat", sellField: "myr1", buyField: "myr2" },
  { code: "THB", name: "بات تایلند", category: "fiat", sellField: "thb1", buyField: "thb2" },
  { code: "SGD", name: "دلار سنگاپور", category: "fiat", sellField: "sgd1", buyField: "sgd2" },
  { code: "HKD", name: "دلار هنگ‌کنگ", category: "fiat", sellField: "hkd1", buyField: "hkd2" },
  { code: "JPY", name: "ین ژاپن", category: "fiat", sellField: "jpy1", buyField: "jpy2" },
  { code: "RUB", name: "روبل روسیه", category: "fiat", sellField: "rub1", buyField: "rub2" },
  { code: "SEK", name: "کرون سوئد", category: "fiat", sellField: "sek1", buyField: "sek2" },
  { code: "NOK", name: "کرون نروژ", category: "fiat", sellField: "nok1", buyField: "nok2" },
  { code: "DKK", name: "کرون دانمارک", category: "fiat", sellField: "dkk1", buyField: "dkk2" },
  { code: "AZN", name: "منات آذربایجان", category: "fiat", sellField: "azn1", buyField: "azn2" },
  { code: "AMD", name: "درام ارمنستان", category: "fiat", sellField: "amd1", buyField: "amd2" },
  { code: "AFN", name: "افغانی افغانستان", category: "fiat", sellField: "afn1", buyField: "afn2" },

  { code: "AZADI_1", name: "سکه تمام آزادی", category: "gold", sellField: "azadi1", buyField: "azadi12" },
  { code: "AZADI_1_2", name: "نیم سکه آزادی", category: "gold", sellField: "azadi1_2", buyField: "azadi1_22" },
  { code: "EMAMI", name: "سکه امامی", category: "gold", sellField: "emami1", buyField: "emami12" },
  { code: "GERAMI", name: "سکه گرمی", category: "gold", sellField: "azadi1g", buyField: "azadi1g2" },
  { code: "MITHQAL", name: "مثقال طلا", category: "gold", sellField: "mithqal", buyField: null },
  { code: "OUNCE", name: "اونس جهانی طلا", category: "gold", sellField: "ounce", buyField: null },
];

export const DEFAULT_VISIBLE_CODES = CURRENCY_LIST.slice(0, 6).map((c) => c.code);

// Replicates the token handshake bonbast.com's own page does: the homepage embeds a
// one-time "hash,token,timestamp" param used to authorize the POST to their /json
// endpoint. There is no public API, so we fetch the page fresh each time and reuse it.
async function fetchBonbastRates() {
  const homeRes = await fetch("https://www.bonbast.com/", {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!homeRes.ok) throw new Error(`bonbast_home_http_${homeRes.status}`);
  const html = await homeRes.text();

  const cookies = (homeRes.headers.getSetCookie?.() ?? [])
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

  const paramMatch = html.match(/post\('\/json',\s*\{param:\s*"([0-9a-f]+,[A-Za-z0-9]+,[0-9-]+)"/);
  if (!paramMatch) throw new Error("bonbast_param_not_found");

  const jsonRes = await fetch("https://www.bonbast.com/json", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://www.bonbast.com/",
      Origin: "https://www.bonbast.com",
      "User-Agent": USER_AGENT,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: `param=${encodeURIComponent(paramMatch[1])}`,
  });
  if (!jsonRes.ok) throw new Error(`bonbast_json_http_${jsonRes.status}`);
  const data = await jsonRes.json();
  if (data?.rest) throw new Error("bonbast_rejected");
  return data;
}

// Bitmax's "BUY"/"SELL" sides are from the customer's perspective (BUY = price to
// buy USDT, the higher ask), which lines up with bonbast's sell/buy convention
// (sellN = ask, higher; buyN = bid, lower) used for every other currency here.
async function fetchUsdtRate() {
  const [buyRes, sellRes] = await Promise.all([
    fetch("https://api.bitmax.ir/watcher/price/?market=USDT-IRT&side=BUY", {
      headers: { "User-Agent": USER_AGENT },
    }),
    fetch("https://api.bitmax.ir/watcher/price/?market=USDT-IRT&side=SELL", {
      headers: { "User-Agent": USER_AGENT },
    }),
  ]);
  if (!buyRes.ok || !sellRes.ok) throw new Error("bitmax_http_error");
  const [buyData, sellData] = await Promise.all([buyRes.json(), sellRes.json()]);
  if (buyData?.error || sellData?.error) throw new Error("bitmax_rejected");
  return { sell: buyData.message.price, buy: sellData.message.price };
}

async function loadPreviousSells() {
  const result = await query(`SELECT code, sell FROM currency_rates`);
  return new Map(result.rows.map((row) => [row.code, row.sell === null ? null : Number(row.sell)]));
}

function computeChange(newSell, oldSell) {
  if (newSell == null || oldSell == null) return null;
  return newSell - oldSell;
}

export async function refreshCurrencyRates() {
  const [bonbastData, usdtRate] = await Promise.all([
    fetchBonbastRates(),
    fetchUsdtRate().catch((error) => {
      console.error("USDT rate fetch failed:", error.message);
      return null;
    }),
  ]);

  const previousSells = await loadPreviousSells();
  const rows = [];

  CURRENCY_LIST.forEach((currency, index) => {
    let sell = null;
    let buy = null;

    if (currency.code === "USDT") {
      if (usdtRate) {
        sell = usdtRate.sell;
        buy = usdtRate.buy;
      }
    } else {
      const rawSell = bonbastData[currency.sellField];
      const rawBuy = currency.buyField ? bonbastData[currency.buyField] : null;
      sell = rawSell != null ? Number(rawSell) : null;
      buy = rawBuy != null ? Number(rawBuy) : null;
    }

    if (sell == null) return;

    rows.push({
      code: currency.code,
      name: currency.name,
      category: currency.category,
      sell,
      buy,
      change: computeChange(sell, previousSells.get(currency.code) ?? null),
      sortOrder: index,
    });
  });

  await Promise.all(
    rows.map((row) =>
      query(
        `INSERT INTO currency_rates (code, name_fa, category, sell, buy, change, sort_order, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (code) DO UPDATE SET
           name_fa = EXCLUDED.name_fa,
           category = EXCLUDED.category,
           sell = EXCLUDED.sell,
           buy = EXCLUDED.buy,
           change = EXCLUDED.change,
           sort_order = EXCLUDED.sort_order,
           updated_at = EXCLUDED.updated_at`,
        [row.code, row.name, row.category, row.sell, row.buy, row.change, row.sortOrder],
      ),
    ),
  );

  return rows.length;
}
