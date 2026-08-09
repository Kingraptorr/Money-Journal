import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jalaali from "jalaali-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

function getDates() {
  const today = tehranToday();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const lastThursday = new Date(today);
  const day = today.getDay();
  const daysBack = (day + 3) % 7 || 7;
  lastThursday.setDate(today.getDate() - daysBack);
  const fmt = (d) => d.toISOString().split("T")[0];
  return {
    TODAY_ISO: fmt(today),
    YESTERDAY_ISO: fmt(yesterday),
    LAST_THURSDAY_ISO: fmt(lastThursday),
  };
}

function tehranToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

function toIsoDate({ gy, gm, gd }) {
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

const SYSTEM_PROMPT = `You are the AI core of a personal finance app called "AI Money Journal".
Your only job is to extract structured expense data from user messages.
Users are Persian speakers. Messages may be in Persian, English, or a mix of both.
Persian numerals (۱۲۳) and Arabic numerals (123) are both valid.
Informal, colloquial, and abbreviated Persian is expected.

Today's date is: {{TODAY_ISO}}  (e.g. 2024-12-06)

---

VALID CATEGORIES (use the English key in your output, match using the Persian label):
Coffee              → coffee            (coffee, cafe, Coffee, Cafe, قهوه، کافه، کافی‌شاپ)
Nastaran            → nastaran          (Nastaran, nastaran, نسترن)
غذا و رستوران       → food_dining       (رستوران، فست‌فود، پیتزا، لازانیا، ساندویچ)
خرید روزانه         → groceries         (سوپرمارکت، میوه، بقالی، نانوایی)
حمل‌ونقل            → transportation    (تاکسی، اسنپ، مترو، اتوبوس، قطار، بلیت قطار، کرایه)
سلامت               → health            (دارو، دکتر، آزمایشگاه، دندانپزشک)
اشتراک              → subscriptions     (فیلیمو، نتفلیکس، اسپاتیفای، یوتیوب پریمیوم)
خرید                → shopping          (لباس، کفش، لوازم خانه، آنلاین‌شاپ)
مسکن                → housing           (اجاره، رهن، شارژ ساختمان، تعمیرات خانه)
آموزش               → education         (کتاب، دوره آنلاین، آموزشگاه، دانشگاه)
تفریح               → entertainment     (سینما، کنسرت، بازی، پارک)
مراقبت شخصی         → personal_care     (آرایشگاه، لوازم بهداشتی، سالن زیبایی)
سفر                 → travel            (هتل، تور، اقامت، ویلا، هزینه‌های داخل سفر؛ بلیت قطار شهری/بین‌شهری را transportation بگذار)
هدیه                → gifts             (کادو، گل، کارت هدیه)
قبوض                → utilities         (برق، آب، گاز، اینترنت، تلفن)
خودرو               → car               (بنزین، تعمیرگاه، بیمه خودرو، لاستیک، معاینه فنی، کارواش)
بدهی و قرض          → debts             (قسط، وام، بدهی، قرض دادن، پس دادن پول)
سایر                → other             (هر چیزی که در دسته‌های بالا نباشد)

---

VALID CURRENCIES:
- IRT  → Iranian Toman (تومان). Default if no currency is mentioned and context is Persian.
- IRR  → Iranian Rial (ریال)
- EUR  → Euro (€)
- USD  → US Dollar ($)
- GBP  → British Pound (£)
- TRY  → Turkish Lira

AMOUNT RULES:
- "صد تومن" = 100 IRT
- "سیصد هزار" = 300,000 IRT
- "یه میلیون" = 1,000,000 IRT
- "یه و نیم میلیون" = 1,500,000 IRT
- "بیست و پنج" = 25 (use context for unit)
- If an Iranian toman amount is a 3 or 4 digit shorthand without "هزار" or "میلیون", infer thousands: "300 تومن" = 300,000 IRT and "1200 تومن" = 1,200,000 IRT.
- If the user says "تومن", "تومان", or gives no currency in a Persian message → IRT
- If the user says "ریال" → IRR
- Multiply Rial amounts by 0.1 to normalize to Toman only if explicitly asked — otherwise keep as-is

DATE RULES:
- "امروز" or no date mentioned → TODAY_ISO
- "دیروز" or "yesterday" → TODAY_ISO minus 1 day
- "پریروز" → TODAY_ISO minus 2 days
- "فردا" → reject (future dates are not valid expenses)
- Explicit dates like "پنجشنبه" → calculate the most recent past Thursday
- Explicit Solar Hijri / Shamsi / Jalali dates like "۱۴۰۵/۰۴/۲۹", "1405-04-29", or "۲۹ تیر ۱۴۰۵" → convert to Gregorian YYYY-MM-DD in output.
- If date is ambiguous and cannot be resolved → use TODAY_ISO

ACTION DETECTION:
The user may be logging an expense OR requesting a deletion.
- If the message clearly requests deleting/removing a record → set action to "delete"
- Otherwise → set action to "log"
- Any message that contains an amount, currency, or price-like expression is an expense log, even if the item is unusual, private, adult, medical, sensitive, embarrassing, or hard to categorize.
- If the expense item does not fit any category, use category "other". Do not reject it.

---

OUTPUT FORMAT:
Always respond with a single valid JSON object. No markdown. No explanation. No extra text.

For a LOG action:
{
  "action": "log",
  "amount": <number or null>,
  "currency": "<IRT|IRR|EUR|USD|GBP|TRY>",
  "category": "<English key from the valid categories list>",
  "merchant": "<string or null>",
  "date": "<YYYY-MM-DD>",
  "note": "<optional short note in Persian, max 10 words, or null>",
  "confidence": <0.0 to 1.0>,
  "needs_clarification": <true or false>,
  "clarification_question": "<Persian question to ask user, or null>"
}

For a DELETE action:
{
  "action": "delete",
  "target": "<last|specific>",
  "hint": "<brief description of the record the user wants to delete, in Persian, or null>",
  "confidence": <0.0 to 1.0>
}

---

CONFIDENCE AND CLARIFICATION RULES:
- confidence = 1.0 → you are certain about all fields
- confidence < 0.7 → set needs_clarification to true and provide clarification_question
- If amount is null → always set needs_clarification to true
- If an amount is present but the category is unclear → use category "other" with confidence >= 0.7 and needs_clarification false.
- If the message has nothing to do with money or deletion → return:
  {
    "action": "irrelevant",
    "clarification_question": "متوجه نشدم! می‌تونی یه خرج بنویسی؟ مثلاً: ناهار ۵۰ هزار تومان"
  }

---

NEVER:
- Invent amounts that are not in the message
- Use a category key outside the valid list
- Return any text outside the JSON object
- Set a future date
- Refuse, moralize, or avoid logging uncommon/private/sensitive purchases when an amount is present`;

const FEW_SHOT_EXAMPLES = `USER: کافه ۴۵ هزار
ASSISTANT: {"action":"log","amount":45000,"currency":"IRT","category":"coffee","merchant":null,"date":"{{TODAY_ISO}}","note":"کافه","confidence":0.95,"needs_clarification":false,"clarification_question":null}
USER: رفتم اسنپ گرفتم، ۸۰ تومن شد
ASSISTANT: {"action":"log","amount":80000,"currency":"IRT","category":"transportation","merchant":"اسنپ","date":"{{TODAY_ISO}}","note":null,"confidence":0.98,"needs_clarification":false,"clarification_question":null}
USER: دیروز داروخونه ۲۳۰ هزار تومان
ASSISTANT: {"action":"log","amount":230000,"currency":"IRT","category":"health","merchant":null,"date":"{{YESTERDAY_ISO}}","note":"داروخانه","confidence":0.97,"needs_clarification":false,"clarification_question":null}
USER: Netflix €12.99
ASSISTANT: {"action":"log","amount":12.99,"currency":"EUR","category":"subscriptions","merchant":"Netflix","date":"{{TODAY_ISO}}","note":null,"confidence":1.0,"needs_clarification":false,"clarification_question":null}
USER: lunch 25 dollars with the team
ASSISTANT: {"action":"log","amount":25,"currency":"USD","category":"food_dining","merchant":null,"date":"{{TODAY_ISO}}","note":"ناهار با تیم","confidence":0.95,"needs_clarification":false,"clarification_question":null}
USER: قهوه ۸۰ تومن
ASSISTANT: {"action":"log","amount":80000,"currency":"IRT","category":"coffee","merchant":null,"date":"{{TODAY_ISO}}","note":"قهوه","confidence":0.98,"needs_clarification":false,"clarification_question":null}
USER: Nastaran ۳۰۰ تومن
ASSISTANT: {"action":"log","amount":300000,"currency":"IRT","category":"nastaran","merchant":null,"date":"{{TODAY_ISO}}","note":"Nastaran","confidence":0.98,"needs_clarification":false,"clarification_question":null}
USER: نسترن ۵۰۰ هزار
ASSISTANT: {"action":"log","amount":500000,"currency":"IRT","category":"nastaran","merchant":null,"date":"{{TODAY_ISO}}","note":"نسترن","confidence":0.98,"needs_clarification":false,"clarification_question":null}
USER: یه میلیون و نیم کرایه خونه دادم
ASSISTANT: {"action":"log","amount":1500000,"currency":"IRT","category":"housing","merchant":null,"date":"{{TODAY_ISO}}","note":"کرایه","confidence":0.97,"needs_clarification":false,"clarification_question":null}
USER: بنزین زدم ۴۰۰ تومن
ASSISTANT: {"action":"log","amount":400000,"currency":"IRT","category":"car","merchant":null,"date":"{{TODAY_ISO}}","note":"بنزین","confidence":0.98,"needs_clarification":false,"clarification_question":null}
USER: تعمیرگاه ماشین ۲ میلیون
ASSISTANT: {"action":"log","amount":2000000,"currency":"IRT","category":"car","merchant":null,"date":"{{TODAY_ISO}}","note":"تعمیرگاه","confidence":0.97,"needs_clarification":false,"clarification_question":null}
USER: قسط وام بانکم رو دادم، یه و نیم میلیون
ASSISTANT: {"action":"log","amount":1500000,"currency":"IRT","category":"debts","merchant":null,"date":"{{TODAY_ISO}}","note":"قسط وام","confidence":0.98,"needs_clarification":false,"clarification_question":null}
USER: به رضا ۵۰۰ تومن قرض دادم
ASSISTANT: {"action":"log","amount":500000,"currency":"IRT","category":"debts","merchant":"رضا","date":"{{TODAY_ISO}}","note":"قرض","confidence":0.96,"needs_clarification":false,"clarification_question":null}
USER: بیمه ماشین ۳ میلیون و دویست
ASSISTANT: {"action":"log","amount":3200000,"currency":"IRT","category":"car","merchant":null,"date":"{{TODAY_ISO}}","note":"بیمه خودرو","confidence":0.97,"needs_clarification":false,"clarification_question":null}
USER: خرید
ASSISTANT: {"action":"log","amount":null,"currency":"IRT","category":"shopping","merchant":null,"date":"{{TODAY_ISO}}","note":null,"confidence":0.3,"needs_clarification":true,"clarification_question":"چقدر خرج کردی؟"}
USER: حذف آخرین خرید
ASSISTANT: {"action":"delete","target":"last","hint":null,"confidence":0.99}
USER: اون ناهار دیروز رو پاک کن
ASSISTANT: {"action":"delete","target":"specific","hint":"ناهار دیروز","confidence":0.92}
USER: سلام چطوری؟
ASSISTANT: {"action":"irrelevant","clarification_question":"متوجه نشدم! می‌تونی یه خرج بنویسی؟ مثلاً: ناهار ۵۰ هزار تومان"}
USER: gas €40 yesterday
ASSISTANT: {"action":"log","amount":40,"currency":"EUR","category":"car","merchant":null,"date":"{{YESTERDAY_ISO}}","note":"بنزین","confidence":0.97,"needs_clarification":false,"clarification_question":null}
USER: پنجشنبه رستوران مشهدی ۴۵۰
ASSISTANT: {"action":"log","amount":450000,"currency":"IRT","category":"food_dining","merchant":"رستوران مشهدی","date":"{{LAST_THURSDAY_ISO}}","note":null,"confidence":0.9,"needs_clarification":false,"clarification_question":null}
USER: لاستیک ماشینم رو عوض کردم ۸۰۰
ASSISTANT: {"action":"log","amount":800000,"currency":"IRT","category":"car","merchant":null,"date":"{{TODAY_ISO}}","note":"لاستیک","confidence":0.96,"needs_clarification":false,"clarification_question":null}
USER: ژل تاخیری ۲۰۰ تومن
ASSISTANT: {"action":"log","amount":200000,"currency":"IRT","category":"other","merchant":null,"date":"{{TODAY_ISO}}","note":"ژل تاخیری","confidence":0.86,"needs_clarification":false,"clarification_question":null}
USER: کفش ۱۲۰۰ تومن
ASSISTANT: {"action":"log","amount":1200000,"currency":"IRT","category":"shopping","merchant":null,"date":"{{TODAY_ISO}}","note":"کفش","confidence":0.9,"needs_clarification":false,"clarification_question":null}
USER: ۱۴۰۵/۰۴/۲۹ برگر ۹۰۰ هزار
ASSISTANT: {"action":"log","amount":900000,"currency":"IRT","category":"food_dining","merchant":null,"date":"2026-07-20","note":"برگر","confidence":0.9,"needs_clarification":false,"clarification_question":null}
USER: لازانیا ۱۲۸۰ تومان
ASSISTANT: {"action":"log","amount":1280000,"currency":"IRT","category":"food_dining","merchant":null,"date":"{{TODAY_ISO}}","note":"لازانیا","confidence":0.9,"needs_clarification":false,"clarification_question":null}
USER: بلیت قطار ۴۵۰ تومن
ASSISTANT: {"action":"log","amount":450000,"currency":"IRT","category":"transportation","merchant":null,"date":"{{TODAY_ISO}}","note":"بلیت قطار","confidence":0.9,"needs_clarification":false,"clarification_question":null}`;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

function extractJalaliDate(message) {
  const normalized = normalizeDigits(message);
  const numericDateMatch = normalized.match(/(?:^|[^\d])(13\d{2}|14\d{2})[/-](0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])(?:$|[^\d])/);

  if (numericDateMatch) {
    const [, jyRaw, jmRaw, jdRaw] = numericDateMatch;
    const jy = Number(jyRaw);
    const jm = Number(jmRaw);
    const jd = Number(jdRaw);

    if (jalaali.isValidJalaaliDate(jy, jm, jd)) {
      return toIsoDate(jalaali.toGregorian(jy, jm, jd));
    }
  }

  const monthNames = [
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
  const namedDateMatch = normalized.match(/(?:^|[^\d])([1-9]|[12]\d|3[01])\s+(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)(?:\s+(13\d{2}|14\d{2}))?(?=$|[^\p{L}\d])/u);

  if (namedDateMatch) {
    const jd = Number(namedDateMatch[1]);
    const jm = monthNames.indexOf(namedDateMatch[2]) + 1;
    const todayJalali = jalaali.toJalaali(tehranToday());
    const jy = Number(namedDateMatch[3] ?? todayJalali.jy);

    if (jalaali.isValidJalaaliDate(jy, jm, jd)) {
      return toIsoDate(jalaali.toGregorian(jy, jm, jd));
    }
  }

  return null;
}

function removeJalaliDateFragments(message) {
  return normalizeDigits(message)
    .replace(/(?:^|[^\d])(13\d{2}|14\d{2})[/-](0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])(?=$|[^\d])/g, " ")
    .replace(/(?:^|[^\d])([1-9]|[12]\d|3[01])\s+(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)(?:\s+(13\d{2}|14\d{2}))?(?=$|[^\p{L}\d])/gu, " ");
}

