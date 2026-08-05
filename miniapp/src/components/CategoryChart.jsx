import { useState } from "react";
import { CategoryIcon, ChevronIcon } from "./Icons.jsx";

const VISIBLE_LIMIT = 5;

export function CategoryChart({ data, categories, onSelect, selectedCategory }) {
  const [expanded, setExpanded] = useState(false);

  if (!data.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-tg-hint">
        <span className="text-3xl">🌱</span>
        هنوز خرجی برای این ماه ثبت نشده.
      </div>
    );
  }

  function categoryFor(key) {
    return categories.find((cat) => cat.key === key) ?? { key, label: "سایر", color: "#7A7A7A" };
  }

  const max = Math.max(...data.map((entry) => entry.total));
  const total = data.reduce((sum, entry) => sum + entry.total, 0);
  const visibleData = expanded ? data : data.slice(0, VISIBLE_LIMIT);
  const hiddenCount = data.length - visibleData.length;

  return (
    <div className="flex flex-col gap-1">
      {visibleData.map((entry) => {
        const barPercent = max ? Math.max(Math.round((entry.total / max) * 100), 4) : 4;
        const share = total ? Math.round((entry.total / total) * 100) : 0;
        const isSelected = selectedCategory === entry.category;
        const cat = categoryFor(entry.category);

        return (
          <button
            key={entry.category}
            type="button"
            onClick={() => onSelect(isSelected ? null : entry.category)}
            className="flex w-full items-center gap-3 rounded-2xl p-2 text-right transition active:scale-[0.98]"
            style={{ background: isSelected ? "var(--app-subtle-bg)" : "transparent" }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${cat.color}26`, color: cat.color }}
            >
              <CategoryIcon category={cat.key} icon={cat.icon} size={18} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className="truncate text-sm font-medium text-tg-text">{cat.label}</span>
                  <span className="shrink-0 text-xs font-medium text-tg-hint">
                    {share.toLocaleString("fa-IR")}٪
                  </span>
                </span>
                <span className="ltr shrink-0 text-sm font-bold text-tg-text" dir="ltr">
                  {entry.total.toLocaleString("fa-IR")} تومان
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-pill" style={{ background: "var(--app-track-bg)" }}>
                <div
                  className="h-full rounded-pill transition-all duration-500 ease-out"
                  style={{ width: `${barPercent}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          </button>
        );
      })}

      {data.length > VISIBLE_LIMIT ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 flex items-center justify-center gap-1 rounded-xl py-2 text-sm font-medium text-tg-link transition active:opacity-70"
        >
          {expanded ? "نمایش کمتر" : `${hiddenCount.toLocaleString("fa-IR")} دسته دیگر`}
          <ChevronIcon size={16} className={`transition-transform ${expanded ? "-rotate-90" : "rotate-90"}`} />
        </button>
      ) : null}
    </div>
  );
}
