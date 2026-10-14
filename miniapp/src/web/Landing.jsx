import { useEffect, useState } from "react";
import { InstallPrompt } from "./InstallPrompt.jsx";
import { BRAND, palette, useDark } from "./palette.js";
import { linkProps } from "./router.js";
import { BoltGlyph, CoinGlyph, PieGlyph, SparkGlyph } from "./webIcons.jsx";

const FEATURES = [
  { icon: <BoltGlyph />, title: "ثبت خرج در چند ثانیه", desc: "مبلغ، دسته و یادداشت؛ همین. بدون فرم‌های طولانی." },
  { icon: <PieGlyph />, title: "دسته‌بندی شفاف", desc: "ببین هر ماه چقدر برای خرید، غذا، رفت‌وآمد و تفریح خرج کرده‌ای." },
  { icon: <SparkGlyph />, title: "تحلیل هوشمند ماهانه", desc: "یک خلاصه‌ی ساده با پیشنهادهای عملی برای کمتر خرج کردن." },
  { icon: <CoinGlyph />, title: "نرخ لحظه‌ای ارز و طلا", desc: "قیمت دلار، یورو، سکه و طلا را کنار خرج‌هایت دنبال کن." },
];

const STEPS = [
  { num: "۱", title: "حساب بساز", desc: "با تلگرام یا ایمیل در کمتر از یک دقیقه وارد شو." },
  { num: "۲", title: "خرج‌ها را ثبت کن", desc: "هر خرج را با یک لمس روی دکمه‌ی + اضافه کن." },
  { num: "۳", title: "تحلیل بگیر", desc: "آخر ماه، گزارش هوشمند را ببین و برنامه‌ریزی کن." },
];

const PREVIEW_ROWS = [
  { label: "غذا و رستوران", amount: "۴۹۰٬۰۰۰", share: 78, color: "#4F86C6" },
  { label: "خرید روزانه", amount: "۳۱۰٬۰۰۰", share: 52, color: "#63B995" },
  { label: "حمل‌ونقل", amount: "۲۱۰٬۰۰۰", share: 36, color: "#F0A500" },
  { label: "قهوه", amount: "۱۲۰٬۰۰۰", share: 22, color: "#8B5E3C" },
];

