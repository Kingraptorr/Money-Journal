import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AddIcon, BackIcon, CheckIcon, TrashIcon } from "../components/Icons.jsx";
import { JalaliDatePicker } from "../components/JalaliDatePicker.jsx";
import { formatJalali } from "../utils/jalali.js";
import { createDebt, deleteDebt, getDebt, getDebts, payInstallment, unpayInstallment } from "../utils/api.js";

function toPersianDigits(value) {
  return String(value ?? "").replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function normalizeDigits(value) {
  return String(value ?? "").replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function formatToman(amount) {
  return `${Math.round(Number(amount)).toLocaleString("fa-IR")} تومان`;
}

const cardStyle = {
  background: "var(--tg-theme-secondary-bg-color)",
  border: "1px solid var(--app-glass-border)",
  boxShadow: "var(--app-shadow)",
};

function CreateDebtSheet({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [installmentCount, setInstallmentCount] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const numericAmount = Number(normalizeDigits(totalAmount));
  const canSave = Boolean(name.trim()) && Number.isFinite(numericAmount) && numericAmount > 0 && installmentCount > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        total_amount: numericAmount,
        installment_count: installmentCount,
        start_date: startDate,
        note: note.trim() || null,
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
        <div className="mb-[18px] text-base font-extrabold text-tg-text">طرح بدهی جدید</div>

        <div className="mb-1.5 text-xs font-semibold text-tg-hint">نام (وام‌دهنده یا کالا)</div>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="مثلاً وام بانک ملت"
          className="mb-3.5 w-full rounded-2xl border px-3.5 py-3 text-sm text-tg-text outline-none"
          style={{ borderColor: "var(--app-glass-border)", background: "var(--app-subtle-bg)" }}
        />

        <div className="mb-1.5 text-xs font-semibold text-tg-hint">مبلغ کل (تومان)</div>
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={toPersianDigits(totalAmount)}
          onChange={(event) => setTotalAmount(normalizeDigits(event.target.value).replace(/[^0-9]/g, ""))}
          placeholder="۰"
          className="mb-3.5 w-full rounded-2xl border px-3.5 py-3 text-left text-base font-bold text-tg-text outline-none"
          style={{ borderColor: "var(--app-glass-border)", background: "var(--app-subtle-bg)" }}
        />

        <div className="mb-1.5 text-xs font-semibold text-tg-hint">تعداد قسط</div>
        <div className="mb-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setInstallmentCount((value) => Math.max(1, value - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-bold text-tg-text"
            style={{ background: "var(--app-subtle-bg)" }}
          >
            −
          </button>
          <div className="flex-1 text-center text-base font-bold text-tg-text">
            {installmentCount.toLocaleString("fa-IR")}
          </div>
          <button
            type="button"
            onClick={() => setInstallmentCount((value) => value + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-bold text-tg-text"
            style={{ background: "var(--app-subtle-bg)" }}
          >
            +
          </button>
        </div>

        <JalaliDatePicker value={startDate} onChange={setStartDate} label="تاریخ شروع" />

        <div className="mb-1.5 mt-3.5 text-xs font-semibold text-tg-hint">توضیح (اختیاری)</div>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="یادداشت اختیاری"
          className="mb-[22px] w-full rounded-2xl border px-3.5 py-3 text-sm text-tg-text outline-none"
          style={{ borderColor: "var(--app-glass-border)", background: "var(--app-subtle-bg)" }}
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full rounded-2xl py-3.5 text-[14.5px] font-bold text-white transition disabled:opacity-60"
          style={{ background: "var(--tg-theme-button-color)" }}
        >
          {saving ? "..." : "ثبت طرح بدهی"}
        </button>
      </div>
    </div>,
    document.body,
  );
}

function DebtDetail({ debtId, onBack, onChanged }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getDebt(debtId);
      setPlan(data?.debt ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [debtId]);

  async function handleTogglePaid(installment) {
    if (installment.paidAt) {
      await unpayInstallment(debtId, installment.seq);
    } else {
      await payInstallment(debtId, installment.seq);
    }
    await load();
    onChanged();
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deleteDebt(debtId);
    onChanged();
    onBack();
  }

  if (loading || !plan) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-tg-hint">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-tg-hint border-opacity-20 border-t-tg-link" />
        در حال بارگذاری...
      </div>
    );
  }

  const today = new Date();
  const firstUnpaidSeq = plan.installments.find((i) => !i.paidAt)?.seq;

  return (
    <div className="fade-in flex flex-col gap-4">
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
        <div className="min-w-0">
          <div className="truncate text-[19px] font-extrabold text-tg-text">{plan.name}</div>
          <div className="mt-0.5 text-[11.5px] font-medium text-tg-hint">
            {plan.paidCount.toLocaleString("fa-IR")} از {plan.installment_count.toLocaleString("fa-IR")} قسط پرداخت شده
          </div>
        </div>
      </div>

      <section className="glass-card rounded-3xl p-4" style={cardStyle}>
        <div className="flex flex-col gap-2.5">
          {plan.installments.map((installment) => {
            const isPaid = Boolean(installment.paidAt);
            const isOverdue = !isPaid && new Date(installment.dueDate) < today;
            const isNext = !isPaid && installment.seq === firstUnpaidSeq;
            return (
              <button
                key={installment.seq}
                type="button"
                onClick={() => handleTogglePaid(installment)}
                className="flex items-center justify-between rounded-2xl px-3.5 py-3 text-right"
                style={{
                  background: isPaid
                    ? "var(--app-subtle-bg)"
                    : isOverdue
                      ? "color-mix(in srgb, var(--tg-theme-destructive-text-color) 12%, transparent)"
                      : isNext
                        ? "color-mix(in srgb, var(--tg-theme-button-color) 12%, transparent)"
                        : "transparent",
                  opacity: isPaid ? 0.6 : 1,
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px]"
                    style={{
                      borderColor: isPaid ? "var(--tg-theme-button-color)" : "var(--app-glass-border)",
                      background: isPaid ? "var(--tg-theme-button-color)" : "transparent",
                      color: "#fff",
                    }}
                  >
                    {isPaid ? <CheckIcon /> : null}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] font-bold text-tg-text">قسط {installment.seq.toLocaleString("fa-IR")}</span>
                    <span
                      className="text-[11.5px] font-medium"
                      style={{ color: isOverdue ? "var(--tg-theme-destructive-text-color)" : "var(--tg-theme-hint-color)" }}
                    >
                      {formatJalali(installment.dueDate)}
                      {isOverdue ? " · عقب‌افتاده" : ""}
                    </span>
                  </span>
                </span>
                <span className="text-[13.5px] font-bold text-tg-text">{formatToman(installment.amount)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={handleDelete}
        className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold"
        style={{ borderColor: "var(--tg-theme-destructive-text-color)", color: "var(--tg-theme-destructive-text-color)" }}
      >
        <TrashIcon />
        {confirmingDelete ? "مطمئنی؟ حذف کن" : "حذف طرح بدهی"}
      </button>
    </div>
  );
}

export function Debts({ onBack, onRefreshSummary }) {
  const [status, setStatus] = useState("active");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getDebts(status);
      setPlans(data?.debts ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  async function handleCreate(payload) {
    await createDebt(payload);
    await load();
    onRefreshSummary();
  }

  function handleChanged() {
    load();
    onRefreshSummary();
  }

  if (selectedId) {
    return <DebtDetail debtId={selectedId} onBack={() => setSelectedId(null)} onChanged={handleChanged} />;
  }

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
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
          <div className="text-[22px] font-extrabold text-tg-text">بدهی و قرض</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setStatus((value) => (value === "active" ? "completed" : "active"))}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-pill px-3 py-1.5 text-[12px] font-bold"
            style={{ background: "var(--app-subtle-bg)", color: "var(--tg-theme-button-color)" }}
          >
            {status === "active" ? "فعال" : "تکمیل‌شده"}
            <span className="text-[9px]">▾</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateSheet(true)}
            aria-label="طرح بدهی جدید"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-tg-text"
            style={{ background: "var(--app-subtle-bg)" }}
          >
            <AddIcon />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-sm text-tg-hint">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-tg-hint border-opacity-20 border-t-tg-link" />
          در حال بارگذاری...
        </div>
      ) : null}

      {!loading ? (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedId(plan.id)}
              className="glass-card flex flex-col gap-2.5 rounded-3xl p-4 text-right"
              style={cardStyle}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[14.5px] font-bold text-tg-text">{plan.name}</span>
                {plan.status === "completed" ? (
                  <span className="shrink-0 text-[12px] font-bold" style={{ color: "#2FA35A" }}>
                    ✅ تسویه شد
                  </span>
                ) : null}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-pill" style={{ background: "var(--app-track-bg)" }}>
                <div
                  className="h-full rounded-pill"
                  style={{
                    width: `${(plan.paidCount / plan.installment_count) * 100}%`,
                    background: "var(--tg-theme-button-color)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11.5px] font-medium text-tg-hint">
                <span>
                  {plan.paidCount.toLocaleString("fa-IR")} از {plan.installment_count.toLocaleString("fa-IR")} قسط
                </span>
                <span>مانده: {formatToman(plan.remainingBalance)}</span>
              </div>
              {plan.nextDueInstallment ? (
                <div className="text-[11.5px] font-medium text-tg-hint">
                  قسط بعدی: {formatJalali(plan.nextDueInstallment.dueDate)}
                </div>
              ) : null}
            </button>
          ))}

          {!plans.length ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-tg-hint">
              <span className="text-3xl">🧾</span>
              {status === "active" ? "بدهی فعالی ثبت نکردی." : "طرح تکمیل‌شده‌ای نداری."}
            </div>
          ) : null}
        </div>
      ) : null}

      {showCreateSheet ? <CreateDebtSheet onClose={() => setShowCreateSheet(false)} onSave={handleCreate} /> : null}
    </div>
  );
}
