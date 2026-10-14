import { InlineKeyboard } from "grammy";
import {
  approveLoginRequest,
  getPendingLoginRequest,
  isRequestId,
  issueWebLoginCode,
  rejectLoginRequest,
} from "../../db/webLogin.js";

const EXPIRED_TEXT = "این درخواست ورود دیگه معتبر نیست. از وب‌اپ دوباره تلاش کن.";

export async function handleWebLoginStart(ctx, requestId) {
  const request = await getPendingLoginRequest(requestId);
  if (!request) {
    await ctx.reply(EXPIRED_TEXT);
    return;
  }

  const device = request.deviceLabel || "یک دستگاه ناشناس";
  await ctx.reply(
    `🔐 درخواست ورود به وب‌اپ\n\nدستگاه: ${device}\n\nاگه خودت همین الان این درخواست رو ساختی تأیید کن. اگه نه، رد کن.`,
    {
      reply_markup: new InlineKeyboard()
        .text("تأیید ✓", `weblogin:approve:${request.id}`)
        .text("رد ✗", `weblogin:reject:${request.id}`),
    },
  );
}

export async function handleWebLoginCallback(ctx, data) {
  const [, action, requestId] = data.split(":");
  await ctx.answerCallbackQuery();

  if (!isRequestId(requestId) || (action !== "approve" && action !== "reject")) {
    await ctx.editMessageText(EXPIRED_TEXT);
    return;
  }

  if (action === "approve") {
    const ok = await approveLoginRequest(requestId, ctx.account.id);
    await ctx.editMessageText(ok ? "✅ ورود تأیید شد. حالا می‌تونی به وب‌اپ برگردی." : EXPIRED_TEXT);
    return;
  }

  const ok = await rejectLoginRequest(requestId, ctx.account.id);
  await ctx.editMessageText(ok ? "❌ درخواست ورود رد شد." : EXPIRED_TEXT);
}

export async function handleWebCode(ctx) {
  const { code, expiresInSeconds } = await issueWebLoginCode(ctx.account.id);
  const minutes = Math.round(expiresInSeconds / 60).toLocaleString("fa-IR");
  await ctx.reply(
    `🔑 کد ورود به وب‌اپ:\n\n<code>${code}</code>\n\nاین کد ${minutes} دقیقه معتبره و فقط یک‌بار قابل استفاده‌ست. توی صفحه‌ی ورود وب‌اپ واردش کن. اگه خودت درخواست ندادی، نادیده‌اش بگیر.`,
    { parse_mode: "HTML" },
  );
}
