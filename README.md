# Persian Poems Telegram Bot

A Telegram bot that serves **Persian poetry** in Farsi. Poem text is loaded from [Ganjoor](https://ganjoor.net) (HTML fetch + Cheerio). The stack is **TypeScript**, **grammY**, **MongoDB** (Mongoose), **Express** (webhook mode), and **Docker**.

## Features

### Poets (inline menu)

Browse by author; each poet has a Farsi menu with bios where applicable and poem lists from Ganjoor:

| Poet | Highlights |
|------|------------|
| **حافظ** | غزلیات، رباعیات، قطعات، قصاید، مثنوی، ساقی‌نامه، فال حافظ |
| **خیام** | رباعیات |
| **مولانا** | شمس (غزلیات، مستدرکات، ترجیعات، رباعیات)، مثنوی (۶ دفتر) |
| **سعدی** | غزلیات، رباعیات، قطعات (دیوان) |
| **نظامی** | پنج‌گانه (مخزن‌الاسرار، خسرو و شیرین، لیلی و مجنون، هفت‌پیکر، شرفنامه، خردنامه) |
| **فردوسی** | شاهنامه (آغاز، فهرست بخش‌ها، پیمایش زیربخش‌ها) |

### Random poem

- **Random poem** — picks from several poets and corpora (حافظ، خیام، مولانا، سعدی، فردوسی، نظامی) with long-text splitting where needed.

Optional **scheduled daily broadcast** (same random poem for all users who have used `/start`, Asia/Tehran) is controlled with `DAILY_DIGEST_*` env vars.

### Favorites

- **⭐ Favorite** — save a poem (Ganjoor path + title) to the user profile; list and reopen from the menu.

Requires MongoDB; user document is created on `/start` (recommended before using favorites).

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Main menu (poets + shortcuts) |
| `/poem` | Random **Hafez** ghazal |
| `/fal` | Same as `/poem` (فال-style) |
| `/favorites` | List starred poems |

### Main menu shortcuts (buttons)

- One **random** poem (multi-poet pool)
- **علاقه‌مندی‌ها** — favorites

Each poem view includes a link to the same text on **ganjoor.net** and a back button.

### Analytics

Usage events are appended to the **`analytics_events`** collection (`event` name, `telegramId`, optional profile fields, `chatType`, timestamps). Writes are **non-blocking** so handlers stay fast.

### Tech notes

- **Pagination** on long poem lists (inline keyboard).
- **Callback tokens** (`poem_tokens`) for favorite buttons stay within Telegram’s `callback_data` size limits (short TTL in MongoDB).

## Requirements

- **Node.js** ≥ 20  
- **MongoDB** (e.g. Atlas) — database name is fixed to `persian-poems` in code  
- A **Telegram bot token** from [@BotFather](https://t.me/BotFather)

## Environment variables

Copy `.env.example` to `.env` and fill in values. The important variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes (recommended) | Bot API token. Legacy: `TELEGRAM_BOT_API_TOKEN_DEV` / `TELEGRAM_BOT_API_TOKEN_PROD` with `NODE_ENV`. |
| `MONGODB_URL` | Yes | MongoDB connection string. Alias: `MANGO_DB_URL`. |
| `WEBHOOK_URL` | Yes in webhook mode | Public **HTTPS** URL Telegram will POST to (path optional — defaults to `/telegram/webhook` if the URL has no path). |
| `TELEGRAM_WEBHOOK_SECRET` | No | If set, must match Telegram `secret_token`; sent as `X-Telegram-Bot-Api-Secret-Token`. |
| `WEBHOOK_PATH` | No | Used only when `WEBHOOK_URL` has no path; default `/telegram/webhook`. |
| `PORT` | No | Port the **Node process** listens on inside the container (default `3000`). |
| `PUBLISH_PORT` | No | **Docker Compose only:** host port mapped to the app (default **`3002`**). GitHub deploy uses `3002` on the VM. |
| `BOT_TRANSPORT` | No | `polling` or `webhook`. Default: **polling** in development, **webhook** when `NODE_ENV=production`. |
| `SENTRY_DSN` | No | Enables Sentry in non-development environments. |

## Local development

```bash
npm install
cp .env.example .env   # then edit .env
npm start              # long polling — no HTTPS or WEBHOOK_URL needed
```

Use `/start` to open the menu; try `/favorites` after `/start` so your user exists in MongoDB for favorites.

### Try webhooks locally (ngrok)

1. Set `WEBHOOK_URL` to your ngrok HTTPS URL (with or without path; see `.env.example`).  
2. Run `ngrok http 3000` (or match `PORT`).  
3. Run `npm run start:webhook`.  
4. Health check: `GET /health` → `ok`.

To go back to polling, delete the webhook then use `npm start`:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

## Production build

```bash
npm run build
npm run start:prod    # expects compiled output + env (often webhook + WEBHOOK_URL)
```

Telegram requires **HTTPS** on supported ports (e.g. **443**). Put **Caddy**, **nginx**, or **Cloudflare Tunnel** in front of the app and set `WEBHOOK_URL` to the public URL that reaches this service (same path the app registers).

## Docker

```bash
docker build -t persian-poems:local .
# Host:container — VM / CI deploy publishes host port 3002 → container 3000
docker run --rm -p 3002:3000 \
  -e TELEGRAM_BOT_TOKEN="..." \
  -e MONGODB_URL="..." \
  -e WEBHOOK_URL="https://your.domain/telegram/webhook" \
  persian-poems:local
```

The image sets `NODE_ENV=production` and `BOT_TRANSPORT=webhook` by default. For a quick local test without a public URL, override with `-e BOT_TRANSPORT=polling`.

`docker compose` maps **`PUBLISH_PORT` (default `3002`) → `3000`** inside the container. Point Caddy/nginx at **`http://127.0.0.1:3002`** on the VM.

## CI/CD (GitHub Actions)

| Workflow | When | What it does |
|----------|------|--------------|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Pull requests to `main` / `master` | `npm ci` + `npm run build` |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Push to `main` / `master`, or **Run workflow** | Build & push image to **GHCR**, then **SSH** deploy to your VM |

### Deploy secrets (repository → **Settings → Secrets and variables → Actions**)

Required for `deploy.yml`:

- `VM_HOST`, `VM_USER`, `VM_SSH_KEY`  
- `TELEGRAM_BOT_TOKEN`  
- `WEBHOOK_URL`  
- `MONGODB_URL` **or** `DATABASE_URL` (Mongo URI)

Optional: `TELEGRAM_WEBHOOK_SECRET`

After the first successful publish, open **GitHub → Packages → this container image → Package settings** and set visibility to **Public** so the VM can `docker pull` without logging in to GHCR (same pattern as a typical small VPS deploy).

## License

ISC
