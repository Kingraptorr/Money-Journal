# Web App Login and Accounts: Implementation Plan

Spec: `docs/superpowers/specs/2026-10-14-web-app-auth-design.md` (read it first).
Goal: let people use the app from a browser with their own email + password account or through Telegram, with one shared identity model across bot, Mini App and web app.

## How to read this plan

- Phases are ordered so that **every phase can be deployed on its own** and existing Telegram users notice nothing until Phase 7.
- Phase 3 is the only phase that touches live behavior of the bot and API. It is deliberately isolated and must be a pure no-op for existing users.
- Each task lists files, what changes, and how to verify. Verification uses the same pattern as the daily-limits work: scripted checks on the server with disposable users (IDs 9999999xx), then cleanup.
- Deploy pattern for every phase: chown to ubuntu, rsync changed files, chown back to www-data, restart `ai-money-journal-api` and `ai-money-journal-bot`, check logs. Run migrations **as the app DB role** (`psql "$DATABASE_URL" -f ...`), or run `ALTER TABLE ... OWNER TO ai_money_journal` afterwards. A migration run as `postgres` once produced a table the app could not read.

## Inventory: what depends on "Telegram ID = account ID"

| Where | Current use | Change |
|---|---|---|
| `bot/handlers/message.js` | `ctx.from.id` for DB reads and writes (delete lookup, usage limit, `upsertUser`) | Use `ctx.account.id` for DB; keep `ctx.from.id` for in-memory conversation state |
| `bot/handlers/callback.js` | `userId = ctx.from.id` for INSERT/UPDATE on expenses | Use `ctx.account.id` for DB; keep Telegram ID for state |
| `bot/handlers/start.js` | `upsertUser(ctx.from)` | Replaced by the resolver middleware; add `web_<id>` payload branch |
| `bot/handlers/voice.js` | state and limit check by `ctx.from.id` | Limit check by account ID |
| `bot/index.js` 22:00 reminder | `SELECT ... FROM users`, sends to `users.id` | Join `auth_identities` (telegram), send to its chat ID |
| `bot/services/debtReminders.js` | `bot.api.sendMessage(userId, ...)` with `userId` from debts | Map account ID to Telegram chat ID via identities |
| `api/routes/auth.js` | `upsertUser` + `signSession(telegramUser.id)` | Resolve via identities, sign with account ID |
| `api/middleware/auth.js` | bearer JWT only | Also accept session cookie |
| `db/usageLimits.js`, `api/routes/reports.js` | `isAdminUser(userId)` compares account ID to Telegram IDs | Resolve the account's Telegram identity; becomes async |
| `api/routes/*` (47 uses of `req.user.id`) | Account ID from JWT | **No change**, as long as JWT carries the account ID |
| `miniapp/src/utils/api.js`, `main.jsx`, `App.jsx` | Telegram-only auth | Web mode (Phase 7) |

## Phase 0: Safety net (30 min)

- [ ] Take a database backup on the server: `pg_dump ai_money_journal > /home/ubuntu/backup-pre-accounts-<date>.sql`. Keep it until Phase 3 has run cleanly for a week.
- [ ] Record a baseline: row counts for `users`, `expenses`, `debts`, `categories`; confirm bot and Mini App work.
- [ ] Add `WEB_APP_ORIGIN` (the public web origin) to `/etc/ai-money-journal.env` and `deploy/env.production.example`.

Done when: backup file exists and baseline counts are written down.

## Phase 1: Schema and backfill (additive only)

Files: `db/schema.sql`, new `db/migrations/2026-10-accounts.sql` (idempotent).

- [ ] Create sequence `account_id_seq START 5000000000000000`.
- [ ] Create `auth_identities`, `sessions`, `one_time_codes`, `login_requests` as in the spec, with indexes on `(provider, provider_user_id)`, `sessions(refresh_token_hash)`, `one_time_codes(code_hash)`, `login_requests(expires_at)`.
- [ ] Backfill: `INSERT INTO auth_identities (user_id, provider, provider_user_id, verified_at) SELECT id, 'telegram', id::text, created_at FROM users ON CONFLICT DO NOTHING`.
- [ ] No new column on `users`: email accounts store their display name in `first_name`.

Verify: identity count equals user count; re-running the migration changes nothing; app role can read and write every new table; bot and API untouched and still healthy (no code changed yet).

## Phase 2: Account resolver

Files: new `db/accounts.js`; tests as a temporary server script.

