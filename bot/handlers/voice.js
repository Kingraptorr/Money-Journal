import { transcribeVoice } from "../services/whisper.js";
import { normalizeVoiceTranscript } from "../services/gemini.js";
import { processUserText } from "./message.js";

function normalizeTranscription(transcription) {
  if (typeof transcription === "string") return transcription.trim();
  if (typeof transcription?.text === "string") return transcription.text.trim();
  return String(transcription ?? "").trim();
}

function buildVoiceErrorMessage(error) {
  const message = String(error?.message ?? error ?? "");

  if (/401|api.?key|unauthorized|invalid/i.test(message)) {
    return "سرویس تبدیل صدا تنظیمات دسترسی معتبری ندارد. لطفاً بعداً دوباره امتحان کن.";
  }

  if (/429|rate|quota|too many/i.test(message)) {
    return "سرویس تبدیل صدا فعلاً به محدودیت استفاده خورده. چند دقیقه دیگه دوباره امتحان کن.";
  }

  if (/telegram voice download/i.test(message)) {
    return "نتونستم فایل صدای تلگرام رو دریافت کنم. لطفاً دوباره صدا رو بفرست.";
  }

  return "مشکلی در پردازش صدا پیش اومد. لطفاً در محیط کم‌صدا، کوتاه‌تر و واضح‌تر بگو یا متنش رو بنویس.";
}

export async function handleVoiceMessage(ctx) {
  try {
    const file = await ctx.getFile();
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Telegram voice download failed: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const transcription = normalizeTranscription(await transcribeVoice(audioBuffer, "audio/ogg"));

    console.info("Voice transcription completed:", {
      length: transcription.length,
      preview: transcription.slice(0, 120),
    });

    if (!transcription) {
      await ctx.reply("صدات قابل تشخیص نبود. لطفاً در محیط کم‌صدا دوباره بفرست یا متن خرج رو بنویس.");
      return;
    }

    const normalized = await normalizeVoiceTranscript(transcription);

    if (!normalized.ok) {
      await ctx.reply(normalized.user_message);
      return;
    }

    if (normalized.corrected_text !== transcription) {
      console.info("Voice transcription normalized:", {
        raw: transcription.slice(0, 120),
        corrected: normalized.corrected_text.slice(0, 120),
      });
    }

    await processUserText(ctx, normalized.corrected_text, {
      source: "voice",
      rawTranscription: transcription,
    });
  } catch (error) {
    console.error("Voice handling failed:", error);
    await ctx.reply(buildVoiceErrorMessage(error));
  }
}