function cleanExpenseName(value) {
  return removeJalaliDateFragments(value)
    .replace(/[۰-۹٠-٩\d.,٬]+/g, " ")
    .replace(/(تومن|تومان|ریال|دلار|یورو|پوند|لیر|هزار|میلیون|ملیون)/g, " ")
    .replace(/(دادم|خریدم|پرداخت کردم|خرج کردم|هزینه کردم|شد|بود)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function categorizeByKeywords(value) {
  const text = String(value ?? "").trim();
  const rules = [
    {
      category: "nastaran",
      pattern: /(نسترن|Nastaran)/i,
    },
    {
      category: "coffee",
      pattern: /(coffee|cafe|قهوه|کافه|کافی\s*شاپ)/i,
    },
    {
      category: "food_dining",
      pattern:
        /(غذا|رستوران|فست\s*فود|ناهار|شام|صبحانه|پیتزا|لازانیا|برگر|ساندویچ|کباب|جوجه|سالاد|چای|آبمیوه|نوشیدنی|کیک|شیرینی|بستنی)/,
    },
    {
      category: "groceries",
      pattern: /(سوپر|سوپرمارکت|میوه|سبزی|بقالی|نانوایی|نان|برنج|گوشت|مرغ|ماست|شیر|پنیر|تخم\s*مرغ)/,
    },
    {
      category: "transportation",
      pattern: /(تاکسی|اسنپ|تپسی|مترو|اتوبوس|بی\s*آر\s*تی|قطار|بلیت|بلیط|کرایه|هواپیما|پرواز|ترمینال)/,
    },
    {
      category: "health",
      pattern: /(دارو|داروخونه|داروخانه|دکتر|پزشک|آزمایشگاه|دندانپزشک|درمان|ویزیت|بیمارستان)/,
    },
    {
      category: "subscriptions",
      pattern: /(اشتراک|نتفلیکس|Netflix|اسپاتیفای|Spotify|فیلیمو|نماوا|یوتیوب|YouTube)/i,
    },
    {
      category: "shopping",
      pattern: /(لباس|کفش|کیف|خرید|آنلاین\s*شاپ|دیجی\s*کالا|لوازم|وسیله)/,
    },
    {
      category: "housing",
      pattern: /(اجاره|رهن|شارژ ساختمان|تعمیرات خانه|خانه|منزل)/,
    },
    {
      category: "education",
      pattern: /(کتاب|دوره|کلاس|آموزش|دانشگاه|مدرسه|آموزشگاه)/,
    },
    {
      category: "entertainment",
      pattern: /(سینما|کنسرت|بازی|پارک|تفریح|تئاتر)/,
    },
    {
      category: "personal_care",
      pattern: /(آرایشگاه|سالن|اصلاح|لوازم بهداشتی|شامپو|ژل|کرم|عطر)/,
    },
    {
      category: "travel",
      pattern: /(سفر|هتل|اقامت|تور|ویلا|بلیط هواپیما|بلیت هواپیما)/,
    },
    {
      category: "gifts",
      pattern: /(کادو|هدیه|گل|کارت هدیه)/,
    },
    {
      category: "utilities",
      pattern: /(قبض|برق|آب|گاز|اینترنت|تلفن|موبایل|شارژ سیمکارت)/,
    },
    {
      category: "car",
      pattern: /(بنزین|ماشین|خودرو|کارواش|تعمیرگاه|لاستیک|بیمه ماشین|بیمه خودرو|معاینه فنی|روغن موتور)/,
    },
    {
      category: "debts",
      pattern: /(قسط|وام|بدهی|قرض|پس دادم|طلب)/,
    },
  ];

  return rules.find((rule) => rule.pattern.test(text))?.category ?? "other";
}

function normalizeTomanShorthandAmount(amount, originalMessage) {
  if (!amount || amount >= 10_000) return amount;
  const normalized = normalizeDigits(originalMessage).replace(/[,٬]/g, "");
  const amountPattern = String(Math.trunc(amount)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const amountWithToman = new RegExp(`(^|\\D)${amountPattern}(?:\\.0+)?\\s*(تومن|تومان)(\\D|$)`);

  return amountWithToman.test(normalized) ? amount * 1_000 : amount;
}

function extractFallbackAmount(message) {
  const normalized = removeJalaliDateFragments(message).replace(/[,٬]/g, "");
  const numericMatch = normalized.match(/(\d+(?:\.\d+)?)/);

  if (numericMatch) {
    let amount = Number(numericMatch[1]);
    const afterNumber = normalized.slice(numericMatch.index + numericMatch[0].length);
    const beforeAndAfter = normalized.slice(Math.max(0, numericMatch.index - 18), numericMatch.index + 36);
    const hasIranianCurrency = /(تومن|تومان|هزار|میلیون|ملیون)/.test(beforeAndAfter);

    if (/میلیون|ملیون/.test(beforeAndAfter)) amount *= 1_000_000;
    else if (/هزار/.test(beforeAndAfter)) amount *= 1_000;
    else if (/(تومن|تومان)/.test(afterNumber) && amount < 10_000) amount *= 1_000;
    else if (hasIranianCurrency && amount < 10_000) amount *= 1_000;

    return amount;
  }

  const wordAmounts = [
    [/یه و نیم|یک و نیم/, 1_500_000],
    [/دو و نیم/, 2_500_000],
    [/سه و نیم/, 3_500_000],
    [/یک میلیون|یه میلیون/, 1_000_000],
    [/دو میلیون/, 2_000_000],
    [/سه میلیون/, 3_000_000],
    [/چهار میلیون/, 4_000_000],
    [/پنج میلیون/, 5_000_000],
    [/صد هزار/, 100_000],
    [/دویست هزار/, 200_000],
    [/سیصد هزار/, 300_000],
    [/چهارصد هزار/, 400_000],
    [/پانصد هزار/, 500_000],
    [/هشتاد هزار/, 80_000],
    [/پنجاه هزار/, 50_000],
    [/بیست و پنج هزار/, 25_000],
  ];

  return wordAmounts.find(([pattern]) => pattern.test(message))?.[1] ?? null;
}

function buildFallbackExpense(message) {
  const amount = extractFallbackAmount(message);
  const jalaliDate = extractJalaliDate(message);
  if (!amount) return null;

  const note = cleanExpenseName(message);
  const category = categorizeByKeywords(note || message);

  return {
    action: "log",
    amount,
    currency: /ریال/.test(message) ? "IRR" : "IRT",
    category,
    merchant: null,
    date: jalaliDate || getDates().TODAY_ISO,
    note: note || "خرج",
    confidence: 0.72,
    needs_clarification: false,
    clarification_question: null,
    fallback: true,
  };
}

function normalizeExtraction(extraction, originalMessage) {
  const jalaliDate = extractJalaliDate(originalMessage);
  const cleanNote = (value) => cleanExpenseName(value || "");
  const originalExpenseName = cleanExpenseName(originalMessage);
  const cleanedNote = cleanNote(extraction?.note) || cleanNote(originalMessage);
  const cleanedMerchant = cleanNote(extraction?.merchant);
  const inferredCategory = categorizeByKeywords(
    [cleanedNote, cleanedMerchant, originalMessage].filter(Boolean).join(" "),
  );
  const finalCategory =
    ["coffee", "nastaran"].includes(inferredCategory) ||
    !extraction?.category ||
    extraction.category === "other"
      ? inferredCategory
      : extraction.category;

  if (extraction?.action === "log" && extraction.amount && !extraction.category) {
    return {
      ...extraction,
      amount: normalizeTomanShorthandAmount(extraction.amount, originalMessage),
      category: finalCategory,
      merchant: cleanedMerchant || null,
      note: originalExpenseName || cleanedNote || extraction.note,
      date: jalaliDate || extraction.date || getDates().TODAY_ISO,
    };
  }

  if (extraction?.action === "log") {
    return {
      ...extraction,
      amount: normalizeTomanShorthandAmount(extraction.amount, originalMessage),
      category: finalCategory,
      merchant: cleanedMerchant || extraction.merchant,
      note: originalExpenseName || cleanedNote || extraction.note,
      date: jalaliDate || extraction.date || getDates().TODAY_ISO,
    };
  }

  if (
    (extraction?.action === "irrelevant" || extraction?.needs_clarification || extraction?.amount == null) &&
    buildFallbackExpense(originalMessage)
  ) {
    return buildFallbackExpense(originalMessage);
  }

  return extraction;
}

function parseGeminiJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("Gemini response was not valid JSON");
    }
  }
}

