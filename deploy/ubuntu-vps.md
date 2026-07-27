# Ubuntu VPS Deployment

This guide deploys:

- Express API on `127.0.0.1:3000`
- Telegram bot as a separate systemd service
- Mini App as static files served by Nginx
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
```

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
sudo chown -R www-data:www-data /var/www/ai-money-journal
```

## 7. Configure Nginx

```bash
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
sudo chown -R www-data:www-data /var/www/ai-money-journal
sudo systemctl restart ai-money-journal-api ai-money-journal-bot
sudo systemctl reload nginx
```