function AppPreview({ dark }) {
  const text = dark ? "#f2f2f2" : "#111";
  const hint = dark ? "#8a8a8a" : "#7a7a7a";
  return (
    <div dir="rtl" style={{ width: "100%", height: "100%", background: dark ? "#0d0d0d" : "#f0f0f0", color: text, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 12, color: hint }}>سلام! این خلاصه‌ی ماه توئه 🌿</div>
      <div style={{ background: BRAND.green, color: "#111", borderRadius: 22, padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11.5, opacity: 0.75, fontWeight: 600 }}>مجموع خرج این ماه</div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>۱٬۱۳۰٬۰۰۰ <span style={{ fontSize: 12, fontWeight: 700 }}>تومان</span></div>
        <div style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, background: "rgba(0,0,0,.08)", borderRadius: 999, padding: "4px 10px" }}>۱۲٪ کمتر از ماه قبل</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, background: dark ? "rgba(30,30,30,.55)" : "rgba(255,255,255,.6)", borderRadius: 20, padding: 14 }}>
        {PREVIEW_ROWS.map((row) => (
          <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
              <span>{row.label}</span>
              <span style={{ color: hint }}>{row.amount}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)" }}>
              <div style={{ width: `${row.share}%`, height: "100%", borderRadius: 999, background: row.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Landing() {
  const dark = useDark();
  const c = palette(dark, "landing");
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const wide = width >= 900;
  const glass = {
    background: c.cardBg,
    border: `1px solid ${c.glassBorder}`,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
  };
  const section = { display: "flex", justifyContent: "center", position: "relative" };
  const inner = { width: "100%", maxWidth: 1120 };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: c.bg, color: c.text, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -180, right: -160, width: 620, height: 620, borderRadius: "50%", background: BRAND.green, opacity: 0.22, filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 700, left: -200, width: 520, height: 520, borderRadius: "50%", background: BRAND.green, opacity: 0.14, filter: "blur(110px)", pointerEvents: "none" }} />

      <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "center", padding: "14px 16px" }}>
        <div style={{ ...inner, ...glass, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 20, padding: "10px 12px 10px 10px", boxShadow: c.softShadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: BRAND.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>م</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>دفتر خرج</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {wide ? (
              <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                <a href="#features" style={{ color: c.hint, fontSize: 13.5, fontWeight: 600, padding: "8px 12px", borderRadius: 12 }}>امکانات</a>
                <a href="#how" style={{ color: c.hint, fontSize: 13.5, fontWeight: 600, padding: "8px 12px", borderRadius: 12 }}>چطور کار می‌کند</a>
              </div>
            ) : null}
            <a {...linkProps("/login")} style={{ color: c.text, fontSize: 13.5, fontWeight: 700, padding: "9px 14px", borderRadius: 12 }}>ورود</a>
            <a {...linkProps("/register")} style={{ background: BRAND.green, color: "#fff", fontSize: 13.5, fontWeight: 700, padding: "9px 16px", borderRadius: 12, boxShadow: `0 8px 18px -10px ${BRAND.green}` }}>
              ثبت‌نام رایگان
            </a>
          </div>
        </div>
      </div>

      <div style={{ ...section, padding: "40px 20px 24px" }}>
        <div style={{ ...inner, display: "grid", gridTemplateColumns: wide ? "minmax(0,1.1fr) minmax(0,.9fr)" : "minmax(0,1fr)", gap: 48, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, animation: "fadeUp .5s ease both" }}>
            <span style={{ ...glass, alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: c.hint }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND.green }} />
              همراه با تحلیل هوشمند ماهانه
            </span>
            <h1 style={{ margin: 0, fontSize: wide ? 52 : 36, lineHeight: 1.35, fontWeight: 900, letterSpacing: "-.5px", textWrap: "balance" }}>
              بدون دردسر بفهم <span style={{ color: BRAND.greenText }}>پولت کجا می‌رود</span>
            </h1>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 2, color: c.hint, maxWidth: 480, textWrap: "pretty" }}>
              خرج‌هایت را در چند ثانیه ثبت کن، دسته‌بندی‌ها را ببین و هر ماه یک خلاصه‌ی ساده و کاربردی از هوش مصنوعی بگیر.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a {...linkProps("/register")} style={{ background: BRAND.green, color: "#fff", fontSize: 15, fontWeight: 800, padding: "14px 26px", borderRadius: 16, boxShadow: `0 14px 30px -14px ${BRAND.green}` }}>
                شروع رایگان
              </a>
              <a href="#how" style={{ ...glass, color: c.text, fontSize: 15, fontWeight: 700, padding: "14px 22px", borderRadius: 16 }}>بیشتر بدانید</a>
            </div>
            <div style={{ maxWidth: 480 }}>
              <InstallPrompt colors={c} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", animation: "fadeUp .65s ease both" }}>
            <div style={{ ...glass, width: 290, height: 590, borderRadius: 44, padding: 10, boxShadow: "0 40px 80px -30px rgba(0,0,0,.35)" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: 34, overflow: "hidden", position: "relative" }}>
                <AppPreview dark={dark} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="features" style={{ ...section, padding: "56px 20px 24px" }}>
        <div style={{ ...inner, display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 560 }}>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>هر چیزی که برای مدیریت خرج لازم داری</h2>
            <p style={{ margin: 0, fontSize: 15, color: c.hint, lineHeight: 1.9 }}>ساده، سریع و بدون جدول‌های پیچیده.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {FEATURES.map((feature) => (
              <div key={feature.title} style={{ ...glass, borderRadius: 22, padding: 22, boxShadow: c.softShadow, display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 14, background: "#3DDC9726", color: BRAND.greenText, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {feature.icon}
                </span>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{feature.title}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.9, color: c.hint, textWrap: "pretty" }}>{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="how" style={{ ...section, padding: "56px 20px 24px" }}>
        <div style={{ ...inner, display: "flex", flexDirection: "column", gap: 28 }}>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>در سه قدم شروع کن</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {STEPS.map((step) => (
              <div key={step.num} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "6px 0" }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, border: `1.5px solid ${BRAND.green}`, color: BRAND.greenText, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15 }}>
                  {step.num}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800 }}>{step.title}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.9, color: c.hint }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...section, padding: "56px 20px 40px" }}>
        <div
          style={{
            ...inner, background: BRAND.green, color: BRAND.greenInk, borderRadius: 28, padding: wide ? "36px 40px" : "26px 22px",
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20,
            boxShadow: `0 30px 60px -30px ${BRAND.green}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 26, fontWeight: 900 }}>همین امروز شروع کن</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>ثبت‌نام کمتر از یک دقیقه طول می‌کشد.</div>
          </div>
          <a {...linkProps("/register")} style={{ background: "#0d0d0d", color: "#fff", fontSize: 15, fontWeight: 800, padding: "14px 26px", borderRadius: 16 }}>
            ساخت حساب رایگان
          </a>
        </div>
      </div>

      <div style={{ ...section, padding: "10px 20px 32px" }}>
        <div style={{ ...inner, fontSize: 12.5, color: c.hint, borderTop: `1px solid ${c.divider}`, paddingTop: 20 }}>
          © ۱۴۰۵ دفتر خرج
        </div>
      </div>
    </div>
  );
}
