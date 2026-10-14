# Web App Login and Account Architecture

Status: design approved in conversation 2026-10-14; revised the same day to defer all email sending (no verification, no password reset). Awaiting final written-spec review.
Scope: identity, login, linking and session architecture for a standalone web app (PWA) alongside the Telegram bot and Mini App. The landing page, install-to-home-screen prompt, and any web quick-entry feature are separate designs.

## Decisions

| Topic | Decision |
|---|---|
| Who can use the web app | Anyone. Independent accounts from day one; Telegram is optional. |
| Independent sign-in | Email + password only. No phone, Google, or passkey at launch. |
| Telegram users on the web | "Continue with Telegram": bot-approved login via the Telegram button (A) or a 6-digit code (C). No QR code. |
| Linking email and Telegram | Allowed only when at most one side has data. If both have data, refuse and ask which to keep. No merging. |
| Account model | Accounts + identities. `users.id` stays a numeric internal account ID, so no migration of existing rows. |
| Frontend | One codebase, two modes: Mini App when Telegram `initData` is present, web app otherwise. |
| Email delivery | Deferred. No emails are sent at launch. Amazon SES is the planned provider when it is enabled later. |
| Email verification | Off at launch. Accounts are usable immediately after sign-up. `verified_at` is set at sign-up so verification can be switched on later without a migration. |
| Forgot password | Disabled at launch. See "Interim account recovery". |
| Legal pages, web quick entry | Out of scope for now. |

## Identity model

`users` remains the account table. Existing Telegram-originated accounts keep their ID (the Telegram ID). New email-originated accounts take IDs from a sequence starting at 5,000,000,000,000,000, which is above any possible Telegram user ID, so the two ranges cannot collide.

New tables:

- `auth_identities (id, user_id, provider 'telegram'|'email', provider_user_id, password_hash, verified_at, created_at)`
  - `UNIQUE (provider, provider_user_id)` and `UNIQUE (user_id, provider)`: one Telegram and one email per account.
  - `provider_user_id` is the Telegram ID as text, or the lowercased email.
  - `password_hash` is set for email identities only.
- `sessions (id, user_id, refresh_token_hash, device_label, created_at, last_used_at, expires_at, revoked_at)`
- `one_time_codes (id, purpose, user_id, email, code_hash, expires_at, attempts, consumed_at)`
  - Launch purposes: `web_login` (issued by bot, consumed by web) and `link_telegram` (issued by web, consumed by bot).
  - Reserved for later: `verify_email`, `reset_password`.
- `login_requests (id, poll_secret_hash, status 'pending'|'approved'|'rejected'|'claimed'|'expired', user_id, device_label, expires_at)`

Backfill: one `telegram` identity row per existing user, `provider_user_id = users.id`, verified.

## Login flows

1. **Email sign-up.** Email, password, display name. The account is created and logged in immediately. No email is sent and the address is not verified, so at launch the email acts as a username. An already-registered email is rejected with an explicit "already registered" error.
2. **Email login.** Email + password issues a session. Wrong email and wrong password return the same error. Rate-limited per email and per IP.
3. **Forgot password: disabled at launch.** The login screen has no reset option. When email delivery is enabled later, this becomes an emailed single-use code (30 minutes) that revokes all sessions on use.
4. **Continue with Telegram.**
   - **A (button):** the web app creates a `login_request` and receives `{requestId, pollSecret, botLink}`. The link opens the bot at `/start web_<requestId>`. The bot shows the device label with Approve/Reject buttons. On approval the web app, holding the `pollSecret`, claims the session. The link alone is not enough to claim it.
   - **C (code):** the user sends `/web` to the bot, which replies with a 6-digit `web_login` code. The user types it into the web app, which exchanges it for a session.
5. **Mini App.** Unchanged: signed `initData` is verified, then resolved to an account through `auth_identities`.

## Linking

Implemented in `db/linking.js`; all merging decisions happen in one transaction under row locks, and any doubt rolls back and changes nothing.

