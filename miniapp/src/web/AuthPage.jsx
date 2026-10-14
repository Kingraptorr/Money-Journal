import { useCallback, useState } from "react";
import { InstallPrompt } from "./InstallPrompt.jsx";
import { TelegramLogin } from "./TelegramLogin.jsx";
import { authApi } from "./authApi.js";
import { errorText } from "./messages.js";
import { BRAND, palette, useDark } from "./palette.js";
import { linkProps, navigate } from "./router.js";
import { EyeGlyph, EyeOffGlyph } from "./webIcons.jsx";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode, { name, email, password, confirm }) {
  const errors = {};
  if (mode === "register" && !name.trim()) errors.name = "نامت را وارد کن.";
  if (!email.trim()) errors.email = "ایمیل را وارد کن.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "ایمیل معتبر نیست.";
  if (!password) errors.password = "رمز عبور را وارد کن.";
  else if (mode === "register" && password.length < 8) errors.password = "رمز باید حداقل ۸ کاراکتر باشد.";
  if (mode === "register" && confirm !== password) errors.confirm = "رمزها یکسان نیستند.";
  return errors;
}

export function AuthPage({ mode, onAuthenticated }) {
  const dark = useDark();
  const c = palette(dark, "login");
  const isRegister = mode === "register";

  const [fields, setFields] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const errors = submitted ? validate(mode, fields) : {};
  const setField = (key) => (event) => setFields((current) => ({ ...current, [key]: event.target.value }));

  const handleSuccess = useCallback(
    (account) => {
      onAuthenticated(account);
    },
    [onAuthenticated],
  );

  async function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");
    if (loading || Object.keys(validate(mode, fields)).length > 0) return;

    setLoading(true);
    const email = fields.email.trim();
    const result = isRegister
      ? await authApi.signup(email, fields.password, fields.name.trim())
      : await authApi.login(email, fields.password);
    setLoading(false);

    if (result.ok && result.data?.account) {
      handleSuccess(result.data.account);
      return;
    }
    setServerError(errorText(result.error, { retryAfter: result.retryAfter }));
  }

  function switchTo(next) {
    setSubmitted(false);
    setServerError("");
    navigate(next === "register" ? "/register" : "/login", { replace: true });
  }

  const inputStyle = (hasError) => ({
    border: `1.5px solid ${hasError ? BRAND.danger : c.inputBorder}`,
    background: c.inputBg,
    color: c.text,
    borderRadius: 13,
    padding: "12px 14px",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
  });
  const labelStyle = { display: "flex", flexDirection: "column", gap: 6 };
  const errorStyle = { fontSize: 11.5, color: BRAND.danger };

  const tabs = [
    { key: "login", label: "ورود" },
    { key: "register", label: "ثبت‌نام" },
  ];

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh", background: c.bg, color: c.text, position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 32px",
      }}
    >
      <div style={{ position: "absolute", top: -160, right: -140, width: 520, height: 520, borderRadius: "50%", background: BRAND.green, opacity: 0.22, filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -180, left: -160, width: 480, height: 480, borderRadius: "50%", background: BRAND.green, opacity: 0.14, filter: "blur(110px)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", marginBottom: 28 }}>
        <a {...linkProps("/")} style={{ display: "flex", alignItems: "center", gap: 10, color: c.text }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: BRAND.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>م</span>
          <span style={{ fontWeight: 800, fontSize: 16 }}>دفتر خرج</span>
        </a>
        <a {...linkProps("/")} style={{ fontSize: 13, fontWeight: 600, color: c.hint }}>بازگشت</a>
      </div>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", marginBottom: 14 }}>
        <InstallPrompt colors={c} compact />
      </div>

      <div
        style={{
          width: "100%", maxWidth: 420, position: "relative", background: c.cardBg,
          backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: `1px solid ${c.glassBorder}`, borderRadius: 28, padding: "26px 22px",
          boxShadow: "0 30px 60px -30px rgba(0,0,0,.3)", display: "flex", flexDirection: "column", gap: 18,
          animation: "fadeUp .45s ease both",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 900 }}>{isRegister ? "ساخت حساب جدید" : "خوش برگشتی"}</h1>
          <div style={{ fontSize: 13.5, color: c.hint }}>{isRegister ? "در کمتر از یک دقیقه شروع کن." : "برای ادامه وارد حسابت شو."}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: c.subtleBg }}>
          {tabs.map((tab) => {
            const active = tab.key === mode;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchTo(tab.key)}
                style={{
                  border: "none", cursor: "pointer", padding: 10, borderRadius: 11, fontSize: 13.5, fontWeight: 700, transition: "all .15s ease",
                  background: active ? c.tabActiveBg : "transparent",
                  color: active ? c.tabActiveText : c.hint,
                  boxShadow: active ? "0 4px 12px -6px rgba(0,0,0,.2)" : "none",
                  fontFamily: "inherit",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <TelegramLogin colors={c} label={isRegister ? "ثبت‌نام با تلگرام" : "ورود با تلگرام"} onSuccess={handleSuccess} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: c.hint }}>
          <span style={{ flex: 1, height: 1, background: c.divider }} />
          یا با ایمیل
          <span style={{ flex: 1, height: 1, background: c.divider }} />
        </div>

        <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12, margin: 0 }}>
          {isRegister ? (
            <label style={labelStyle}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>نام</span>
              <input type="text" autoComplete="name" value={fields.name} onChange={setField("name")} placeholder="مثلاً سارا" style={inputStyle(errors.name)} />
              {errors.name ? <span style={errorStyle}>{errors.name}</span> : null}
            </label>
          ) : null}

          <label style={labelStyle}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>ایمیل</span>
            <input
              type="email"
              dir="ltr"
              autoComplete="email"
              value={fields.email}
              onChange={setField("email")}
              placeholder="you@example.com"
              style={{ ...inputStyle(errors.email), textAlign: "left" }}
            />
            {errors.email ? <span style={errorStyle}>{errors.email}</span> : null}
          </label>

          <label style={labelStyle}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>رمز عبور</span>
            <span
              style={{
                display: "flex", alignItems: "center", border: `1.5px solid ${errors.password ? BRAND.danger : c.inputBorder}`,
                background: c.inputBg, borderRadius: 13, padding: "0 6px 0 14px",
              }}
            >
              <input
                type={showPass ? "text" : "password"}
                dir="ltr"
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={fields.password}
                onChange={setField("password")}
                placeholder="••••••••"
                style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", color: c.text, padding: "12px 0", fontSize: 14, outline: "none", textAlign: "left", fontFamily: "inherit" }}
              />
              <button
                type="button"
                onClick={() => setShowPass((value) => !value)}
                aria-label="نمایش رمز"
                style={{ border: "none", background: "transparent", cursor: "pointer", color: c.hint, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {showPass ? <EyeOffGlyph /> : <EyeGlyph />}
              </button>
            </span>
            {errors.password ? <span style={errorStyle}>{errors.password}</span> : null}
          </label>

          {isRegister ? (
            <label style={labelStyle}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>تکرار رمز عبور</span>
              <input
                type={showPass ? "text" : "password"}
                dir="ltr"
                autoComplete="new-password"
                value={fields.confirm}
                onChange={setField("confirm")}
                placeholder="••••••••"
                style={{ ...inputStyle(errors.confirm), textAlign: "left" }}
              />
              {errors.confirm ? <span style={errorStyle}>{errors.confirm}</span> : null}
            </label>
          ) : null}

          {serverError ? (
            <div role="alert" style={{ fontSize: 12.5, color: BRAND.danger, background: "rgba(217,83,79,.1)", borderRadius: 12, padding: "10px 12px" }}>
              {serverError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6, border: "none", cursor: loading ? "default" : "pointer", padding: 14, borderRadius: 15,
              background: BRAND.green, color: BRAND.greenInk, fontSize: 15, fontWeight: 800,
              boxShadow: `0 14px 28px -14px ${BRAND.green}`, opacity: loading ? 0.75 : 1, fontFamily: "inherit",
            }}
          >
            {loading ? "لطفاً صبر کن…" : isRegister ? "ساخت حساب" : "ورود"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: 13, color: c.hint }}>
          {isRegister ? "حساب داری؟" : "حساب نداری؟"}
          <button
            type="button"
            onClick={() => switchTo(isRegister ? "login" : "register")}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: BRAND.greenText, fontWeight: 700, fontSize: 13, padding: "0 4px", fontFamily: "inherit" }}
          >
            {isRegister ? "وارد شو" : "ثبت‌نام کن"}
          </button>
        </div>

        <div style={{ textAlign: "center", fontSize: 11.5, color: c.hint, lineHeight: 1.9 }}>
          {isRegister
            ? "بازیابی رمز عبور فعلاً فعال نیست؛ برای اطمینان، بعد از ثبت‌نام تلگرامت رو هم به حساب وصل کن."
            : "اگه رمزت رو فراموش کردی، با دکمه‌ی تلگرام وارد شو."}
        </div>
      </div>
    </div>
  );
}
