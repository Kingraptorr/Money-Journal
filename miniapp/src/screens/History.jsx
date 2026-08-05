import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CategoryIcon, CloseIcon, EditIcon, EmptyIcon, SearchIcon, TrashIcon } from "../components/Icons.jsx";
import { JalaliDatePicker } from "../components/JalaliDatePicker.jsx";
import { MonthNav } from "../components/MonthNav.jsx";
import { ScreenHeader } from "../components/ScreenHeader.jsx";
import { formatDayLabel } from "../utils/jalali.js";

function toPersianDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function normalizeDigits(value) {
  return String(value ?? "").replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

const cardStyle = {
  background: "var(--tg-theme-secondary-bg-color)",
  border: "1px solid var(--app-glass-border)",
  boxShadow: "var(--app-shadow)",
};

function AddExpenseSheet({ categories, initial, onClose, onSave, onDelete }) {
  const isEdit = Boolean(initial);
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.key ?? "other");
  const [date, setDate] = useState(initial?.expense_date ?? new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [note, setNote] = useState(initial?.note ?? initial?.merchant ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const numericAmount = Number(normalizeDigits(amount));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !note.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        category,
        expense_date: date,
        amount: String(numericAmount),
        note: note.trim(),
        currency: initial?.currency ?? "IRT",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-30 flex items-end justify-center bg-black/40">
      <div
        onClick={(event) => event.stopPropagation()}
        className="glass-card fade-in max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl px-5 pb-7 pt-[22px]"
        style={cardStyle}
      >
        <div className="mx-auto mb-[18px] h-1 w-10 rounded-pill" style={{ background: "var(--app-track-bg)" }} />
        <div className="mb-[18px] text-base font-extrabold text-tg-text">
          {isEdit ? "ویرایش خرج" : "افزودن خرج جدید"}
        </div>

        <div className="mb-2 text-xs font-semibold text-tg-hint">دسته‌بندی</div>
        <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1.5">
          {categories.map((cat) => {
            const active = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border-2 px-2.5 py-2"
                style={{
                  borderColor: active ? cat.color : "var(--app-glass-border)",
                  background: active ? `${cat.color}18` : "transparent",
                }}
              >
                <span
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full"
                  style={{ background: active ? cat.color : `${cat.color}26`, color: active ? "#fff" : cat.color }}
                >
                  <CategoryIcon category={cat.key} icon={cat.icon} size={16} />
                </span>
                <span className="whitespace-nowrap text-[10.5px] font-semibold text-tg-text">{cat.label}</span>
              </button>
            );
          })}
        </div>

        <JalaliDatePicker value={date} onChange={setDate} />

        <div className="mb-1.5 text-xs font-semibold text-tg-hint">مبلغ (تومان)</div>
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={toPersianDigits(amount)}
          onChange={(event) => setAmount(normalizeDigits(event.target.value).replace(/[^0-9]/g, ""))}
          placeholder="۰"
          className="mb-3.5 w-full rounded-2xl border px-3.5 py-3 text-left text-base font-bold text-tg-text outline-none"
          style={{ borderColor: "var(--app-glass-border)", background: "var(--app-subtle-bg)" }}
        />

        <div className="mb-1.5 text-xs font-semibold text-tg-hint">توضیح</div>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="مثلاً ناهار با همکارها"
          className="mb-[22px] w-full rounded-2xl border px-3.5 py-3 text-sm text-tg-text outline-none"
          style={{ borderColor: "var(--app-glass-border)", background: "var(--app-subtle-bg)" }}
        />

        <div className="flex gap-2.5">
          {isEdit ? (
            <button
              type="button"
              onClick={() => {
                onDelete(initial.id);
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

export function History({
  month,
  onPrevMonth,
  onNextMonth,
  total,
  currencyLabel = "تومان",
  categories,
  expenses,
  selectedCategory,
  onSelectCategory,
  onDelete,
  onCreate,
  onUpdate,
  addSheetOpen,
  onCloseAdd,
  editingExpense,
  onRequestEdit,
  isWide,
  avatarPhotoUrl,
  avatarName,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((expense) => (expense.note || expense.merchant || "").toLowerCase().includes(q));
  }, [expenses, searchText]);

  const dayGroups = useMemo(() => {
    const map = new Map();
    filtered.forEach((expense) => {
      const key = expense.expense_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(expense);
    });
    return Array.from(map.entries()).map(([isoDate, items]) => ({
      isoDate,
      dateLabel: formatDayLabel(isoDate),
      dayTotal: items.reduce((sum, expense) => sum + Number(expense.amount), 0),
      items,
    }));
  }, [filtered]);

  function categoryFor(key) {
    return categories.find((cat) => cat.key === key) ?? { key, label: "سایر", color: "#7A7A7A" };
  }

  return (
    <div className="fade-in flex flex-col gap-4">
      <ScreenHeader
        subtitle="همه‌ی خرج‌های ثبت‌شده"
        title="تاریخچه"
        isWide={isWide}
        avatarPhotoUrl={avatarPhotoUrl}
        avatarName={avatarName}
        action={
          <button
            type="button"
            onClick={() => {
              setSearchOpen((value) => !value);
              if (searchOpen) setSearchText("");
            }}
            aria-label="جستجو"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-tg-text"
            style={{ background: "var(--app-subtle-bg)" }}
          >
            {searchOpen ? <CloseIcon /> : <SearchIcon />}
          </button>
        }
      />

      {searchOpen ? (
        <div className="glass-card fade-in flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5" style={cardStyle}>
          <SearchIcon className="shrink-0 text-tg-hint" />
          <input
            autoFocus
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="جستجوی خرج..."
            className="min-w-0 flex-1 bg-transparent text-sm text-tg-text outline-none"
          />
          {searchText ? (
            <button
              type="button"
              onClick={() => setSearchText("")}
              aria-label="پاک کردن"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-tg-hint"
              style={{ background: "var(--app-subtle-bg)" }}
            >
              <CloseIcon size={11} />
            </button>
          ) : null}
        </div>
      ) : null}

      <MonthNav month={month} onPrev={onPrevMonth} onNext={onNextMonth} />

      <div
        className="relative flex items-center justify-between overflow-hidden rounded-[20px] p-[18px_20px]"
        style={{
          background: "var(--tg-theme-button-color)",
          boxShadow: "0 14px 28px -16px var(--tg-theme-button-color)",
        }}
      >
        <span className="text-[13.5px] font-semibold" style={{ color: "var(--app-hero-subtext)" }}>
          جمع خرج این ماه
        </span>
        <span
          dir="ltr"
          className="flex items-baseline gap-1.5 text-[19px] font-extrabold"
          style={{ color: "var(--app-hero-text)" }}
        >
          {Number(total).toLocaleString("fa-IR")}
          <span className="text-[12.5px] font-medium" style={{ color: "var(--app-hero-subtext)" }}>
            {currencyLabel}
          </span>
        </span>
      </div>

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 pt-0.5">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3.5 py-2 text-[13px] font-bold"
          style={{
            background: !selectedCategory ? "var(--tg-theme-button-color)" : "var(--app-subtle-bg)",
            borderColor: !selectedCategory ? "var(--tg-theme-button-color)" : "var(--app-glass-border)",
            color: !selectedCategory ? "#fff" : "var(--tg-theme-text-color)",
          }}
        >
          همه
        </button>
        {categories.map((cat) => {
          const active = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(active ? null : cat.key)}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3.5 py-2 text-[13px] font-bold"
              style={{
                background: active ? `${cat.color}30` : "var(--app-subtle-bg)",
                borderColor: active ? cat.color : "var(--app-glass-border)",
                color: active ? cat.color : "var(--tg-theme-text-color)",
              }}
            >
              <CategoryIcon category={cat.key} icon={cat.icon} size={15} />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3.5">
        {dayGroups.map((group) => (
          <div key={group.isoDate} className="glass-card rounded-[20px] p-4" style={cardStyle}>
            <div
              className="mb-2.5 flex items-baseline justify-between border-b pb-2.5"
              style={{ borderColor: "var(--app-divider-color)" }}
            >
              <span className="text-sm font-bold text-tg-text">{group.dateLabel}</span>
              <span dir="ltr" className="text-[13px] font-bold text-tg-hint">
                {group.dayTotal.toLocaleString("fa-IR")} {currencyLabel}
              </span>
            </div>
            <div className="flex flex-col">
              {group.items.map((expense, index) => {
                const cat = categoryFor(expense.category);
                const currency = expense.currency === "IRT" ? currencyLabel : expense.currency;
                return (
                  <div
                    key={expense.id}
                    className="flex flex-col gap-2 py-2.5 last:pb-0"
                    style={index > 0 ? { borderTop: "1px solid var(--app-divider-color)" } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${cat.color}26`, color: cat.color }}
                      >
                        <CategoryIcon category={cat.key} icon={cat.icon} />
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-tg-text">
                        {expense.note || expense.merchant || cat.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pr-[54px]">
                      <span className="truncate text-xs text-tg-hint">{cat.label}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span dir="ltr" className="text-sm font-bold text-tg-text">
                          {Number(expense.amount).toLocaleString("fa-IR")} {currency}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRequestEdit(expense)}
                          aria-label="ویرایش"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tg-hint"
                          style={{ background: "var(--app-subtle-bg)" }}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(expense.id)}
                          aria-label="حذف"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ background: "var(--app-delete-bg)", color: "var(--tg-theme-destructive-text-color)" }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!dayGroups.length ? (
          <div className="flex flex-col items-center gap-2.5 py-14 text-center text-[13.5px] text-tg-hint">
            <EmptyIcon />
            چیزی با این فیلتر پیدا نشد.
          </div>
        ) : null}
      </div>

      {addSheetOpen ? (
        <AddExpenseSheet
          categories={categories}
          initial={editingExpense}
          onClose={onCloseAdd}
          onSave={async (payload) => {
            if (payload.id) {
              await onUpdate(payload.id, payload);
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
