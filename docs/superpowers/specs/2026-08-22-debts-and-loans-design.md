# Debts & Loans — Design Spec

Status: approved by user, pending implementation plan
Date: 2026-08-22

## Summary

A new section of AI Money Journal for tracking installment loans/debts the
user owes — as structured plans with a fixed schedule, separate from the
existing free-form `debts` expense category. Plans can be created via a form
in the Mini App or by telling the Telegram bot about a new loan in natural
language. A Dashboard card surfaces upcoming/overdue installments and links
to a full management screen.

## Scope decisions (from brainstorming)

These were explicitly decided with the user and constrain the design below;
do not re-litigate them during implementation.

- **Direction**: only debts the user owes (not money lent to others).
- **Structure**: installment plans (total amount, count, schedule) — not a
  single due date, not an open-ended balance.
- **Expense linkage**: fully separate ledger. Marking an installment paid
  does **not** create an expense row and does not affect Dashboard/History/
  Report totals. The pre-existing free-form `debts` expense category is
  untouched and continues to work exactly as it does today — it is a
  different, unrelated workflow for logging one-off debt-related payments
  that aren't tracked as a structured plan.
- **Entry point**: no new bottom-nav tab or header icon. A summary card on
  the Dashboard is the sole entry point, linking to the full screen.
- **Reminders**: in-app visibility only for v1. No proactive Telegram
  messages/cron reminders (unlike the existing daily expense-logging
  reminder in `bot/index.js`). Can be added later without schema changes.
- **Entry method**: both a manual form in the Mini App, and natural-language
  creation via the bot (text/voice), using the same Gemini extraction
  pipeline that already parses expenses.
- **Plan flexibility**: v1 only supports equal, monthly installments (total
  amount ÷ count, one due date per month). No custom per-installment
  amounts, no non-monthly intervals.
- **Marking installments paid**: Mini App only, never via chat. Matching
  "which installment" from free text is exactly the kind of ambiguity worth
  avoiding.
- **Logging**: a structured logger (pino), scoped to this feature only. Not
  an app-wide logging migration — that is explicitly out of scope for this
  work.

## Data model

Two new tables, following the existing flat/normalized style used by
`expenses`, `categories`, and `ai_reports` in `db/schema.sql`.

```sql
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- e.g. "قسط دیجی‌پی", "وام بانک ملت"
  total_amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IRT',
  installment_count INTEGER NOT NULL,
  start_date DATE NOT NULL,        -- first installment's due date
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);

CREATE TABLE debt_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,            -- 1, 2, 3...
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,   -- total_amount / installment_count, last one absorbs rounding remainder
  paid_at TIMESTAMPTZ,             -- null = unpaid
  UNIQUE (debt_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_debt_installments_debt ON debt_installments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_installments_due ON debt_installments(due_date) WHERE paid_at IS NULL;
```

Creating a plan generates every installment row up front (`due_date =
start_date + (seq-1) months`, `amount = total_amount / installment_count`
with the remainder from integer division absorbed into the last
installment). This means "mark paid" is always just setting `paid_at` on one
existing row — no recurrence logic is ever needed after creation. `debts.status`
flips to `completed` automatically the moment every installment has
`paid_at` set (and back to `active` if a completed plan's installment is
un-paid).

Soft delete only (`deleted_at` on `debts`); all queries filter it out, same
convention as `expenses.deleted_at`.

## Shared plan-creation logic

The "compute installments and insert the plan" logic is written once, in a
shared service function (e.g. `api/services/debts.js`,
`createDebtPlan(userId, { name, total_amount, currency, installment_count,
start_date, note })`), used by both:

- `POST /api/debts` (the Mini App form path), and
- the bot's `debt:confirm` callback handler (the chat path).

This guarantees the two entry points can never compute installments
differently, and is the single place the rounding-remainder logic and its
debug log line live.

## API

New route file `api/routes/debts.js`, mounted at `/api/debts` behind the
existing `requireAuth` middleware, following the pattern of
`api/routes/currency.js` / `expenses.js`.

- `GET /api/debts?status=active|completed|all` (default `active`) — list
  plans. Each item includes computed `paidCount`, `remainingBalance`, and
  `nextDueInstallment` (`{ dueDate, amount }` or `null` if fully paid).
- `GET /api/debts/:id` — one plan plus its full installment list, for the
  detail view.
- `POST /api/debts` — `{ name, total_amount, currency, installment_count,
  start_date, note }`. Calls the shared `createDebtPlan()`.
- `PATCH /api/debts/:id` — edits `name`/`note` only. Amount, count, and
  schedule are immutable after creation (see Edge cases).
- `DELETE /api/debts/:id` — soft delete.
- `POST /api/debts/:id/installments/:seq/pay` — sets `paid_at = now()`;
  flips `debts.status` to `completed` if this was the last unpaid
  installment.
