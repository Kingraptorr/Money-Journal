# AI Money Journal

Persian-first Phase 1 implementation for AI Money Journal:

- Telegram bot for text and voice expense entry
- Required confirmation before any expense is saved
- Gemini 2.0 Flash extraction with deterministic JSON output
- Groq Whisper transcription for Telegram voice messages
- Express API with Telegram Mini App authentication
- PostgreSQL schema with soft deletes
- React + Vite Telegram Mini App dashboard in RTL Persian
- Jalali month navigation and Jalali display dates

## Setup

```bash
npm install
cp .env.example .env
```

Fill in:

```bash
TELEGRAM_BOT_TOKEN=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=
DATABASE_URL=
MINI_APP_URL=
JWT_SECRET=
```

Apply the database schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Add the licensed IranSans web font files to:

```text
miniapp/public/fonts/
```

## Run

API:

```bash
npm run api
```

Bot:

```bash
npm run bot
```

Mini App:

```bash
npm run miniapp
```

## API

Mini App auth:

```http
POST /api/auth/telegram
```

Expense endpoints require `Authorization: Bearer <token>`:

```http
GET /api/expenses/summary?month=1403-09
GET /api/expenses/history?month=1403-09
GET /api/expenses/chart?month=1403-09
DELETE /api/expenses/:id
```

The `month` query is a Jalali month in `YYYY-MM` format.

## Deploy

Ubuntu VPS deployment files are in:

```text
deploy/
```

Start with:

```text
deploy/ubuntu-vps.md
```
