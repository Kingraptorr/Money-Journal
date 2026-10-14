import { InlineKeyboard } from "grammy";
import { completeLink, isLinkToken, previewLink } from "../../db/linking.js";
import { createRateLimiter } from "../../api/middleware/rateLimit.js";

const attemptsByTelegramUser = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 8 });
const INVALID_TEXT = "این لینک اتصال دیگه معتبر نیست. از تنظیمات وب‌اپ دوباره بساز.";

const fa = (value) => Number(value).toLocaleString("fa-IR");

function describeSide(summary) {
  if (!summary.hasData) return "خالی";
  const parts = [];
  if (summary.expenses) parts.push(`${fa(summary.expenses)} خرج`);
  if (summary.debts) parts.push(`${fa(summary.debts)} بدهی`);
  if (summary.reports) parts.push(`${fa(summary.reports)} گزارش`);
  if (summary.customCategories) parts.push(`${fa(summary.customCategories)} دسته‌بندی شخصی‌سازی‌شده`);
  return parts.join("، ");
}

export async function handleLinkToken(ctx, token) {
  const gate = attemptsByTelegramUser.check(`link:${ctx.from.id}`);
  if (!gate.allowed) {
    await ctx.reply("تعداد تلاش‌هات زیاد بود. یه ساعت دیگه دوباره امتحان کن.");
    return;
  }

  const preview = isLinkToken(token) ? await previewLink(token, ctx.from.id) : null;
  if (!preview) {
    await ctx.reply(INVALID_TEXT);
    return;
  }

  if (preview.blocked === "both_have_data") {
    await ctx.reply(
      `هم حساب ایمیل (${describeSide(preview.emailSide)}) و هم این چت (${describeSide(preview.telegramSide)}) اطلاعات دارن. برای اینکه چیزی از دست نره، فعلاً نمی‌شه این دو حساب رو با هم ادغام کرد؛ همین‌طور جدا ازشون استفاده کن.`,
    );
    return;
  }
  if (preview.blocked === "telegram_account_has_email") {
    await ctx.reply("این حساب تلگرام قبلاً به یک ایمیل وصله.");
    return;
  }
  if (preview.blocked === "already_linked") {
    await ctx.reply("این حساب‌ها قبلاً به هم وصل شدن.");
    return;
  }
  if (preview.blocked) {
    await ctx.reply(INVALID_TEXT);
    return;
  }

  await ctx.reply(
    `🔗 اتصال تلگرام به حساب وب‌اپ\n\nحساب ایمیل: ${preview.email}\n\n• اطلاعات حساب ایمیل: ${describeSide(preview.emailSide)}\n• اطلاعات این چت تلگرام: ${describeSide(preview.telegramSide)}\n\nبا تأیید، از این به بعد هم با ایمیل و هم با تلگرام وارد یک حساب مشترک می‌شی. اگه خودت این درخواست رو از وب‌اپ نساختی، لغو کن.`,
    {
      reply_markup: new InlineKeyboard()
        .text("تأیید اتصال ✓", `link:confirm:${preview.codeId}`)
        .text("لغو ✗", `link:cancel:${preview.codeId}`),
    },
  );
}

export async function handleLinkCommand(ctx) {
  const token = String(ctx.match ?? "").trim();
  if (!token) {
    await ctx.reply("کد اتصال رو بعد از دستور بنویس، مثلاً: /link CODE\nیا از دکمه‌ی «اتصال تلگرام» توی تنظیمات وب‌اپ استفاده کن.");
    return;
  }
  await handleLinkToken(ctx, token);
}

export async function handleLinkCallback(ctx, data) {
  const [, action, codeId] = data.split(":");
  await ctx.answerCallbackQuery();

  if (action === "cancel") {
    await ctx.editMessageText("باشه، اتصال لغو شد و هیچ چیزی تغییر نکرد.");
    return;
  }
  if (action !== "confirm" || !codeId) {
    await ctx.editMessageText(INVALID_TEXT);
    return;
  }

  const outcome = await completeLink(codeId, ctx.from.id);

  if (outcome.result === "linked") {
    await ctx.editMessageText(
      outcome.survivor === "email"
        ? "✅ وصل شد. از این به بعد بات و وب‌اپ یک حساب مشترک دارن."
        : `✅ وصل شد. ایمیل ${outcome.email} حالا به همین حساب تلگرام وصله. اگه توی وب‌اپ با ایمیل وارد بودی، یک‌بار دیگه وارد شو.`,
    );
    return;
  }
  if (outcome.result === "both_have_data") {
    await ctx.editMessageText("هر دو حساب اطلاعات دارن و برای جلوگیری از از دست رفتن اطلاعات، ادغام انجام نشد.");
    return;
  }
  if (outcome.result === "telegram_account_has_email") {
    await ctx.editMessageText("این حساب تلگرام قبلاً به یک ایمیل وصله.");
    return;
  }
  if (outcome.result === "already_linked") {
    await ctx.editMessageText("این حساب‌ها قبلاً به هم وصل شدن.");
    return;
  }
  await ctx.editMessageText(INVALID_TEXT);
}
