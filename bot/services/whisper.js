import "dotenv/config";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function transcribeVoice(audioBuffer, mimeType = "audio/ogg") {
  const file = new File([audioBuffer], "voice.ogg", { type: mimeType });
  return groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    language: "fa",
    response_format: "text",
  });
}
