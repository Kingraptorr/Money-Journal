import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "../web/authApi.js";
import { errorText } from "../web/messages.js";

const fa = (value) => Number(value).toLocaleString("fa-IR");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cardStyle = {
  background: "var(--tg-theme-secondary-bg-color)",
  border: "1px solid var(--app-glass-border)",
  boxShadow: "var(--app-shadow)",
};
const inputClass = "w-full rounded-[13px] border bg-transparent px-3.5 py-3 text-[14px] text-tg-text outline-none";
const inputStyle = { borderColor: "var(--app-glass-border)", background: "var(--app-subtle-bg)" };
const primaryButton = "rounded-[14px] px-4 py-3 text-[14px] font-bold";

function Row({ title, hint, action }) {
  return (
    <div className="flex items-center gap-3 border-b p-4" style={{ borderColor: "var(--app-divider-color)" }}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold text-tg-text">{title}</span>
        {hint ? <span dir="auto" className="truncate text-[12.5px] text-tg-hint">{hint}</span> : null}
      </div>
      {action}
    </div>
  );
}

function ActionButton({ children, onClick, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-[12px] px-3.5 py-2 text-[13px] font-bold"
      style={
        danger
          ? { background: "var(--app-delete-bg)", color: "var(--tg-theme-destructive-text-color)" }
          : { background: "color-mix(in srgb, var(--tg-theme-button-color) 16%, transparent)", color: "var(--tg-theme-text-color)" }
      }
    >
      {children}
    </button>
  );
}

function Message({ kind, children }) {
  if (!children) return null;
  const ok = kind === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      className="rounded-[12px] px-3 py-2.5 text-[12.5px]"
      style={{
        background: ok ? "color-mix(in srgb, var(--tg-theme-button-color) 14%, transparent)" : "var(--app-delete-bg)",
        color: ok ? "var(--tg-theme-text-color)" : "var(--tg-theme-destructive-text-color)",
      }}
    >
      {children}
    </div>
  );
}

function AddEmailForm({ onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) return setError("ایمیل معتبر نیست.");
    if (password.length < 8) return setError("رمز باید حداقل ۸ کاراکتر باشد.");
    if (password !== confirm) return setError("رمزها یکسان نیستند.");
    setBusy(true);
    setError("");
    const result = await authApi.linkEmail(email.trim(), password);
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error, { retryAfter: result.retryAfter }));
    onDone("ایمیل و رمز عبور به حساب اضافه شد. حالا با ایمیل هم می‌تونی وارد وب‌اپ بشی.");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-4" noValidate>
      <input dir="ltr" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} style={inputStyle} />
      <input dir="ltr" type="password" autoComplete="new-password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} style={inputStyle} />
      <input dir="ltr" type="password" autoComplete="new-password" placeholder="تکرار رمز عبور" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} style={inputStyle} />
      <Message kind="error">{error}</Message>
      <button type="submit" disabled={busy} className={primaryButton} style={{ background: "var(--tg-theme-button-color)", color: "var(--app-hero-text)", opacity: busy ? 0.7 : 1 }}>
        {busy ? "لطفاً صبر کن…" : "افزودن ایمیل"}
      </button>
    </form>
  );
}

function ChangePasswordForm({ onDone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!current) return setError("رمز فعلی را وارد کن.");
    if (next.length < 8) return setError("رمز جدید باید حداقل ۸ کاراکتر باشد.");
    if (next !== confirm) return setError("رمزها یکسان نیستند.");
    setBusy(true);
    setError("");
    const result = await authApi.changePassword(current, next);
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error, { retryAfter: result.retryAfter }));
    onDone("رمز عبور عوض شد و بقیه‌ی دستگاه‌ها از حسابت خارج شدند.");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-4" noValidate>
      <input dir="ltr" type="password" autoComplete="current-password" placeholder="رمز فعلی" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} style={inputStyle} />
      <input dir="ltr" type="password" autoComplete="new-password" placeholder="رمز جدید" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} style={inputStyle} />
      <input dir="ltr" type="password" autoComplete="new-password" placeholder="تکرار رمز جدید" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} style={inputStyle} />
      <Message kind="error">{error}</Message>
      <button type="submit" disabled={busy} className={primaryButton} style={{ background: "var(--tg-theme-button-color)", color: "var(--app-hero-text)", opacity: busy ? 0.7 : 1 }}>
        {busy ? "لطفاً صبر کن…" : "تغییر رمز عبور"}
      </button>
    </form>
  );
}

