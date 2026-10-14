import { InlineKeyboard } from "grammy";
import { handleWebLoginStart } from "./webLogin.js";
import { handleLinkToken } from "./linking.js";

export async function handleStart(ctx) {
  const payload = String(ctx.match ?? "");
  if (/^web_[0-9a-f-]{36}$/i.test(payload)) {
    await handleWebLoginStart(ctx, payload.slice(4));
    return;
  }
  if (/^link_[A-Za-z0-9_-]{20}$/.test(payload)) {
    await handleLinkToken(ctx, payload.slice(5));
    return;
  }

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