- **Add email to a Telegram account:** `POST /api/auth/link/email` with email and password. No second account is involved, so nothing can be merged or lost. An already-registered email is refused. A security notice is sent to the account's Telegram chat.
- **Connect Telegram to an email account:** the web app calls `POST /api/auth/link/telegram` and receives a 120-bit single-use token (10 minutes) as a deep link (`/start link_<token>`) or manual `/link <token>`. A 6-digit code was rejected here: anyone messaging the bot could guess an active code and attach their own Telegram account to a victim's email account.
- **Explicit confirmation in the bot:** before anything changes, the bot shows the email address and a summary of what each side holds, with Confirm and Cancel buttons. This stops an attacker from sending someone a link that would attach the victim's Telegram data to the attacker's email account.
- **"Has data" is strict.** An account counts as having data if it has any expense row (including soft-deleted), any debt, any AI report, any custom category, or any default category whose label or colour was edited. Only untouched default categories and usage counters count as empty.
- **Survivor rules, in one transaction:**
  - Only one side has data: that account survives and the other identity is moved onto it.
  - Neither side has data: the email account survives and the Telegram identity is moved onto it.
  - Both sides have data: the link is refused and nothing is changed. The bot explains why. A "choose which account to keep" action is intentionally not implemented, because it would be destructive.
  - The empty account row is deleted only after re-checking, inside the transaction, that it has no data. Today's bot usage count is merged into the survivor so linking cannot be used to reset the daily limit.
- **Sessions:** when the Telegram account survives, the absorbed email account's web sessions are removed and the user logs in again with the same email and password (which now opens the Telegram account). Confirmation happens in the bot, so a new session cannot be issued in the same response.
- **Other refusals:** a Telegram account that already has an email, an email account that already has Telegram, and expired or reused tokens.
- **Abuse limits:** 5 token issues and 5 add-email attempts per account per 15 minutes; 8 link attempts per Telegram user per hour.
- **Maintenance note:** when a table that references `users` is added, update `accountDataSummary` in `db/linking.js`.

## Sessions and security

- Web app session: `httpOnly`, `Secure`, `SameSite=Lax` cookie holding a 15-minute access token, plus a 30-day rotating refresh token whose hash is stored in `sessions`. "Log out of all devices" revokes every row for the account.
- Mini App keeps its in-memory bearer token. The API accepts either credential.
- Passwords hashed with Node's built-in `scrypt`. Minimum 8 characters, never logged, small common-password blocklist.
- Rate limits: sign-up and login attempts per email and per IP; 5 tries per one-time code.
- CORS restricted to the web app's own origin (currently open to all origins).
- Installed iPhone apps have their own cookie jar, so login must happen inside the installed app. The landing page must therefore place "add to home screen" before login. Designed separately.

## System connections

- One API serves the Mini App and web app. The bot shares the `db` module directly, as today.
- A shared `resolveAccount()` maps a Telegram user or an email to an account ID. Everywhere the bot, Mini App auth, and jobs use `ctx.from.id` as the account ID, they resolve first.
- Reminder jobs (22:00 daily prompt, 11:00 debt reminders) must select only accounts with a Telegram identity and send to that identity's chat ID. Today they send to `users.id`, which would fail for email-only accounts.
- Admin is "account has a Telegram identity listed in `ADMIN_TELEGRAM_IDS`". Daily bot limit and daily report limit are keyed by account ID and apply to every door.

## API and bot surface

- API at launch: `POST /api/auth/email/signup`, `POST /api/auth/email/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`, `POST /api/auth/telegram/request`, `GET /api/auth/telegram/poll`, `POST /api/auth/code`, `POST /api/auth/link/telegram`, `POST /api/auth/link/email`, `POST /api/auth/password` (set or change the password while logged in). Deferred: verify-email, forgot, reset.
- Bot: `/start web_<requestId>` (approve), `/web` (issue code), `/link <code>`.

## Error handling

- Expired, used, or wrong codes return a single generic "invalid or expired" error.
- Login failure messages never reveal whether an email exists.
- Sign-up with an email already in use returns an explicit "already registered" error. This reveals that an email exists, an accepted trade-off while no email can be sent.
- Linking refusal is explicit and non-destructive.

## Testing

Scripted flows on the server with disposable accounts, as used for the daily limits: sign-up, login, duplicate-email rejection; both Telegram handshakes; linking in all four data combinations; plus abuse cases (expired and replayed codes, wrong poll secret, rate-limit trips, concurrent link attempts, existing Telegram users unaffected after backfill).

## Interim account recovery

With no email delivery, a forgotten password cannot be reset by the user. Two fallbacks exist until email is enabled: an account with a linked Telegram identity can always log in through the Telegram handshake and set a new password in Settings; otherwise the admin resets the password hash manually with a script. Users should be told at sign-up that there is no password reset yet.

## Out of scope

Landing page and install prompt; natural-language quick entry on the web; legal pages (terms, privacy policy); email sending, verification and password reset; passkeys, phone, and Google sign-in; account deletion and data export; account merging.

## Deferred dependencies

- Amazon SES setup and SPF/DKIM DNS records (owner action), required before email verification and password reset can be enabled.
- Terms of service and privacy policy, recommended before opening sign-up to the public since emails and passwords are now stored.
- Whether web-only users get a natural-language quick-entry box, since they will not have the bot.
