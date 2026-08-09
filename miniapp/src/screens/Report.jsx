import { useEffect, useMemo, useRef, useState } from "react";
import { MonthNav } from "../components/MonthNav.jsx";
import { SparkleIcon } from "../components/Icons.jsx";
import { ACCENT_PRIMARY } from "../utils/theme.js";
import { formatJalali, monthParam } from "../utils/jalali.js";
import { generateReport, getReportHistory, getReportStatus } from "../utils/api.js";

const WELCOME_TEXT =
  "سلام! من دستیار مالی توام. هر وقت خواستی، دکمه‌ی پایین را بزن تا خلاصه‌ی هوشمند این ماه را برات بسازم.";
const THANKS_REPLY = "خواهش می‌کنم! هر وقت خواستی دوباره بپرس.";

const cardStyle = {
  background: "var(--tg-theme-secondary-bg-color)",
  border: "1px solid var(--app-glass-border)",
  boxShadow: "var(--app-shadow)",
};

function userPromptFor(kind) {
  return kind === "deeper" ? "بیشتر توضیح بده" : "خلاصه‌ی این ماه رو برام بساز";
}

function buildMessagesFromHistory(rows) {
  const messages = [{ isAi: true, text: WELCOME_TEXT }];
  for (const row of rows) {
    messages.push({ isAi: false, text: userPromptFor(row.kind) });
    messages.push({ isAi: true, text: row.content });
  }
  return messages;
}

function chipsFromHistory(rows) {
  if (!rows.length) return null;
  let latestSummary = null;
  for (const row of rows) {
    if (row.kind === "summary") latestSummary = row;
  }
  if (!latestSummary) return ["thanks"];
  const deeperAfter = rows.some(
    (row) => row.kind === "deeper" && new Date(row.created_at) > new Date(latestSummary.created_at),
  );
  const chips = [];
  if (latestSummary.has_data && !deeperAfter) chips.push("deeper");
  chips.push("thanks");
  return chips;
}

function daysUntil(isoDate) {
  return Math.max(1, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000));
}

function ineligibleText(reason, eligibleAt) {
  if (reason === "too_early_in_month") {
    return eligibleAt
      ? `گزارش این ماه از ${formatJalali(eligibleAt.slice(0, 10))} در دسترس می‌مونه، چون حداقل ۱۰ روز از ماه باید بگذره تا داده‌ی کافی جمع بشه.`
      : "برای این ماه هنوز ۱۰ روز از شروعش نگذشته، یکم دیگه صبر کن.";
  }
  if (reason === "cooldown" && eligibleAt) {
    const days = daysUntil(eligibleAt);
    return `هر ۳ روز یک‌بار می‌تونی گزارش جدید بگیری. تا ${days.toLocaleString("fa-IR")} روز دیگه صبر کن.`;
  }
  return "الان نمی‌تونم گزارش بسازم، یکم دیگه دوباره امتحان کن.";
}

function generateLabelFor(status, generating) {
  if (generating) return "در حال تحلیل…";
  if (!status || status.eligible) return "تولید تحلیل جدید";
  if (status.reason === "too_early_in_month" && status.eligibleAt) {
    return `از ${formatJalali(status.eligibleAt.slice(0, 10))} در دسترسه`;
  }
  if (status.reason === "cooldown" && status.eligibleAt) {
    const days = daysUntil(status.eligibleAt);
    return `${days.toLocaleString("fa-IR")} روز دیگه می‌تونی گزارش بگیری`;
  }
  return "تولید تحلیل جدید";
}

