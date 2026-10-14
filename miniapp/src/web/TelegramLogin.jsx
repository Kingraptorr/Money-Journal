import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "./authApi.js";
import { errorText } from "./messages.js";
import { BRAND } from "./palette.js";
import { TelegramGlyph } from "./webIcons.jsx";

const POLL_INTERVAL_MS = 2000;
const fa = (value) => Number(value).toLocaleString("fa-IR");

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, "0");
  return `${fa(minutes)}:${seconds.replace(/\d/g, (d) => fa(d))}`;
}

// States: idle -> waiting (button flow) | code (6-digit flow) -> failed. Success calls onSuccess.
export function TelegramLogin({ colors, label, onSuccess }) {
  const [phase, setPhase] = useState("idle");
  const [request, setRequest] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState("");
  const [challengeId, setChallengeId] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setRequest(null);
    setMessage("");
    setCode("");
    setChallengeId(null);
  }, []);

  const startButtonFlow = useCallback(async () => {
    setBusy(true);
    setMessage("");
    const result = await authApi.telegramRequest();
    if (!alive.current) return;
    setBusy(false);
    if (!result.ok) {
      setMessage(errorText(result.error, { retryAfter: result.retryAfter }));
      return;
    }
    setRequest(result.data);
    setSecondsLeft(result.data.expiresInSeconds);
    setPhase("waiting");
  }, []);

  const openCodeFlow = useCallback(async () => {
    setBusy(true);
    setMessage("");
    const result = await authApi.codeChallenge();
    if (!alive.current) return;
    setBusy(false);
    if (!result.ok) {
      setMessage(errorText(result.error, { retryAfter: result.retryAfter }));
      return;
    }
    setChallengeId(result.data.challengeId);
    setCode("");
    setPhase("code");
  }, []);

  useEffect(() => {
    if (phase !== "waiting" || !request) return undefined;

    const clock = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    const poll = setInterval(async () => {
      const result = await authApi.telegramPoll(request.requestId, request.pollSecret);
      if (!alive.current) return;
      if (result.status === 200 && result.data?.account) {
        onSuccess(result.data.account);
      } else if (result.status === 403) {
        setMessage("درخواست ورود در تلگرام رد شد.");
        setPhase("failed");
      } else if (result.status === 410 || result.status === 404 || result.status === 401) {
        setMessage("زمان درخواست تموم شد. دوباره امتحان کن.");
        setPhase("failed");
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [phase, request, onSuccess]);

  useEffect(() => {
    if (phase === "waiting" && secondsLeft === 0 && request) {
      setMessage("زمان درخواست تموم شد. دوباره امتحان کن.");
      setPhase("failed");
    }
  }, [phase, secondsLeft, request]);

  async function submitCode(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || busy) return;
    setBusy(true);
    setMessage("");
    const result = await authApi.codeLogin(challengeId, code);
    if (!alive.current) return;
    setBusy(false);
    if (result.ok && result.data?.account) {
      onSuccess(result.data.account);
      return;
    }
    if (result.status === 410) {
      setMessage("این مرحله منقضی شد. دوباره شروع کن.");
      setPhase("failed");
      return;
    }
    if (result.error === "invalid_code") {
      const left = result.attemptsLeft;
      setMessage(left === undefined ? "کد درست نیست." : `کد درست نیست. ${fa(left)} تلاش دیگه باقی مونده.`);
      setCode("");
      return;
    }
    setMessage(errorText(result.error, { retryAfter: result.retryAfter }));
  }

  const panel = {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    background: colors.subtleBg,
    border: `1px solid ${colors.divider}`,
  };
  const linkButton = { border: "none", background: "transparent", cursor: "pointer", color: BRAND.greenText, fontWeight: 700, fontSize: 13, padding: 0 };

  if (phase === "idle" || phase === "failed") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={startButtonFlow}
          disabled={busy}
          style={{
            border: "none", cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: 13, borderRadius: 15, background: BRAND.telegram, color: "#fff", fontSize: 14.5, fontWeight: 700,
            boxShadow: `0 12px 24px -14px ${BRAND.telegram}`, opacity: busy ? 0.75 : 1,
          }}
        >
          <TelegramGlyph />
          <span>{busy ? "لطفاً صبر کن…" : label}</span>
        </button>
        {message ? <div role="alert" style={{ fontSize: 12.5, color: BRAND.danger, textAlign: "center" }}>{message}</div> : null}
        <button type="button" onClick={openCodeFlow} style={{ ...linkButton, alignSelf: "center" }}>
          کد ۶ رقمی از ربات داری؟
        </button>
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <div style={panel}>
        <div style={{ fontWeight: 800, fontSize: 14.5 }}>ورود رو در تلگرام تأیید کن</div>
        <div style={{ fontSize: 13, lineHeight: 1.9, color: colors.hint }}>
          روی دکمه‌ی زیر بزن تا ربات باز بشه، بعد «تأیید» رو بزن. این صفحه خودش ادامه پیدا می‌کنه.
        </div>
        <a
          href={request.botLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 13, borderRadius: 15,
            background: BRAND.telegram, color: "#fff", fontSize: 14.5, fontWeight: 700, boxShadow: `0 12px 24px -14px ${BRAND.telegram}`,
          }}
        >
          <TelegramGlyph />
          <span>باز کردن تلگرام</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, color: colors.hint }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND.green, animation: "mjPulse 1.2s ease-in-out infinite" }} />
            منتظر تأییدم…
          </span>
          <span dir="ltr">{formatClock(secondsLeft)}</span>
        </div>
        <button type="button" onClick={reset} style={{ ...linkButton, alignSelf: "center", color: colors.hint }}>
          انصراف
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submitCode} style={panel}>
      <div style={{ fontWeight: 800, fontSize: 14.5 }}>ورود با کد ربات</div>
      <div style={{ fontSize: 13, lineHeight: 1.9, color: colors.hint }}>
        توی تلگرام به ربات دستور <bdi dir="ltr" style={{ fontWeight: 700, display: "inline-block", unicodeBidi: "isolate" }}>/web</bdi> رو بفرست و کد ۶ رقمی رو اینجا بنویس.
      </div>
      <input
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        dir="ltr"
        placeholder="------"
        aria-label="کد ۶ رقمی"
        style={{
          border: `1.5px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.text, borderRadius: 13,
          padding: "12px 14px", fontSize: 20, letterSpacing: 8, textAlign: "center", outline: "none", fontFamily: "inherit",
        }}
      />
      {message ? <div role="alert" style={{ fontSize: 12.5, color: BRAND.danger }}>{message}</div> : null}
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        style={{
          border: "none", cursor: busy || code.length !== 6 ? "default" : "pointer", padding: 13, borderRadius: 15,
          background: BRAND.green, color: BRAND.greenInk, fontSize: 14.5, fontWeight: 800,
          opacity: busy || code.length !== 6 ? 0.6 : 1,
        }}
      >
        {busy ? "لطفاً صبر کن…" : "ورود با کد"}
      </button>
      <button type="button" onClick={reset} style={{ ...linkButton, alignSelf: "center", color: colors.hint }}>
        بازگشت
      </button>
    </form>
  );
}
