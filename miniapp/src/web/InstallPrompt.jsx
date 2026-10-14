import { useEffect, useState } from "react";
import { BRAND } from "./palette.js";
import { PhoneGlyph, ShareGlyph } from "./webIcons.jsx";

const DISMISS_KEY = "mj-install-dismissed";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isMobile() {
  return /android|iphone|ipad|ipod/i.test(window.navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function InstallPrompt({ colors, compact = false }) {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [standalone] = useState(isStandalone);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setDeferred(event);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (standalone || dismissed) return null;
  const ios = isIos();
  if (!deferred && !isMobile()) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage unavailable; dismissal lasts for this view only
    }
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
  }

  return (
    <div
      style={{
        display: "flex", gap: 12, alignItems: "flex-start", padding: compact ? "12px 14px" : "14px 16px", borderRadius: 18,
        background: colors.cardBg, border: `1px solid ${colors.glassBorder}`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <span style={{ width: 38, height: 38, borderRadius: 12, background: "#3DDC9726", color: BRAND.greenText, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <PhoneGlyph />
      </span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5 }}>اپ رو به صفحه‌ی اصلی گوشی اضافه کن</div>
        {ios ? (
          <div style={{ fontSize: 12.5, lineHeight: 1.9, color: colors.hint }}>
            در Safari دکمه‌ی اشتراک‌گذاری <span style={{ display: "inline-flex", verticalAlign: "middle", color: BRAND.greenText }}><ShareGlyph /></span> رو بزن و
            «Add to Home Screen» رو انتخاب کن. بعد از اون، از همون آیکون وارد شو.
          </div>
        ) : deferred ? (
          <div style={{ fontSize: 12.5, lineHeight: 1.9, color: colors.hint }}>مثل یک اپ معمولی، با یک لمس باز می‌شه.</div>
        ) : (
          <div style={{ fontSize: 12.5, lineHeight: 1.9, color: colors.hint }}>
            از منوی مرورگر گزینه‌ی «Add to Home screen» یا «نصب برنامه» رو بزن.
          </div>
        )}
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {deferred ? (
            <button
              type="button"
              onClick={install}
              style={{ border: "none", cursor: "pointer", background: BRAND.green, color: BRAND.greenInk, fontWeight: 800, fontSize: 12.5, padding: "8px 14px", borderRadius: 12 }}
            >
              نصب
            </button>
          ) : null}
          <button type="button" onClick={dismiss} style={{ border: "none", background: "transparent", cursor: "pointer", color: colors.hint, fontSize: 12.5, padding: 0 }}>
            بعداً
          </button>
        </div>
      </div>
    </div>
  );
}
