# Ubuntu VPS Deployment

This guide deploys:

- Express API on `127.0.0.1:3000`
- Telegram bot as a separate systemd service
- Dashboard (Telegram Mini App and standalone web app) as static files served by Nginx
- PostgreSQL on the same VPS
- HTTPS via Certbot

This guide is prepared for:

```text
zerex.hubworks.ir
```

## 1. Point DNS

Create an `A` record:

```text
zerex.hubworks.ir -> YOUR_VPS_IP
```

Wait until it resolves before issuing SSL.

## 2. Install packages

```bash
sudo apt update
sudo apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm
```

For a 1 GB RAM VPS, add swap before building:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Create database

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE DATABASE ai_money_journal;
CREATE USER ai_money_journal WITH ENCRYPTED PASSWORD 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE ai_money_journal TO ai_money_journal;
\c ai_money_journal
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT ALL ON SCHEMA public TO ai_money_journal;
\q
```

Your database URL will be:

```text
postgresql://ai_money_journal:choose-a-strong-password@127.0.0.1:5432/ai_money_journal
```

## 4. Upload project

Recommended path:

```bash
sudo mkdir -p /var/www/ai-money-journal
sudo chown -R "$USER":"$USER" /var/www/ai-money-journal
```

Copy or clone the project into `/var/www/ai-money-journal`.

## 5. Create production env

```bash
sudo cp /var/www/ai-money-journal/deploy/env.production.example /etc/ai-money-journal.env
sudo nano /etc/ai-money-journal.env
sudo chmod 600 /etc/ai-money-journal.env
sudo chown root:www-data /etc/ai-money-journal.env
```

Use:

```env
MINI_APP_URL=https://zerex.hubworks.ir
API_BASE_URL=https://zerex.hubworks.ir
VITE_API_BASE_URL=https://zerex.hubworks.ir
WEB_APP_ORIGIN=https://zerex.hubworks.ir
HOST=127.0.0.1
TELEGRAM_BOT_USERNAME=your_bot_username_without_at
ADMIN_TELEGRAM_IDS=your_numeric_telegram_id
```

- `WEB_APP_ORIGIN` is the only browser origin allowed to use cookie sessions. It must exactly match the address people open (scheme and host, no trailing slash).
- `HOST=127.0.0.1` keeps the API reachable only through Nginx. Do not open port 3000 in the firewall.
- `TELEGRAM_BOT_USERNAME` (no `@`) builds the login and link deep links.
- `ADMIN_TELEGRAM_IDS` lists Telegram IDs (comma-separated) exempt from daily usage limits.

Generate a JWT secret:

```bash
openssl rand -hex 32
```

## 6. Install and build

```bash
cd /var/www/ai-money-journal
pnpm install --prod=false
set -a
. /etc/ai-money-journal.env
set +a
pnpm run build
psql "$DATABASE_URL" -f db/schema.sql
for f in db/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
sudo chown -R www-data:www-data /var/www/ai-money-journal
```

`schema.sql` creates missing tables only. The files in `db/migrations/` alter existing tables and backfill account identities; they are idempotent, so running all of them on every deploy is safe. On a brand-new database they do nothing harmful.

## 7. Configure Nginx

```bash
sudo mkdir -p /etc/nginx/snippets
sudo cp /var/www/ai-money-journal/deploy/nginx-security-headers.conf /etc/nginx/snippets/ham-kharj-security-headers.conf
sudo cp /var/www/ai-money-journal/deploy/nginx.conf /etc/nginx/sites-available/ai-money-journal
sudo ln -s /etc/nginx/sites-available/ai-money-journal /etc/nginx/sites-enabled/ai-money-journal
sudo nginx -t
sudo systemctl reload nginx
```

Issue HTTPS:

```bash
sudo certbot --nginx -d zerex.hubworks.ir
```

After Certbot finishes, Telegram can load the Mini App over HTTPS.

What this Nginx config must keep doing (the web app depends on all three):

- `/api/` proxies with `X-Forwarded-For`, which the API's per-IP rate limits read (`trust proxy` is set to one hop).
- Unknown paths fall back to `index.html`, so `/login` and `/register` work when opened directly. Missing files under `/assets/` stay real 404s.
- The security-header snippet is included in the server block and in every location that sets its own `add_header` (Nginx does not inherit `add_header` into such locations). Certbot edits can reorder the file, so recheck with `curl -I` after running it.

## 8. Configure systemd

```bash
sudo cp /var/www/ai-money-journal/deploy/ai-money-journal-api.service /etc/systemd/system/
sudo cp /var/www/ai-money-journal/deploy/ai-money-journal-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ai-money-journal-api
sudo systemctl enable --now ai-money-journal-bot
```

Check status:

```bash
sudo systemctl status ai-money-journal-api
sudo systemctl status ai-money-journal-bot
curl https://zerex.hubworks.ir/health
```

View logs:

```bash
sudo journalctl -u ai-money-journal-api -f
sudo journalctl -u ai-money-journal-bot -f
```

## 9. Connect Telegram Mini App

In BotFather:

1. Open your bot settings.
2. Configure the Mini App / Web App URL.
3. Set it to `https://zerex.hubworks.ir`.

Also make sure `/etc/ai-money-journal.env` has:

```env
MINI_APP_URL=https://zerex.hubworks.ir
```

Restart services after env changes:

```bash
sudo systemctl restart ai-money-journal-api ai-money-journal-bot
```

## 10. Verify the web app

```bash
# API is private: this must fail from outside the server
curl -m 5 http://YOUR_VPS_IP:3000/health

# Headers and SPA fallback
curl -sI https://zerex.hubworks.ir/login | grep -i -E "^HTTP|strict-transport|x-content-type|referrer-policy"

# Cookie flags: sign up a throwaway address and read the Set-Cookie lines
curl -si -X POST https://zerex.hubworks.ir/api/auth/email/signup \
  -H "Content-Type: application/json" -H "Origin: https://zerex.hubworks.ir" \
  -d '{"email":"check@example.com","password":"a-long-test-password"}' | grep -i set-cookie
```

Expect `HttpOnly; Secure; SameSite=Lax` on both cookies, paths `/api` and `/api/auth`. Delete the throwaway account afterwards. Also confirm the logs contain no passwords, codes or tokens:

```bash
sudo journalctl -u ai-money-journal-api --since "1 hour ago" | grep -i -E "password|set-cookie|mj_refresh|poll.?secret"
```

## Operations

Reset an email account's password (no self-service reset yet):

```bash
sudo bash -c 'set -a; . /etc/ai-money-journal.env; set +a; cd /var/www/ai-money-journal && su www-data -s /bin/bash -p -c "node scripts/reset-password.js user@example.com"'
```

(The env file is readable only by root, hence the `sudo bash -c` wrapper.)

It prints a random temporary password once and signs the account out everywhere.

Back up the database before schema or migration changes:

```bash
sudo -u postgres pg_dump -Fc ai_money_journal > ~/ai_money_journal-$(date +%F).dump
```

Installed home-screen icons are cached by the phone. After changing the app icons, users must remove and re-add the app to see the new one.

## Deploying updates

```bash
cd /var/www/ai-money-journal
git pull
pnpm install --prod=false
set -a
. /etc/ai-money-journal.env
set +a
pnpm run build
psql "$DATABASE_URL" -f db/schema.sql
for f in db/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
sudo chown -R www-data:www-data /var/www/ai-money-journal
sudo systemctl restart ai-money-journal-api ai-money-journal-bot
sudo systemctl reload nginx
```
