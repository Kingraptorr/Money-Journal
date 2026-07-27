import { InlineKeyboard } from "grammy";
import { upsertUser } from "../../db/index.js";

export async function handleStart(ctx) {
  await upsertUser(ctx.from);
  await ctx.reply(`سلام! 👋 به AI Money Journal خوش اومدی.
هر خرجی داری بنویس یا ضبط صدا بفرست — من ثبتش می‌کنم.

مثلاً:
• ناهار ۸۰ هزار تومان
• بنزین ۴۰۰ تومن
• Netflix €12.99

برای مشاهده داشبورد: /dashboard`);
}

export async function handleDashboard(ctx) {
  const miniAppUrl = process.env.MINI_APP_URL;
  if (!miniAppUrl) {
    await ctx.reply("آدرس داشبورد هنوز تنظیم نشده.");
    return;
  }

  const keyboard = new InlineKeyboard().webApp("باز کردن داشبورد", miniAppUrl);
  await ctx.reply("داشبورد مالی‌ات اینجاست:", { reply_markup: keyboard });
}
