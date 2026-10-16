# AI Money Journal (Ham-Kharj)

Persian-first personal expense journal. People log spending by chatting with a Telegram bot, then review it in a dashboard that runs both as a Telegram Mini App and as a standalone installable web app (PWA).

- **Telegram bot** – text and voice expense entry, always confirmed before saving; debts and installments; daily reminders
- **AI** – Gemini extracts structured expenses and writes reports; Groq Whisper transcribes voice
- **Dashboard** – React + Vite, RTL Persian, Jalali dates; one codebase for the Mini App and the web app
- **API** – Express, PostgreSQL, soft deletes
- **Accounts** – Telegram login (inside Telegram or from the browser) and independent email + password accounts, which can be linked later

## How the pieces fit

```text
bot/        Telegram bot (grammy): messages, voice, callbacks, reminders
api/        Express API: expenses, categories, reports, debts, currency, auth
db/         schema.sql, migrations/, and data access (accounts, linking, web login, usage limits)
miniapp/    React app. Telegram Mini App mode when opened inside Telegram, web mode otherwise
deploy/     systemd units, nginx config + security-header snippet, env example, VPS guide
scripts/    admin tools (password reset)
docs/       design spec and implementation plan for the web app and accounts
```

### Accounts

`users.id` is the internal account ID. Who can sign in as an account is stored in `auth_identities` (`telegram` and/or `email`). Existing Telegram accounts keep their Telegram ID as their account ID; email accounts get IDs from `account_id_seq` (starts at 5,000,000,000,000,000, above any Telegram ID).

- **Email + password** – sign up and log in on the web app. No email verification or self-service reset yet.
- **Telegram from the browser** – either approve a request in the bot (deep link `/start web_<id>`), or send `/web` to the bot and type the 6-digit code.
- **Linking** – an email account and a Telegram account can be joined only when at most one side has data (expenses, debts, reports or edited categories). If both have data, nothing is merged or deleted. Linking is started from account settings, confirmed in the bot.

### Usage limits

- Bot: 10 AI-analysed expense messages per user per day (Tehran time).
- Mini App / web: 1 AI report per user per day.
- Debt insight sentence: Gemini is asked at most once per user per day, on the first app open.
- Admins (`ADMIN_TELEGRAM_IDS`) are unrestricted.

## Setup (local)

```bash
npm install
cp .env.example .env     # then fill it in
psql "$DATABASE_URL" -f db/schema.sql
```

Environment variables (see `.env.example`; production values in `deploy/env.production.example`):

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` | Bot credentials; the username (no `@`) is used to build login/link deep links |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_REPORT_MODEL` | Expense extraction model and report/insight model |
| `GROQ_API_KEY` | Voice transcription |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs access tokens; also keys the hashes of login codes and link tokens |
| `MINI_APP_URL`, `API_BASE_URL`, `VITE_API_BASE_URL` | Public URLs |
| `ADMIN_TELEGRAM_IDS` | Comma-separated Telegram IDs exempt from usage limits |
| `WEB_APP_ORIGIN` | The one browser origin allowed to use cookie sessions (CSRF and CORS allowlist) |
| `HOST`, `PORT` | API bind address (default `127.0.0.1:3000`; keep it private behind nginx) |
| `COOKIE_SECURE=false`, `CORS_EXTRA_ORIGINS` | Local http development only |

The licensed IranSans/Vazirmatn font files go in `miniapp/public/fonts/`.

## Run

```bash
npm run api       # Express API
npm run bot       # Telegram bot
npm run miniapp   # Vite dev server for the dashboard
npm run build     # production build into dist/miniapp
```

## Database changes

`db/schema.sql` creates everything on a fresh database and is safe to re-run, but it does not alter existing tables. For an existing install, also run the idempotent files in `db/migrations/` in filename order:

```bash
for f in db/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Tables added for accounts: `auth_identities`, `sessions`, `one_time_codes`, `login_requests`, `bot_usage_daily`, plus the `account_id_seq` sequence. When you add a table that holds user-owned data, update `accountDataSummary` in `db/linking.js` so linking keeps treating that data as "has data".

## API and authentication

Mini App (inside Telegram): `POST /api/auth/telegram` with the signed `initData` returns a bearer token; send it as `Authorization: Bearer <token>`.

Web app: cookies, set by the server only.

| Cookie | Lifetime | Path | Notes |
|---|---|---|---|
| `mj_access` | 15 minutes | `/api` | JWT, `HttpOnly; Secure; SameSite=Lax` |
| `mj_refresh` | 30 days, rotated on every use | `/api/auth` | opaque, stored hashed; reusing a rotated token outside a 10 s grace window signs the account out everywhere |

Cookie-authenticated writes must send `Content-Type: application/json` and a matching `Origin`.

```http
POST /api/auth/email/signup | /email/login | /refresh | /logout | /logout-all | /password
GET  /api/auth/me
POST /api/auth/telegram/request   GET /api/auth/telegram/poll    (browser approval flow)
POST /api/auth/code/challenge     POST /api/auth/code            (6-digit code flow)
POST /api/auth/link/telegram      POST /api/auth/link/email      (account linking)
```

Data endpoints (`/api/expenses`, `/api/categories`, `/api/reports`, `/api/currency`, `/api/debts`) require either form of authentication. The `month` query is a Jalali month in `YYYY-MM` format.

## Operations

Reset an email account's password (there is no self-service reset yet). Run it on the server; the production env file is root-only, so load it inside `sudo`:

```bash
sudo bash -c 'set -a; . /etc/ai-money-journal.env; set +a; cd /var/www/ai-money-journal && su www-data -s /bin/bash -p -c "node scripts/reset-password.js user@example.com"'
```

It prints a random temporary password once and signs the account out everywhere. Send it to the owner over a private channel.

### Known limits

- No email verification, email sending or password reset by email yet; people who forget a password need an admin reset, or can use the Telegram login if the account is linked.
- Rate limiters are in memory and reset when the API restarts.
- Access tokens are stateless: after "log out everywhere" or a password change, an already-issued access token can still work for up to 15 minutes (refresh is cut off immediately).
- No Content-Security-Policy or `X-Frame-Options`: Telegram Web embeds the Mini App in an iframe.
- No terms or privacy pages yet.

## Deploy

Ubuntu VPS files are in `deploy/`. Start with [`deploy/ubuntu-vps.md`](deploy/ubuntu-vps.md).
