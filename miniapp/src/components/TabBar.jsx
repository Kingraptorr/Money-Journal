import { createPortal } from "react-dom";

export function TabBar({ items }) {
  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[15] flex justify-center px-3.5"
      style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
    >
      <div
        className="glass-card flex w-full max-w-[420px] items-center justify-around rounded-[22px] p-2"
        style={{
          background: "var(--tg-theme-secondary-bg-color)",
          border: "1px solid var(--app-glass-border)",
          boxShadow: "0 14px 34px -12px rgba(0,0,0,.22)",
        }}
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className="flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1.5 text-[10.5px] font-semibold transition"
            style={{ color: item.color, background: item.bg }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