export async function normalizeVoiceTranscript(transcription) {
  const normalizedTranscript =
    typeof transcription === "string" ? transcription.trim() : String(transcription ?? "").trim();

  if (!normalizedTranscript) {
    return {
      ok: false,
      corrected_text: null,
      reason: "empty_transcription",
      user_message: "صدات قابل تشخیص نبود. لطفاً در محیط کم‌صدا دوباره بفرست یا متن خرج رو بنویس.",
    };
  }

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    systemInstruction: `You clean up Persian speech-to-text output for an expense logging bot.
The transcript may contain background-noise mistakes, typos, homophones, wrong spacing, or malformed Persian words.
Infer the most likely expense phrase only when enough evidence exists.
Keep amounts exactly as intended. Convert obvious speech mistakes like "دومان" to "تومان" and "سد" to "صد".
Do not invent an amount if no amount-like phrase exists.
Return only JSON.

Output:
{"ok":true,"corrected_text":"<clean Persian expense phrase>","reason":null}
or
{"ok":false,"corrected_text":null,"reason":"<short English reason>","user_message":"<clear Persian message for the user>"}`,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 160,
    },
  });

  const result = await model.generateContent(`TRANSCRIPT: ${normalizedTranscript}`);
  const raw = result.response.text();

  try {
    const parsed = parseGeminiJson(raw);
    if (parsed?.ok && parsed.corrected_text) {
      return {
        ok: true,
        corrected_text: String(parsed.corrected_text).trim(),
        reason: null,
        raw_transcription: normalizedTranscript,
      };
    }

    return {
      ok: false,
      corrected_text: null,
      reason: parsed?.reason || "unclear_transcription",
      user_message:
        parsed?.user_message ||
        `صدات رو این‌طوری شنیدم: «${normalizedTranscript}»

مبلغ یا نام خرج واضح نبود. لطفاً در محیط کم‌صدا دوباره بگو یا متنش رو بنویس.`,
      raw_transcription: normalizedTranscript,
    };
  } catch (error) {
    console.error("Voice transcript normalization failed:", {
      message: error.message,
      rawPreview: raw.slice(0, 500),
      transcriptPreview: normalizedTranscript.slice(0, 200),
    });

    return {
      ok: true,
      corrected_text: normalizedTranscript,
      reason: "normalization_parse_failed",
      raw_transcription: normalizedTranscript,
    };
  }
}