function ConnectTelegram({ webMode, onConnected }) {
  const [link, setLink] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    setBusy(true);
    setError("");
    const result = await authApi.linkTelegram();
    if (!alive.current) return;
    setBusy(false);
    if (!result.ok) return setError(errorText(result.error, { retryAfter: result.retryAfter }));
    setLink(result.data);
    setSecondsLeft(result.data.expiresInSeconds);
  }, []);

  useEffect(() => {
    if (!link) return undefined;
    const clock = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    const poll = setInterval(async () => {
      const result = await authApi.me();
      if (!alive.current) return;
      if (result.status === 401) {
        // The Telegram account's data survived the link, so this web session was retired: sign in again.
        if (webMode) window.dispatchEvent(new Event("mj:auth-expired"));
        return;
      }
      if (result.ok && result.data?.account?.hasTelegram) onConnected();
    }, 3000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [link, webMode, onConnected]);

  if (!link) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="text-[13px] leading-7 text-tg-hint">
          تلگرامت رو وصل کن تا خرج‌ها رو با پیام و صدا هم ثبت کنی و بات و وب‌اپ یک حساب مشترک داشته باشن.
        </div>
        <Message kind="error">{error}</Message>
        <button type="button" onClick={start} disabled={busy} className={primaryButton} style={{ background: "var(--tg-theme-button-color)", color: "var(--app-hero-text)", opacity: busy ? 0.7 : 1 }}>
          {busy ? "لطفاً صبر کن…" : "ساخت لینک اتصال"}
        </button>
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="text-[13px] leading-7 text-tg-hint">
        روی دکمه بزن، ربات رو باز کن و اتصال رو تأیید کن. بعد از تأیید، این صفحه خودش به‌روز می‌شه.
      </div>
      <a
        href={link.botLink}
        target="_blank"
        rel="noopener noreferrer"
        className={`${primaryButton} text-center`}
        style={{ background: "#2AABEE", color: "#fff" }}
      >
        باز کردن تلگرام
      </a>
      <div className="text-[12px] leading-6 text-tg-hint">
        یا توی ربات بنویس: <bdi dir="ltr" className="inline-block font-bold text-tg-text" style={{ unicodeBidi: "isolate" }}>/link {link.token}</bdi>
      </div>
      <div className="text-[12px] text-tg-hint">
        {secondsLeft > 0 ? `${fa(minutes)} دقیقه و ${fa(secondsLeft % 60)} ثانیه اعتبار داره.` : "این لینک منقضی شد؛ دوباره بساز."}
      </div>
    </div>
  );
}

export function AccountSection({ webMode, onLogout }) {
  const [account, setAccount] = useState(null);
  const [failed, setFailed] = useState(false);
  const [panel, setPanel] = useState(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const result = await authApi.me();
    if (result.ok) {
      setAccount(result.data.account);
      setFailed(false);
    } else if (result.status !== 401) {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const finish = useCallback(
    (text) => {
      setPanel(null);
      setNotice(text);
      refresh();
    },
    [refresh],
  );

  async function logoutAll() {
    if (!window.confirm("از همه‌ی دستگاه‌ها خارج بشی؟")) return;
    await authApi.logoutAll();
    window.dispatchEvent(new Event("mj:auth-expired"));
  }

  if (failed) return null;
  if (!account) {
    return <div className="glass-card h-24 animate-pulse rounded-[20px]" style={cardStyle} />;
  }

  const toggle = (name) => setPanel((current) => (current === name ? null : name));

  return (
    <div className="glass-card overflow-hidden rounded-[20px]" style={cardStyle}>
      <div className="border-b px-4 py-3 text-[12.5px] font-bold text-tg-hint" style={{ borderColor: "var(--app-divider-color)" }}>
        حساب کاربری
      </div>

      <Message kind="ok">{notice}</Message>

      <Row
        title="ایمیل"
        hint={account.email ?? "وصل نشده"}
        action={
          !account.email && account.hasTelegram ? (
            <ActionButton onClick={() => toggle("email")}>{panel === "email" ? "بستن" : "افزودن"}</ActionButton>
          ) : null
        }
      />
      {panel === "email" ? <AddEmailForm onDone={finish} /> : null}

      <Row
        title="تلگرام"
        hint={account.hasTelegram ? "وصل شده" : "وصل نشده"}
        action={
          !account.hasTelegram && account.email ? (
            <ActionButton onClick={() => toggle("telegram")}>{panel === "telegram" ? "بستن" : "اتصال"}</ActionButton>
          ) : null
        }
      />
      {panel === "telegram" ? <ConnectTelegram webMode={webMode} onConnected={() => finish("تلگرام به حساب وصل شد.")} /> : null}

      {account.hasPassword ? (
        <>
          <Row title="رمز عبور" hint="بازیابی رمز عبور فعلاً فعال نیست" action={<ActionButton onClick={() => toggle("password")}>{panel === "password" ? "بستن" : "تغییر"}</ActionButton>} />
          {panel === "password" ? <ChangePasswordForm onDone={finish} /> : null}
        </>
      ) : null}

      {webMode ? (
        <div className="flex flex-col gap-2 p-4">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-[14px] px-4 py-3 text-[14px] font-bold"
            style={{ background: "var(--app-subtle-bg)", color: "var(--tg-theme-text-color)" }}
          >
            خروج از حساب
          </button>
          <button
            type="button"
            onClick={logoutAll}
            className="rounded-[14px] px-4 py-3 text-[13px] font-semibold"
            style={{ color: "var(--tg-theme-destructive-text-color)" }}
          >
            خروج از همه‌ی دستگاه‌ها
          </button>
        </div>
      ) : null}
    </div>
  );
}
