import { useState } from "react";
import { createPortal } from "react-dom";
import { AddIcon, BackIcon, CategoryIcon, EditIcon, GENERIC_ICON_KEYS, TrashIcon } from "../components/Icons.jsx";

const SWATCHES = [
  "#4F86C6",
  "#63B995",
  "#F0A500",
  "#8B5E3C",
  "#E5C07B",
  "#C678DD",
  "#E06C75",
  "#5B4B8A",
  "#E8916B",
  "#B85C7A",
];

function CategorySheet({ initial, onClose, onSave, onDelete }) {
  const isEdit = Boolean(initial);
  const isCustom = !initial?.is_default;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [color, setColor] = useState(initial?.color ?? SWATCHES[0]);
  const [icon, setIcon] = useState(initial?.icon ?? GENERIC_ICON_KEYS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ key: initial?.key, label: trimmed, color, icon });
      onClose();
    } catch (saveError) {
      setError(
        saveError.message === "label_matches_default"
          ? "این نام قبلاً برای یکی از دسته‌های پیش‌فرض استفاده شده. یک نام دیگر انتخاب کن."
          : "ذخیره انجام نشد. دوباره امتحان کن.",
      );
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-30 flex items-end justify-center bg-black/40">
      <div
        onClick={(event) => event.stopPropagation()}
        className="glass-card fade-in w-full max-w-[480px] rounded-t-3xl px-5 pb-7 pt-[22px]"
        style={{
          background: "var(--tg-theme-secondary-bg-color)",
          border: "1px solid var(--app-glass-border)",
        }}
      >
        <div className="mx-auto mb-[18px] h-1 w-10 rounded-pill" style={{ background: "var(--app-track-bg)" }} />
        <div className="mb-[18px] text-base font-extrabold text-tg-text">
          {isEdit ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}
        </div>

        <div className="mb-1.5 text-xs font-semibold text-tg-hint">نام دسته‌بندی</div>
        <input
          type="text"
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
            if (error) setError(null);
          }}
          placeholder="مثلاً حمل‌ونقل"
          className="w-full rounded-2xl border px-3.5 py-3 text-sm text-tg-text outline-none"
          style={{
            borderColor: error ? "var(--tg-theme-destructive-text-color)" : "var(--app-glass-border)",
            background: "var(--app-subtle-bg)",
          }}
        />
        {error ? (
          <div className="mb-[18px] mt-1.5 text-xs font-medium text-tg-destructive">{error}</div>
        ) : (
          <div className="mb-[18px]" />
        )}

        <div className="mb-2 text-xs font-semibold text-tg-hint">رنگ</div>
        <div className="mb-[22px] flex flex-wrap gap-2.5">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              aria-label={swatch}
              className="h-9 w-9 rounded-full"
              style={{
                background: swatch,
                border: color === swatch ? "3px solid var(--tg-theme-text-color)" : "none",
              }}
            />
          ))}
        </div>

        {isCustom ? (
          <>
            <div className="mb-2 text-xs font-semibold text-tg-hint">آیکون</div>
            <div className="mb-[22px] flex flex-wrap gap-2.5">
              {GENERIC_ICON_KEYS.map((iconKey) => {
                const active = icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    aria-label={iconKey}
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      background: active ? color : "var(--app-subtle-bg)",
                      color: active ? "#fff" : "var(--tg-theme-hint-color)",
                    }}
                  >
                    <CategoryIcon icon={iconKey} size={16} />
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        <div className="flex gap-2.5">
          {isEdit && isCustom ? (
            <button
              type="button"
              onClick={() => {
                onDelete(initial.key);
                onClose();
              }}
              className="rounded-2xl border px-[18px] py-3.5 text-sm font-bold"
              style={{ borderColor: "var(--tg-theme-destructive-text-color)", color: "var(--tg-theme-destructive-text-color)" }}
            >
              حذف
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl py-3.5 text-[14.5px] font-bold text-white transition disabled:opacity-60"
            style={{ background: "var(--tg-theme-button-color)" }}
          >
            {saving ? "..." : isEdit ? "ذخیره تغییرات" : "افزودن"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Categories({ categories, onBack, onCreate, onUpdate, onDelete }) {
  const [sheetTarget, setSheetTarget] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="fade-in mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-tg-text"
          style={{ background: "var(--app-subtle-bg)" }}
        >
          <BackIcon />
        </button>
        <div>
          <div className="mb-0.5 text-sm font-medium text-tg-hint">مدیریت دسته‌بندی خرج‌ها</div>
          <div className="text-[22px] font-extrabold text-tg-text">دسته‌بندی‌ها</div>
        </div>
      </div>

      <div
        className="glass-card overflow-hidden rounded-[20px]"
        style={{
          background: "var(--tg-theme-secondary-bg-color)",
          border: "1px solid var(--app-glass-border)",
          boxShadow: "var(--app-shadow)",
        }}
      >
        {categories.map((cat) => (
          <div
            key={cat.key}
            className="flex items-center gap-3 border-b p-[14px_16px] last:border-0"
            style={{ borderColor: "var(--app-divider-color)" }}
          >
            <span
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full"
              style={{ background: `${cat.color}26`, color: cat.color }}
            >
              <CategoryIcon category={cat.key} icon={cat.icon} size={17} />
            </span>
            <span className="flex-1 text-[14.5px] font-semibold text-tg-text">{cat.label}</span>
            <button
              type="button"
              onClick={() => {
                setSheetTarget(cat);
                setSheetOpen(true);
              }}
              aria-label="ویرایش"
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-tg-hint"
              style={{ background: "var(--app-subtle-bg)" }}
            >
              <EditIcon />
            </button>
            {cat.is_default ? null : (
              <button
                type="button"
                onClick={() => onDelete(cat.key)}
                aria-label="حذف"
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--app-delete-bg)", color: "var(--tg-theme-destructive-text-color)" }}
              >
                <TrashIcon />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setSheetTarget(null);
          setSheetOpen(true);
        }}
        className="flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed p-3.5 text-sm font-bold text-tg-link"
        style={{ borderColor: "var(--app-glass-border)" }}
      >
        <AddIcon size={18} />
        افزودن دسته‌بندی جدید
      </button>

      {sheetOpen ? (
        <CategorySheet
          initial={sheetTarget}
          onClose={() => setSheetOpen(false)}
          onSave={async (payload) => {
            if (payload.key) {
              await onUpdate(payload.key, payload);
            } else {
              await onCreate(payload);
            }
          }}
          onDelete={onDelete}
        />
      ) : null}
    </div>
  );
}