export function Report({ month, onPrevMonth, onNextMonth }) {
  const monthKey = useMemo(() => monthParam(month), [month]);
  const [messages, setMessages] = useState([{ isAi: true, text: WELCOME_TEXT }]);
  const [chips, setChips] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    Promise.all([getReportHistory(monthKey), getReportStatus(monthKey)]).then(([historyData, statusData]) => {
      if (cancelled) return;
      const rows = historyData?.reports ?? [];
      setMessages(buildMessagesFromHistory(rows));
      setChips(chipsFromHistory(rows));
      setStatus(statusData);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, generating]);

  async function refreshStatus() {
    const statusData = await getReportStatus(monthKey);
    setStatus(statusData);
  }

  async function runGenerate(kind) {
    if (generating) return;
    setMessages((prev) => [...prev, { isAi: false, text: userPromptFor(kind) }]);
    setChips(null);
    setGenerating(true);
    try {
      const result = await generateReport(monthKey, kind);
      setMessages((prev) => [...prev, { isAi: true, text: result.text }]);
      setChips(result.hasData ? (kind === "summary" ? ["deeper", "thanks"] : ["thanks"]) : ["thanks"]);
      if (kind === "summary") await refreshStatus();
    } catch (error) {
      let reason = error.message;
      let eligibleAt = null;
      if (kind === "summary") {
        const fresh = await getReportStatus(monthKey);
        setStatus(fresh);
        reason = fresh.reason;
        eligibleAt = fresh.eligibleAt;
      }
      setMessages((prev) => [...prev, { isAi: true, text: ineligibleText(reason, eligibleAt) }]);
      setChips(null);
    } finally {
      setGenerating(false);
    }
  }

  function sayThanks() {
    if (generating) return;
    setMessages((prev) => [...prev, { isAi: false, text: "ممنون!" }]);
    setChips(null);
    setGenerating(true);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { isAi: true, text: THANKS_REPLY }]);
      setGenerating(false);
    }, 550);
  }

  const chipItems = (chips ?? [])
    .map((chip) => {
      if (chip === "deeper") return { key: "deeper", label: "بیشتر بگو", onClick: () => runGenerate("deeper") };
      if (chip === "thanks") return { key: "thanks", label: "ممنون", onClick: sayThanks };
      return null;
    })
    .filter(Boolean);

  const showChips = loaded && !generating && chipItems.length > 0 && messages[messages.length - 1]?.isAi;
  const eligible = !status || status.eligible;

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-0.5 text-sm font-medium text-tg-hint">گزارش هوشمند</div>
          <div className="text-[22px] font-extrabold text-tg-text">تحلیل این ماه</div>
        </div>
      </div>

      <MonthNav month={month} onPrev={onPrevMonth} onNext={onNextMonth} />

      <div className="flex flex-col gap-3 px-1 py-1.5">
        {messages.map((msg, index) => (
          <div key={index} className={`flex max-w-[82%] items-end gap-2 ${msg.isAi ? "mr-auto" : "ml-auto"}`}>
            {msg.isAi ? (
              <span
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                style={{ background: `${ACCENT_PRIMARY}26`, color: "var(--tg-theme-button-color)" }}
              >
                <SparkleIcon />
              </span>
            ) : null}
            <div
              className="whitespace-pre-line px-[15px] py-3 text-[13.5px] leading-[1.85]"
              style={
                msg.isAi
                  ? { ...cardStyle, borderRadius: "18px 18px 18px 4px", color: "var(--tg-theme-text-color)" }
                  : {
                      background: "var(--tg-theme-button-color)",
                      borderRadius: "18px 18px 4px 18px",
                      color: "var(--app-hero-text)",
                      boxShadow: "0 10px 22px -14px var(--tg-theme-button-color)",
                    }
              }
            >
              {msg.text}
            </div>
          </div>
        ))}

        {showChips ? (
          <div className="mr-auto ml-0 flex max-w-[82%] flex-wrap gap-2 pr-[38px]">
            {chipItems.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClick}
                className="rounded-pill px-3.5 py-2 text-[12.5px] font-semibold text-tg-link"
                style={cardStyle}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}

        {generating ? (
          <div className="mr-auto flex max-w-[82%] items-end gap-2">
            <span
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
              style={{ background: `${ACCENT_PRIMARY}26`, color: "var(--tg-theme-button-color)" }}
            >
              <SparkleIcon />
            </span>
            <div
              className="flex items-center gap-[5px] rounded-[18px] rounded-bl-[4px] px-4 py-3.5"
              style={cardStyle}
            >
              <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-tg-hint" />
              <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-tg-hint [animation-delay:150ms]" />
              <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-tg-hint [animation-delay:300ms]" />
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <button
        type="button"
        onClick={() => runGenerate("summary")}
        disabled={generating || !eligible}
        className="sticky bottom-0 z-10 flex items-center justify-center gap-2 rounded-[18px] p-[15px] text-[14.5px] font-bold"
        style={{
          background: "var(--tg-theme-button-color)",
          color: "var(--app-hero-text)",
          boxShadow: "0 14px 30px -16px var(--tg-theme-button-color)",
          opacity: generating ? 0.75 : eligible ? 1 : 0.6,
          cursor: generating || !eligible ? "default" : "pointer",
        }}
      >
        <SparkleIcon />
        <span>{generateLabelFor(status, generating)}</span>
      </button>
    </div>
  );
}
