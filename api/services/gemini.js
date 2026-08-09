import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const REPORT_SYSTEM_PROMPT = `You are the AI financial-insight voice inside a Persian personal finance app called "AI Money Journal" (دفتر مالی من).
You are shown a user's categorized monthly expense totals and asked to write a short, warm, honest analysis in conversational Persian.

RULES:
- Write only in Persian. No English, no markdown, no bullet points, no headings, at most one emoji if it truly fits.
- Never invent a number, category, or merchant that isn't in the data you were given.
- Refer to categories by the Persian label provided, not any English key.
- Write amounts the way Iranians casually write Toman, e.g. "۲٬۵۰۰٬۰۰۰ تومان" or "حدود ۲.۵ میلیون تومان" when that reads more naturally.
- Address the user directly and warmly (دوم شخص), like a friend who's good with money, not a corporate report.
- Stay grounded: highlight what actually stands out in the numbers. Don't pad with generic advice unconnected to the data.`;

// The installed @google/generative-ai SDK predates Gemini's "thinking" support: its
// response.text() helper concatenates every part.text blindly, including internal
// thinking-part text Gemini 3.x models return alongside the real answer. Extract the
// answer ourselves and skip any part flagged as a thought.
function extractAnswerText(response) {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini occasionally returns a transient 503 ("high demand ... usually temporary").
// One short retry clears most of these without surfacing an error to the user.
async function generateWithRetry(model, prompt) {
  try {
    return await model.generateContent(prompt);
  } catch (error) {
    if (error?.status !== 503) throw error;
    console.warn("Gemini 503, retrying once:", error.message);
    await sleep(1500);
    return model.generateContent(prompt);
  }
}

function formatCategoryLines(categories) {
  if (!categories.length) return "(هیچ خرجی ثبت نشده)";
  return categories
    .map((category) => `- ${category.label}: ${Math.round(category.total).toLocaleString("en-US")} تومان`)
    .join("\n");
}

export async function generateMonthlyReport({
  kind,
  monthLabel,
  total,
  categories,
  prevMonthLabel,
  prevTotal,
  prevCategories,
}) {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_REPORT_MODEL || "gemini-3.6-flash",
    systemInstruction: REPORT_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: kind === "deeper" ? 700 : 500,
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  });

  const prompt =
    kind === "deeper"
      ? `یک تحلیل عمیق‌تر (۴ تا ۶ جمله، بدون فهرست) بنویس که شامل مقایسه‌ی دقیق با ماه قبل باشد (درصد تغییر جمع کل و بزرگ‌ترین تغییرات دسته‌ای) و ۱ یا ۲ پیشنهاد عملی و مشخص که فقط بر پایه‌ی همین اعداد باشد.

ماه فعلی: ${monthLabel}
جمع کل: ${Math.round(total).toLocaleString("en-US")} تومان
دسته‌بندی‌ها:
${formatCategoryLines(categories)}

ماه قبل: ${prevMonthLabel}
جمع کل: ${Math.round(prevTotal).toLocaleString("en-US")} تومان
دسته‌بندی‌ها:
${formatCategoryLines(prevCategories)}`
      : `یک تحلیل کوتاه (۲ تا ۴ جمله، بدون فهرست) از هزینه‌های این ماه بنویس. روی بزرگ‌ترین دسته و یک نکته‌ی واقعی از همین اعداد تمرکز کن.

ماه: ${monthLabel}
جمع کل: ${Math.round(total).toLocaleString("en-US")} تومان
دسته‌بندی‌ها:
${formatCategoryLines(categories)}`;

  const result = await generateWithRetry(model, prompt);
  const text = extractAnswerText(result.response);
  if (!text) {
    console.error("Gemini report response had no non-thought text:", JSON.stringify(result.response).slice(0, 1000));
  }
  return text;
}