export async function extractExpense(userMessage) {
  const normalizedMessage =
    typeof userMessage === "string" ? userMessage.trim() : String(userMessage ?? "").trim();

  if (!normalizedMessage) {
    return {
      action: "irrelevant",
      clarification_question: "متن پیام خالی بود. می‌تونی دوباره بفرستی؟",
    };
  }

  const dates = getDates();
  const replaceDates = (value) =>
    value
      .replace(/{{TODAY_ISO}}/g, dates.TODAY_ISO)
      .replace(/{{YESTERDAY_ISO}}/g, dates.YESTERDAY_ISO)
      .replace(/{{LAST_THURSDAY_ISO}}/g, dates.LAST_THURSDAY_ISO);

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    systemInstruction: replaceDates(SYSTEM_PROMPT),
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 512,
    },
  });

  const prompt = `${replaceDates(FEW_SHOT_EXAMPLES)}\n\nUSER: ${normalizedMessage}\nASSISTANT:`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  try {
    return normalizeExtraction(parseGeminiJson(raw), normalizedMessage);
  } catch (error) {
    console.error("Gemini JSON parse failed:", {
      message: error.message,
      rawPreview: raw.slice(0, 500),
      inputPreview: normalizedMessage.slice(0, 200),
    });
    return buildFallbackExpense(normalizedMessage) ?? {
      action: "irrelevant",
      clarification_question: "مشکلی پیش اومد! می‌تونی دوباره بنویسی؟",
    };
  }
}