- `POST /api/debts/:id/installments/:seq/unpay` — clears `paid_at`; flips
  `status` back to `active` if it had been `completed`.
- `GET /api/debts/summary` — `{ overdueCount, overdueTotal, dueSoonCount,
  dueSoonTotal, remainingBalance }` across the user's `active` plans only.
  "Due soon" = unpaid installments with `due_date` within the next 7 days
  (inclusive). "Overdue" = unpaid installments with `due_date` in the past.
  Both computed relative to Tehran-local today (`NOW() AT TIME ZONE
  'Asia/Tehran'`), matching the existing daily cron and expense-date
  conventions.

Matching frontend helpers added to `miniapp/src/utils/api.js`: `getDebts()`,
`getDebt(id)`, `createDebt()`, `updateDebt()`, `deleteDebt()`,
`payInstallment()`, `unpayInstallment()`, `getDebtsSummary()` — same
`api()`-wrapper pattern already used for every other endpoint in that file.

## Bot / Gemini integration

A new `debt_create` action added to the existing single JSON schema
Gemini already returns (see `bot/services/gemini.js` `SYSTEM_PROMPT`).

**Intent disambiguation** (must be explicit in the prompt, with new
few-shot examples): a message describing a *payment already made* on a debt
(e.g. "قسط وام بانکم رو دادم، یه و نیم میلیون") stays exactly as it is today
— `action: "log"`, `category: "debts"`. A message describing a *new
obligation being taken on* — a lender/item plus a total or per-installment
amount plus a number of installments (e.g. "یه وام گرفتم از بانک ملت، ده
قسط ۹۰۰ تومنی از شهریور") — is `action: "debt_create"`. This distinction is
the single highest-risk part of the whole feature (see Edge cases).

`debt_create` output shape:

```json
{
  "action": "debt_create",
  "name": "<string>",
  "total_amount": "<number or null>",
  "installment_count": "<integer or null>",
  "start_date": "<YYYY-MM-DD>",
  "note": "<string or null>",
  "confidence": "<0.0-1.0>",
  "needs_clarification": "<bool>",
  "clarification_question": "<string or null>"
}
```

If the user states a per-installment amount instead of a total, Gemini
multiplies by the count to produce `total_amount` (so the shape always
matches what `createDebtPlan()` expects). Missing `total_amount` or
`installment_count` → `needs_clarification: true`, same rule already used
for a missing expense amount.

**Confirmation flow** mirrors the existing expense flow exactly: the bot
replies with a Persian summary ("طرح بدهی جدید: دیجی‌پی — ۱۰ قسط ۹۰۰,۰۰۰
تومنی (جمعاً ۹,۰۰۰,۰۰۰ تومان) از ۱۴۰۵/۰۶/۰۱. تأیید کنم؟") and an inline
keyboard (تأیید ✓ / ویرایش ✎). This requires two small, additive changes to
existing code:

- The user-state payload (`bot/services/state.js` /
  `setUserState(...,"awaiting_confirmation", {...})`) gains a `kind:
  "expense" | "debt"` discriminator, so the confirm/edit handlers know which
  insert path to take.
- `bot/handlers/callback.js` gains two new callback actions (`debt:confirm`,
  `debt:edit`) alongside the existing `expense:confirm`/`expense:edit`,
  calling the shared `createDebtPlan()` on confirm.

Marking an installment paid is **never** available via chat — only through
the Mini App's Debts screen (see Scope decisions above).

## Mini App UI

### Dashboard summary card

Placed in `Dashboard.jsx` immediately after the hero total card, styled as a
`glass-card` matching the existing "دسته‌بندی‌ها"/"آخرین خرج‌ها" cards.
Header row: "بدهی و قرض" + a "مدیریت" link (same pattern as "مشاهده همه");
tapping either the link or the card body navigates to the new `debts`
screen (`setScreen("debts")` in `App.jsx`, same mechanism as
`onOpenCurrency`).

Body shows, depending on state (data from `GET /api/debts/summary`, fetched
alongside the rest of `loadData()`'s `Promise.all`):

- If `overdueCount > 0`: "۲ قسط عقب‌افتاده · ۳,۲۰۰,۰۰۰ تومان" in red.
- If `dueSoonCount > 0`: "۱ قسط تا ۷ روز آینده · ۹۰۰,۰۰۰ تومان".
- Always (if any active plan exists): "مانده کل: X تومان".
- If no active plans at all: a quiet, non-alarming empty state — "بدهی
  فعالی ثبت نکردی." — kept discoverable rather than hidden.

### Debts screen (`miniapp/src/screens/Debts.jsx`, new file)

Same shell as `Currency.jsx`: back button + title + a "+" button in the
header (opens the create sheet).

- Two-chip filter at the top: فعال / تکمیل‌شده — same inline-chip pattern
  used for History's search-scope toggle.
- List of plan cards: name, a thin progress bar (`paidCount /
  installmentCount`), "۴ از ۱۰ قسط" label, remaining balance, and next due
  date — or a "✅ تسویه شد" badge when `status = "completed"`.
- Tapping a card opens a detail view: the full installment list, each row
  showing seq, due date, amount, and a tap target to mark paid/unpaid.
  Overdue+unpaid rows are red, the single next-upcoming row is highlighted,
  paid rows are muted with a checkmark.
- "+" opens a create sheet (same sheet mechanism as Add Expense in
  `History.jsx`): name, total amount, installment count (stepper), start
  date (reusing the existing `JalaliDatePicker` component), optional note.
  Submits via `createDebt()`.
- Delete is available from the detail view, confirm-guarded, calling
  `deleteDebt()`.
- No amount/count/schedule editing in the UI — `PATCH` only ever sends
  `name`/`note`, matching the API design.

## Logging layer

Scoped to this feature only (an explicit, deliberate scope decision — not
an app-wide logging migration).

- New dependency: `pino`. Writes JSON lines to stdout, so it slots into the
  existing systemd + `journalctl` setup with zero infrastructure changes.
  `journalctl -u ai-money-journal-api -f` continues to capture everything;
  lines from this feature are JSON, everything else in the app stays plain
  `console.log`/`console.error` text as it is today. This mixed style is an
  accepted, deliberate trade-off of the "feature-scoped, not app-wide"
  decision.
- `api/services/debtsLogger.js` — one `pino` instance, level controlled by a
  `DEBTS_LOG_LEVEL` env var (default `info`). Imported by both the API
  routes and the bot's `debt_create`/`debt:confirm` handling, so
  plan-creation logic and its logging live in one place (the shared
  `createDebtPlan()` service).
- **info**: `debt_plan_created`, `debt_installment_paid`,
  `debt_installment_unpaid`, `debt_plan_completed` (auto-transition),
  `debt_plan_deleted` — one line per state-changing action, with
  `userId`/`debtId`/relevant amounts.
- **warn**: `debt_validation_rejected` (zero/negative amount or count, or an
  invalid `start_date`), `debt_create_low_confidence` (Gemini's
  `debt_create` parse came back below the same confidence threshold used
  for expenses).
- **error**: `debt_route_error` — caught in the router before the response
  is sent, with the full error and request context, in addition to (not
  instead of) the existing global Express error handler in `api/index.js`.
- **debug** (off by default): `debt_installments_generated` — the full
  computed schedule before insert; logged whenever the rounding remainder
  is non-zero, since the "last installment absorbs the remainder" arithmetic
  is the one piece of real computation in this feature and the most likely
  source of a subtle bug. `debt_summary_computed` — the dashboard card's
  numbers; kept at debug since `GET /api/debts/summary` fires on every
  Dashboard load and would otherwise be noisy at `info`.

Explicitly out of scope: request-correlation IDs, log
shipping/aggregation, and any change to logging anywhere else in the
app.

## Edge cases

- **Timezone**: all due/overdue comparisons use Tehran-local "today"
  (`NOW() AT TIME ZONE 'Asia/Tehran'`), matching the existing daily cron and
  expense-date conventions elsewhere in the app.
- **Currency**: debts default to `IRT`, matching expenses. The `currency`
  column exists for schema parity but the UI only exposes IRT in v1 — no FX
  conversion, and every real installment example seen in this user's data
  (mattress, DigiPay ×2, PlayStation, SnappPay) was IRT.
- **Editing an existing plan's amount/count/schedule**: not supported.
  Changing any of these after installments already exist raises the
  question of which unpaid installments shift and by how much, which has no
  single correct answer. The UI only allows editing `name`/`note`; changing
  the schedule means deleting and recreating the plan.
- **Deleting a plan with paid installments**: soft delete removes it from
  all views immediately, no special-case warning — same behavior as
  deleting an expense today.
- **`log` vs `debt_create` disambiguation risk**: this is the single
  highest-risk part of the design, since it depends on Gemini correctly
  distinguishing "I made a payment" from "I'm taking on a new obligation"
  from free text. Mitigated by: (a) the confirmation step before any insert
  happens (same safety net as expense logging), and (b) the
  `debt_create_low_confidence` log line, which gives a concrete signal for
  tuning the prompt post-launch if misclassifications turn up in practice.
- **Rounding**: `amount = total_amount / installment_count` for
  installments 1..N-1, with installment N set to `total_amount - (sum of
  1..N-1)` so the total always reconciles exactly regardless of division
  remainders.

## Explicitly out of scope for v1

- Money owed *to* the user (lending), as opposed to money the user owes.
- Non-monthly intervals or uneven per-installment amounts.
- Linking installment payments to the expense ledger/totals.
- Proactive Telegram reminders/cron for due dates.
- Marking installments paid via bot chat.
- Editing a plan's amount, count, or schedule after creation.
- Any app-wide logging changes beyond this feature.
