import "dotenv/config";
import { Bot } from "grammy";
import cron from "node-cron";
import { handleStart, handleDashboard } from "./handlers/start.js";
import { handleTextMessage } from "./handlers/message.js";
import { handleVoiceMessage } from "./handlers/voice.js";
import { handleCallback } from "./handlers/callback.js";
import { query } from "../db/index.js";
import { refreshCurrencyRates } from "./services/currencyRates.js";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const REMINDER_MESSAGES_NO_EXPENSE_TODAY = [
  "امشب چیزی خرج کردی؟ اگه آره همین الان بنویس تا یادمون نره 😊",
  "وقت ثبت خرج‌های امروزه. حتی کوچیکاش هم مهمن!",
  "یه نگاه سریع به امروز بنداز؛ چیزی خرج شد که هنوز ثبت نکردی؟",
  "قبل از اینکه روز تموم شه، خرج‌هات رو بفرست که حسابمون مرتب بمونه.",
  "امروز پول کجا رفت؟ هرچی بوده همینجا بنویس، من ثبتش می‌کنم.",
  "یادآوری کوچیک آخر شب: اگه خرجی داشتی، الان بهترین وقته ثبتش کنی.",
  "بیا حساب امروز رو ببندیم. خرج‌هات رو یکی‌یکی بفرست.",
  "اگه امروز چیزی خریدی یا پرداختی داشتی، بهم بگو تا فراموش نشه.",
  "خرج‌های امروز منتظرن ثبت بشن. فقط یه پیام کوتاه کافیه.",
  "آخر شب وقتشه یه کم با پول‌هامون صادق باشیم 😄 خرجی داشتی؟",
  "امروز چی خرج کردی؟ بنویسش تا فردا دنبال عددها نگردی.",
  "یه دقیقه برای ثبت خرج‌های امروز؛ بعدش با خیال راحت برو سراغ استراحت.",
  "اگر امروز خرجی داشتی، همین الان بفرست. من مرتب و تمیز نگهش می‌دارم.",
  "حساب امروز رو یادت نره. حتی یه قهوه کوچیک هم ارزش ثبت شدن داره.",
  "قبل خواب، خرج‌های امروز رو جمع‌وجور کنیم؟",
  "یه یادآوری دوستانه: خرج‌های امروز رو ثبت کن تا آخر ماه غافلگیر نشی.",
  "امشب فقط یه کار کوچیک: خرج‌هات رو بفرست، بقیه‌اش با من.",
  "چیزی از خریدها یا پرداخت‌های امروز جا نمونده؟",
  "روز تموم شد، ولی خرج‌ها هنوز قابل ثبتن. بفرستشون اینجا.",
];

const REMINDER_MESSAGES_HAS_EXPENSE_TODAY = [
  "اگه خرج دیگه‌ای هم از امروز مونده، بفرست تا حساب امروز کامل بشه.",
  "امروز چندتا خرج ثبت کردی؛ اگه چیزی جا مونده، همین الان بگو.",
  "حساب امروز تقریباً جمعه. مورد دیگه‌ای هم هست که اضافه کنم؟",
  "قبل خواب یه نگاه آخر بنداز؛ خرج ثبت‌نشده‌ای نمونده؟",
  "اگه پرداخت کوچیکی از امروز یادت مونده، بفرست تا لیستت کامل‌تر بشه.",
  "مرتب پیش رفتیم امروز. فقط اگه چیزی جا افتاده، بهم بگو.",
  "خرج‌های امروز ثبت شدن؛ اگر مورد آخر شبی هم هست، همینجا بفرست.",
  "یه چک آخر برای امروز: چیزی هست که هنوز وارد نکرده باشی؟",
  "امروز رو تقریباً بستیم. اگه خرجی از قلم افتاده، من آماده‌ام.",
  "اگه هنوز یه خرید یا پرداخت کوچیک یادت افتاده، الان وقت خوبیه ثبتش کنیم.",
];

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

if (process.env.MINI_APP_URL) {
  await bot.api.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: "داشبورد",
      web_app: { url: process.env.MINI_APP_URL },
    },
  });
}

bot.command("start", handleStart);
bot.command("dashboard", handleDashboard);
bot.on("message:text", handleTextMessage);
bot.on("message:voice", handleVoiceMessage);
bot.on("callback_query:data", handleCallback);

cron.schedule(
  "0 22 * * *",
  async () => {
    const activeUsers = await query(
      `SELECT u.id,
              EXISTS (
                SELECT 1
                FROM expenses today
                WHERE today.user_id = u.id
                  AND today.deleted_at IS NULL
                  AND today.expense_date = (NOW() AT TIME ZONE 'Asia/Tehran')::date
              ) AS has_expense_today
       FROM users u
       WHERE EXISTS (
         SELECT 1
         FROM expenses e
         WHERE e.user_id = u.id
           AND e.deleted_at IS NULL
       )`,
    );

    await Promise.allSettled(
      activeUsers.rows.map((user) => {
        const messages = user.has_expense_today
          ? REMINDER_MESSAGES_HAS_EXPENSE_TODAY
          : REMINDER_MESSAGES_NO_EXPENSE_TODAY;

        return bot.api.sendMessage(user.id, pickRandom(messages));
      }),
    );
  },
  { timezone: "Asia/Tehran" },
);

cron.schedule(
  "2,32 * * * *",
  async () => {
    try {
      const count = await refreshCurrencyRates();
      console.log(`Currency rates refreshed: ${count} entries`);
    } catch (error) {
      console.error("Currency rate refresh failed:", error.message);
    }
  },
  { timezone: "Asia/Tehran" },
);

refreshCurrencyRates()
  .then((count) => console.log(`Currency rates seeded on boot: ${count} entries`))
  .catch((error) => console.error("Initial currency rate fetch failed:", error.message));

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start();
