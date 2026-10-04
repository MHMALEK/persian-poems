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

### Daily poem and daily fal (opt-in)

**Both are off by default for every user.** A user turns them on or off from the «شعر روزانه و فال حافظ» main-menu button, `/daily_poem` or `/daily_fal`; every delivered message also carries a «خاموش کردن …» button. Choices live per user in `bot_users` (`dailyDigest`, `dailyFal`, `dailyPoets`) and survive `/start`.

- **Daily poem** — one random poem per day from the poets the user picked (default: all six). One poem per poet per day is cached in `daily_poems`, so everyone who picked the same poet gets the same poem and Ganjoor is fetched once per poet.
- **Daily Hafez fal** — one ghazal per day for everyone who opted in.
- **Occasions** — Nowruz (1 Farvardin) and Yalda (30 Azar) get a greeting line; on Yalda an extra fal goes out at 20:00 Tehran to everyone opted into either feature.
- **Channel** — set `DAILY_DIGEST_CHANNEL_ID` / `DAILY_FAL_CHANNEL_ID` (`@name` or `-100…`, bot must be admin) to also post each day's poem / fal there.
- **Share** — every poem carries an «ارسال برای دوستان» button (Telegram share sheet with the Ganjoor link and the bot handle).

The schedulers are switched on server-side with `DAILY_DIGEST_ENABLED=true` (time via `DAILY_DIGEST_HOUR_TEHRAN` / `DAILY_DIGEST_MINUTE_TEHRAN`, default 08:00). Operators listed in `ADMIN_TELEGRAM_IDS` can run `/digest_now [morning|digest|fal|yalda]` to trigger a broadcast immediately.

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Main menu (poets + shortcuts) |
| `/poem` | Random **Hafez** ghazal |
| `/fal` | Same as `/poem` (فال-style) |
| `/random_poem` | Random poem from **any** poet in the multi-poet pool (same as the inline «یک شعر تصادفی» button) |
| `/daily_poem`, `/daily_fal` | Daily poem / daily fal settings for yourself (same as the inline «شعر روزانه و فال حافظ» button) |
| `/digest_now [morning\|digest\|fal\|yalda]` | Operators only (`ADMIN_TELEGRAM_IDS`): run a broadcast now |
| `/stats` | Operators only: user counts, opt-in rates, last 7 days of events |
| `/ops_test <handler_error\|rejection\|exception\|daily_fail\|alert>` | Operators only, staging only (`OPS_TEST_COMMANDS=true`): trigger a failure scenario to verify alerts and recovery |

The command menu is registered by the bot itself on every start (`setMyCommands`), so BotFather needs no manual list; `/digest_now` only appears for the admin chats.

### Main menu shortcuts (buttons)

- One **random** poem (multi-poet pool)
- **Daily poem / daily fal** settings (per-user opt-in, default off, poet picker)

Each poem view includes a link to the same text on **ganjoor.net** and a back button.

### Analytics

Usage events are appended to the **`analytics_events`** collection (`event` name, `telegramId`, optional profile fields, `chatType`, timestamps). Writes are **non-blocking** so handlers stay fast.

### Tech notes

- **Pagination** on long poem lists (inline keyboard).

### Monitoring (free)

- **Liveness** — with `HEALTHCHECKS_PING_URL` set, the bot pings a [Healthchecks.io](https://healthchecks.io) check every minute; when pings stop (crash, VM down, tunnel dead), Healthchecks alerts you (Telegram integration available). On a fatal error the bot pings `/fail` before exiting so the alert is immediate.
- **Daily job** — `HEALTHCHECKS_DAILY_PING_URL` is pinged once after each morning run (`/fail` if it crashed); give that check a daily schedule with an hour of grace.
- **Errors** — handler errors, failed sends, missing poems and crashes are DMed to `ADMIN_TELEGRAM_IDS`, at most once per distinct error every 10 minutes.
- **`/stats`** (admins) — user counts, opt-in rates and the last week of events.

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
| `MONGODB_DB_NAME` | No | Database name (default `persian-poems`). The staging deploy uses `persian-poems-staging`. |
| `DAILY_DIGEST_CHANNEL_ID`, `DAILY_FAL_CHANNEL_ID` | No | Channel (`@name` or `-100…`) that also receives the daily poem / fal. Bot must be an admin there. |
| `ADMIN_TELEGRAM_IDS` | No | Comma-separated Telegram user ids allowed to run `/digest_now` and `/stats`; they also receive error alerts. |
| `HEALTHCHECKS_PING_URL`, `HEALTHCHECKS_DAILY_PING_URL` | No | Healthchecks.io ping URLs for liveness (every minute) and for the daily run. |

## Local development

```bash
npm install
cp .env.example .env   # then edit .env
npm start              # long polling — no HTTPS or WEBHOOK_URL needed
```

Use `/start` to open the menu and pick a poet or random poem.

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
| [`.github/workflows/deploy-staging.yml`](.github/workflows/deploy-staging.yml) | Push to `staging`, or **Run workflow** | Same, but to the `persian-poems-staging` container: its own bot token (`TELEGRAM_BOT_TOKEN_STAGING`), its own database (`persian-poems-staging`), long polling, no public URL |

### Deploy secrets (repository → **Settings → Secrets and variables → Actions**)

Required for `deploy.yml`:

- `VM_HOST`, `VM_USER`, `VM_SSH_KEY`  
- `TELEGRAM_BOT_TOKEN`  
- `WEBHOOK_URL`  
- `MONGODB_URL` **or** `DATABASE_URL` (Mongo URI)

Optional: `TELEGRAM_WEBHOOK_SECRET`, `DAILY_DIGEST_ENABLED` (`true` starts the daily poem / fal schedulers; recipients are opt-in users only), `DAILY_DIGEST_HOUR_TEHRAN`, `DAILY_DIGEST_MINUTE_TEHRAN`, `DAILY_DIGEST_CHANNEL_ID`, `DAILY_FAL_CHANNEL_ID`, `ADMIN_TELEGRAM_IDS`, `MONGODB_DB_NAME`

Staging (`deploy-staging.yml`): `TELEGRAM_BOT_TOKEN_STAGING` (required) plus the shared `VM_*` and `MONGODB_URL`; optional `MONGODB_URL_STAGING`, `MONGODB_DB_NAME_STAGING`, `DAILY_DIGEST_CHANNEL_ID_STAGING`, `DAILY_FAL_CHANNEL_ID_STAGING`, `DAILY_DIGEST_HOUR_TEHRAN_STAGING`, `DAILY_DIGEST_MINUTE_TEHRAN_STAGING`.

After the first successful publish, open **GitHub → Packages → this container image → Package settings** and set visibility to **Public** so the VM can `docker pull` without logging in to GHCR (same pattern as a typical small VPS deploy).

## License

ISC