- [ ] `resolveTelegramAccount(tgUser)`: find identity `(telegram, id)`; if found, refresh name/username and return the account; if not, create a `users` row with `id = telegram id` (keeps today's behavior for new Telegram users) plus the identity, then `ensureDefaultCategories`.
- [ ] `createEmailAccount({ email, passwordHash, displayName })`: new ID from the sequence, `users` row, `email` identity with `verified_at = NOW()`, default categories. Lowercase and trim email. Unique-violation returns a typed `email_taken` error.
- [ ] `findEmailIdentity(email)`, `getTelegramIdentity(accountId)` (used by reminders and admin).
- [ ] `isAdminAccount(accountId)`: async, looks up the account's telegram identity and compares to `ADMIN_TELEGRAM_IDS`. Keep a short in-process cache (60 s).
- [ ] Keep `upsertUser` as a thin wrapper over `resolveTelegramAccount` until all callers are migrated, then delete it.

Verify: existing user resolves to the same ID; new Telegram user created as before; email user gets an ID in the 5e15 range; duplicate email raises `email_taken`; two concurrent signups for one email produce one account.

## Phase 3: Wire bot and API to the resolver (no behavior change)

This phase must be indistinguishable from today for every existing user. Deploy it alone and watch it.

- [ ] Immediately before deploying, re-run `db/migrations/2026-10-accounts-backfill.sql` as the app role. It is idempotent and only touches users with no identity, so it self-heals Telegram users created since Phase 1 and never gives email accounts a bogus Telegram identity (caught by the Phase 2 tests).
- [ ] `bot/index.js`: add middleware before handlers: `ctx.account = await resolveTelegramAccount(ctx.from)` (skip for updates without `from`). Keep the timing middleware.
- [ ] `bot/handlers/*`: replace DB-facing `ctx.from.id` with `ctx.account.id`; leave `getUserState/setUserState/clearUserState` keyed by `ctx.from.id`. Remove the now-redundant `upsertUser` calls.
- [ ] `db/usageLimits.js`: `isOverBotLimit` / `recordBotUsage` take account ID and use `isAdminAccount`. `api/routes/reports.js` awaits `isAdminAccount`.
- [ ] 22:00 reminder and `debtReminders.js`: select accounts that have a telegram identity and send to `provider_user_id`. Add a guard so an account without one is skipped, never errors.
- [ ] `api/routes/auth.js` `/telegram`: resolve, then `signSession(account.id)`.

Verify (regression): log an expense by text, edit, confirm, delete; voice path; clarification flow; 10/day limit and admin bypass; report limit; `/dashboard`; Mini App loads and shows the same data; debt reminder job dry run lists the same recipients as before; no errors in logs for 24 hours.

Rollback: redeploy the previous files; schema from Phase 1 is additive and can stay.

## Phase 4: Sessions and email auth API

Files: new `api/services/passwords.js`, `api/services/sessions.js`, `api/middleware/rateLimit.js`; edit `api/middleware/auth.js`, `api/routes/auth.js`, `api/index.js`.

- [ ] `passwords.js`: `hashPassword` / `verifyPassword` with `crypto.scrypt` (random 16-byte salt, encoded parameters, `timingSafeEqual`). Reject passwords under 8 characters or in a small blocklist.
- [ ] `sessions.js`: create session (random 32-byte refresh token, store SHA-256 hash, device label from User-Agent), rotate on refresh (reuse of an old token revokes the family), revoke one or all.
- [ ] Cookies: `access` (15 min JWT) and `refresh` (30 day), both `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/api`.
- [ ] `requireAuth`: accept bearer token (Mini App) **or** access cookie; refresh handled by a dedicated endpoint.
- [ ] Endpoints: `POST /api/auth/email/signup`, `/email/login`, `/logout`, `/refresh`, `GET /me`, `POST /password`.
- [ ] `rateLimit.js`: in-memory sliding window (single server instance, so in-memory is sufficient): 10 login attempts per 15 min per email and per IP; 5 signups per hour per IP. Return 429 with retry-after.
- [ ] CORS: allow only `WEB_APP_ORIGIN` with credentials; keep bearer access for the Mini App on the same origin.
- [ ] State-changing cookie requests require `Content-Type: application/json` (blocks simple cross-site form posts).

Implementation notes (done): the API now binds to `127.0.0.1` (override with `HOST`), because port 3000 was reachable from the public internet and `X-Forwarded-For` could be forged to dodge IP rate limits; `trust proxy` is set to 1 to match nginx. Optional env: `COOKIE_SECURE=false` (local http dev only), `CORS_EXTRA_ORIGINS` (comma list). **Phase 7 client rule:** every non-GET request sent with the cookie session must carry `Content-Type: application/json` (the server rejects anything else with 403).

Verify: signup then login then `/me`; wrong password and unknown email return identical responses; duplicate email returns `email_taken`; refresh rotates and old refresh token is rejected; logout revokes; 11th bad login is 429; a request with no cookie and no bearer is 401; existing bearer flow unchanged.

## Phase 5: Telegram handshakes (A button, C code)

Files: new `api/routes/telegramLogin.js`, `db/oneTimeCodes.js`; edit `bot/handlers/start.js`, `bot/handlers/callback.js`, `bot/index.js`.

- [ ] `POST /api/auth/telegram/request`: create `login_request` (5 min), return `{ requestId, pollSecret, botLink }` where `botLink = https://t.me/<bot>?start=web_<requestId>`. Only the hash of `pollSecret` is stored.
- [ ] Bot `/start web_<requestId>`: show device label with Approve / Reject inline buttons. Approve sets status `approved` and `user_id = ctx.account.id`; Reject sets `rejected`. Expired or unknown requests get a clear message.
- [ ] `GET /api/auth/telegram/poll` (header `X-Poll-Secret`): `pending` returns 202; `approved` creates a session, sets cookies, marks `claimed`; other statuses return the matching error. Single use.
- [ ] Bot `/web`: issues a `web_login` code for the account (5 min, single use, replaces any earlier code).
- [ ] Guess protection for C: the web app first calls `POST /api/auth/code/challenge` and gets an opaque `challengeId` (stored in `login_requests`, rate limited to 10 per hour per IP). `POST /api/auth/code` takes `{challengeId, code}`; a challenge dies after 5 wrong codes. Without a challenge, a 6-digit code could be guessed globally against every active code. Requires one additive column: `login_requests.attempts INTEGER NOT NULL DEFAULT 0`.
- [ ] Code comparison is constant-time on the hash; codes are random from `crypto.randomInt`.

Verify: full approve flow end to end; reject; expired request; wrong poll secret; replayed claim; leaked link used from a second browser fails; code reuse fails; 6th wrong code burns the code; `/web` twice invalidates the first code.

## Phase 6: Linking

Files: new `db/linking.js`, `api/routes/link.js`; edit bot `/link <code>` handler.

- [ ] `accountHasData(accountId)`: any non-deleted expense or any debt.
- [ ] `linkTelegramToAccount(emailAccountId, telegramId)` in one transaction using the survivor rules from the spec, locking both user rows (`SELECT ... FOR UPDATE`, ordered by ID to avoid deadlocks). Both sides with data: return `both_have_data`, change nothing.
- [ ] Web: `POST /api/auth/link/telegram` issues a `link_telegram` code; bot `/link <code>` consumes it and calls the linker.
- [ ] Telegram to email: `POST /api/auth/link/email` for a logged-in Telegram-only account; if the email is free, attach and set password (no verification).
- [ ] After a link that changes the surviving account ID, revoke the user's sessions and issue a fresh one in the same response; the bot replies with a clear confirmation.

Verify all four data combinations (neither, only email, only Telegram, both) including that no row is lost or duplicated, concurrent link attempts, linking a Telegram ID already tied to another email account (refused), and that the bot works for the linked account immediately afterward.

## Phase 7: Frontend web mode

Files: `miniapp/src/main.jsx`, `App.jsx`, `utils/api.js`, new `miniapp/src/auth/` (Login, Signup, TelegramLogin screens, `AuthGate`), `screens/Settings.jsx`.

- [ ] Bootstrap: if Telegram `initData` is present, behave exactly as today; otherwise enter web mode and call `GET /api/auth/me`.
- [ ] Web mode with no session shows a minimal auth page (the landing page replaces this later): tabs for Sign in / Create account, plus "Continue with Telegram" showing the button and a code field.
- [ ] `api.js`: web mode uses cookies (`credentials: "same-origin"`), one automatic `/refresh` on a 401, then falls back to the auth page.
- [ ] Telegram handshake UI: start request, show the link button, poll every 2 s up to 5 min, show success and error states; code field with clear error text.
- [ ] Settings (web and Mini App): connect Telegram / add email, change password, log out, log out of all devices, and a visible note that password reset is not available yet.
- [ ] Hide Mini App-only chrome (Telegram back button, haptics) in web mode; keep all six screens shared.
- [ ] Persian copy for every state: invalid credentials, rate limited, email taken, expired code, link refused with "choose one account".

Verify in the browser pane and on a phone-width viewport: signup, login, reload keeps session, logout; Telegram button and code paths; Mini App still loads and behaves as before.

## Phase 8: Hardening and rollout

- [ ] Abuse pass from the spec's test list, run again against production: replay, expiry, wrong secret, rate limits, concurrent links.
- [ ] Confirm cookies are `Secure; HttpOnly; SameSite=Lax` and CORS rejects other origins.
- [ ] Confirm no password, code, or token appears in logs (grep the journal).
- [ ] Confirm nginx forwards `X-Forwarded-For` so rate limiting sees client IPs, and serves the SPA fallback for web routes.
- [ ] Update `README.md` and `deploy/ubuntu-vps.md` (new env var, new tables, new commands), and the admin password-reset script under `scripts/`.
- [ ] Commit in logical commits per phase. Push only when asked.

## Risks

| Risk | Mitigation |
|---|---|
| Phase 3 breaks the bot for existing users | Isolated deploy, regression list above, backup from Phase 0, one-command rollback |
| Account ID type mismatch (JWT string vs BIGINT) | Sequence start 5e15 is below 2^53, so safe as a JS number; `pg` returns BIGINT as strings, so keep ID comparisons string-based and test one email-range ID end to end |
| In-memory state lost on restart (conversation state, rate limits) | Already true for conversation state; rate limits reset on restart, acceptable for launch |
| No password reset | Telegram-linked fallback plus admin script; sign-up warns users |
| Email squatting without verification | Accepted at launch; revisit when email delivery is added |
| Link transaction bugs losing data | Never delete a side with data; all-or-nothing transaction; exhaustive four-case test; backup |

## Not in this plan

Landing page and the install-to-home-screen prompt (including the web manifest and icons that installability needs), web quick entry, legal pages, email sending/verification/reset, passkeys, phone and Google sign-in.
