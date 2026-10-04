import cron from "node-cron";
import { Bot, GrammyError, InlineKeyboard } from "grammy";
import { alertAdmins, describeError } from "../services/admin-alerts";
import {
  getOrPickDailyPoem,
  type DailyPoemKind,
  type PickedPoem,
} from "../services/daily-poems";
import { pingDailyDigest } from "../services/heartbeat";
import { BotUser, deactivateUser } from "../services/users";
import type { PoemRef } from "../services/users/poems";
import { getBotUsername } from "../shared/bot-identity";
import { buildPoemActionKeyboard, buildShareUrl, SHARE_BUTTON_LABEL } from "../shared/poem-display";
import { POET_POOL } from "../shared/poet-pool";
import {
  pickRandomPoemForPoet,
  RANDOM_POEM_BACK_CALLBACK,
} from "../shared/random-poem";
import { sendPoemChunksToChat } from "../shared/send-poem-message";
import { occasionToday, tehranDateKey, TEHRAN_TZ, type Occasion } from "../shared/tehran-date";

const ALL_POET_IDS = POET_POOL.map((p) => p.author);
const HAFEZ = "hafez";
/** Yalda is an evening occasion; the special fal goes out at this Tehran hour on 30 Azar. */
const YALDA_CRON = "0 20 * * *";

type Recipient = { telegramId: number; dailyPoets?: string[] };

export type RunSummary = {
  kind: DailyPoemKind;
  dateKey: string;
  recipients: number;
  ok: number;
  failed: number;
  deactivated: number;
  channels: string[];
};

export type BroadcastSelection = "morning" | "digest" | "fal" | "yalda";

type BroadcastOptions = {
  /** Cache key instead of the Tehran day; interval mode passes one per run so every run picks fresh poems. */
  cacheKey?: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickOne<T>(items: readonly T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Returns a reason string when a send error means the user is permanently
 * unreachable (so we should stop broadcasting to them), or `null` for
 * transient errors worth retrying on the next run.
 */
function unreachableUserReason(e: unknown): string | null {
  if (e instanceof GrammyError) {
    // 403: bot was blocked by the user / user is deactivated / kicked.
    if (e.error_code === 403) return e.description ?? "forbidden";
    // 400 chat not found: the account no longer exists.
    if (e.error_code === 400 && /chat not found/i.test(e.description ?? "")) {
      return e.description ?? "chat not found";
    }
  }
  return null;
}

function occasionLine(occasion: Occasion | null): string {
  if (occasion === "nowruz") return "🌸 <b>نوروز مبارک!</b>\n\n";
  if (occasion === "yalda") return "🍉 <b>یلدا مبارک!</b>\n\n";
  return "";
}

function introHtml(
  kind: DailyPoemKind,
  poetLabel: string,
  occasion: Occasion | null
): string {
  switch (kind) {
    case "digest":
      return `${occasionLine(occasion)}🌅 <b>شعر روزانه</b>\nیک شعر از ${poetLabel} برای امروز.`;
    case "fal":
      return `${occasionLine(occasion)}🔮 <b>فال امروز حافظ</b>\nنیت کنید و بخوانید.`;
    case "yalda":
      return "🍉 <b>فال شب یلدا</b>\nشب یلدا مبارک. نیت کنید و بخوانید.";
  }
}

/** One Ganjoor fetch per (kind, poet) per run; the DB cache makes it one per day across restarts. */
class DailyPoemCache {
  private readonly memo = new Map<string, Promise<PickedPoem | null>>();

  constructor(private readonly dateKey: string) {}

  get(kind: DailyPoemKind, poetId: string): Promise<PickedPoem | null> {
    const key = `${kind}:${poetId}`;
    let pending = this.memo.get(key);
    if (!pending) {
      pending = getOrPickDailyPoem(this.dateKey, kind, poetId, () =>
        pickRandomPoemForPoet(poetId)
      );
      this.memo.set(key, pending);
    }
    return pending;
  }
}

function poetForRecipient(kind: DailyPoemKind, r: Recipient): string {
  if (kind !== "digest") return HAFEZ;
  const chosen = (r.dailyPoets ?? []).filter((p) => ALL_POET_IDS.includes(p));
  return pickOne(chosen.length ? chosen : ALL_POET_IDS) ?? HAFEZ;
}

async function sendToUser(
  bot: Bot,
  r: Recipient,
  kind: DailyPoemKind,
  picked: PickedPoem,
  occasion: Occasion | null,
  botUsername: string | undefined
): Promise<void> {
  const keyboard = await buildPoemActionKeyboard(
    undefined,
    picked.poem,
    RANDOM_POEM_BACK_CALLBACK,
    {
      actorUserId: r.telegramId,
      dailyDigestActions: kind === "digest",
      dailyFalActions: kind !== "digest",
      botUsername,
    }
  );
  await bot.api.sendMessage(
    r.telegramId,
    introHtml(kind, picked.poem.poetLabel, occasion),
    { parse_mode: "HTML" }
  );
  await sendPoemChunksToChat(bot, r.telegramId, picked.chunks, keyboard);
}

/** Channel posts get links only: callback buttons would try to edit the post into a menu. */
function channelKeyboard(poem: PoemRef, botUsername: string | undefined): InlineKeyboard {
  const kb = new InlineKeyboard()
    .url("مطالعه در وبسایت گنجور", `https://ganjoor.net${poem.link}`)
    .row();
  if (botUsername) {
    kb.url(SHARE_BUTTON_LABEL, buildShareUrl(poem, botUsername))
      .row()
      .url("دریافت روزانه در ربات", `https://t.me/${botUsername}?start=daily`);
  }
  return kb;
}

async function postToChannel(
  bot: Bot,
  channelId: string,
  kind: DailyPoemKind,
  cache: DailyPoemCache,
  occasion: Occasion | null,
  botUsername: string | undefined
): Promise<string> {
  const poetId = kind === "digest" ? pickOne(ALL_POET_IDS) ?? HAFEZ : HAFEZ;
  const picked = await cache.get(kind, poetId);
  if (!picked) return `${channelId}: no-poem`;
  try {
    await bot.api.sendMessage(
      channelId,
      introHtml(kind, picked.poem.poetLabel, occasion),
      { parse_mode: "HTML" }
    );
    await sendPoemChunksToChat(
      bot,
      channelId,
      picked.chunks,
      channelKeyboard(picked.poem, botUsername)
    );
    return `${channelId}: sent`;
  } catch (e) {
    console.error("daily digest: channel post failed", channelId, kind, e);
    void alertAdmins(bot, "ارسال به کانال ناموفق", e, `${kind} → ${channelId}`);
    return `${channelId}: failed`;
  }
}

function channelIdsFromEnv(...names: string[]): string[] {
  const ids = names
    .map((n) => process.env[n]?.trim() ?? "")
    .filter((v) => v.length > 0);
  return [...new Set(ids)];
}

async function broadcast(
  bot: Bot,
  kind: DailyPoemKind,
  recipients: Recipient[],
  channelIds: string[],
  opts?: BroadcastOptions
): Promise<RunSummary> {
  const dateKey = opts?.cacheKey ?? tehranDateKey();
  const occasion = kind === "yalda" ? "yalda" : occasionToday();
  const cache = new DailyPoemCache(dateKey);
  const botUsername = await getBotUsername(bot);

  const summary: RunSummary = {
    kind,
    dateKey,
    recipients: recipients.length,
    ok: 0,
    failed: 0,
    deactivated: 0,
    channels: [],
  };
  const noPoemFor = new Set<string>();

  for (const r of recipients) {
    const poetId = poetForRecipient(kind, r);
    const picked = await cache.get(kind, poetId);
    if (!picked) {
      summary.failed += 1;
      noPoemFor.add(poetId);
      continue;
    }
    try {
      await sendToUser(bot, r, kind, picked, occasion, botUsername);
      summary.ok += 1;
    } catch (e) {
      summary.failed += 1;
      const reason = unreachableUserReason(e);
      if (reason) {
        await deactivateUser(r.telegramId, reason);
        summary.deactivated += 1;
        console.warn("daily digest: deactivated unreachable user", r.telegramId, reason);
      } else {
        console.error("daily digest: send failed", r.telegramId, e);
      }
    }
    await delay(55);
  }

  for (const channelId of channelIds) {
    summary.channels.push(
      await postToChannel(bot, channelId, kind, cache, occasion, botUsername)
    );
  }

  const line = formatRunSummary(summary);
  console.log(`daily digest: ${line}`);
  if (noPoemFor.size > 0) {
    console.error("daily digest: no poem available", kind, [...noPoemFor]);
    void alertAdmins(bot, "شعر روزانه: شعری از گنجور نیامد", [...noPoemFor].join(", "), line);
  }
  const transientFailures = summary.failed - summary.deactivated - [...noPoemFor].length;
  if (transientFailures > 0) {
    void alertAdmins(bot, "ارسال روزانه: خطاهای ارسال", `${transientFailures} failed send(s)`, line);
  }
  return summary;
}

function formatRunSummary(s: RunSummary): string {
  const channels = s.channels.length ? s.channels.join(", ") : "off";
  return `${s.kind} ${s.dateKey}: recipients=${s.recipients} ok=${s.ok} failed=${s.failed} deactivated=${s.deactivated} channels=[${channels}]`;
}

const REACHABLE = { active: { $ne: false } };

async function runDailyDigestBroadcast(
  bot: Bot,
  opts?: BroadcastOptions
): Promise<RunSummary> {
  const recipients = await BotUser.find({ dailyDigest: true, ...REACHABLE })
    .select("telegramId dailyPoets")
    .lean<Recipient[]>();
  return broadcast(
    bot,
    "digest",
    recipients,
    channelIdsFromEnv("DAILY_DIGEST_CHANNEL_ID"),
    opts
  );
}

async function runDailyFalBroadcast(
  bot: Bot,
  opts?: BroadcastOptions
): Promise<RunSummary> {
  const recipients = await BotUser.find({ dailyFal: true, ...REACHABLE })
    .select("telegramId")
    .lean<Recipient[]>();
  return broadcast(
    bot,
    "fal",
    recipients,
    channelIdsFromEnv("DAILY_FAL_CHANNEL_ID"),
    opts
  );
}

/** Everyone opted into anything gets the Yalda fal; both channels too. */
async function runYaldaBroadcast(
  bot: Bot,
  opts?: BroadcastOptions
): Promise<RunSummary> {
  const recipients = await BotUser.find({
    $or: [{ dailyDigest: true }, { dailyFal: true }],
    ...REACHABLE,
  })
    .select("telegramId")
    .lean<Recipient[]>();
  return broadcast(
    bot,
    "yalda",
    recipients,
    channelIdsFromEnv("DAILY_FAL_CHANNEL_ID", "DAILY_DIGEST_CHANNEL_ID"),
    opts
  );
}

async function runDailyBroadcasts(
  bot: Bot,
  which: BroadcastSelection,
  opts?: BroadcastOptions
): Promise<RunSummary[]> {
  switch (which) {
    case "digest":
      return [await runDailyDigestBroadcast(bot, opts)];
    case "fal":
      return [await runDailyFalBroadcast(bot, opts)];
    case "yalda":
      return [await runYaldaBroadcast(bot, opts)];
    case "morning":
      return [
        await runDailyDigestBroadcast(bot, opts),
        await runDailyFalBroadcast(bot, opts),
      ];
  }
}

/**
 * Send time in Asia/Tehran from `DAILY_DIGEST_HOUR_TEHRAN` / `DAILY_DIGEST_MINUTE_TEHRAN`
 * (defaults 08:00). `null` when the env values are out of range.
 */
function getDailyDigestSchedule(): { hour: number; minute: number } | null {
  const hour = parseInt(process.env.DAILY_DIGEST_HOUR_TEHRAN ?? "8", 10);
  const minute = parseInt(process.env.DAILY_DIGEST_MINUTE_TEHRAN ?? "0", 10);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
}

/**
 * Test mode: `DAILY_DIGEST_EVERY_MINUTES=N` (1–59) replaces the daily send with
 * a run every N minutes, each with its own cache key so every run picks fresh
 * poems. Never set this on production.
 */
function getDailyDigestIntervalMinutes(): number | null {
  const raw = process.env.DAILY_DIGEST_EVERY_MINUTES?.trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n >= 1 && n <= 59 ? n : null;
}

function perRunCacheKey(): string {
  return `${tehranDateKey()}T${new Date().toISOString().slice(11, 16)}`;
}

async function morningRun(bot: Bot, opts?: BroadcastOptions): Promise<void> {
  try {
    const summaries = await runDailyBroadcasts(bot, "morning", opts);
    await pingDailyDigest(true, summaries.map(formatRunSummary).join("\n"));
  } catch (e) {
    console.error("daily digest: morning run crashed", e);
    await pingDailyDigest(false, describeError(e));
    await alertAdmins(bot, "اجرای صبحگاهی شعر روزانه خراب شد", e);
  }
}

/**
 * Global scheduler switch: `DAILY_DIGEST_ENABLED=true` starts the crons. It
 * only decides whether the jobs run at all; who receives what is the per-user
 * `dailyDigest` / `dailyFal` opt-in. Call before long polling starts
 * (`bot.start()` does not return until the bot stops).
 */
function scheduleDailyDigest(bot: Bot): void {
  const enabled = process.env.DAILY_DIGEST_ENABLED === "true";
  if (!enabled) {
    console.log("daily digest: off (set DAILY_DIGEST_ENABLED=true to enable)");
    return;
  }

  const schedule = getDailyDigestSchedule();
  if (!schedule) {
    console.error(
      "daily digest: invalid DAILY_DIGEST_HOUR_TEHRAN / DAILY_DIGEST_MINUTE_TEHRAN"
    );
    return;
  }

  const every = getDailyDigestIntervalMinutes();
  const morningCron = every
    ? `*/${every} * * * *`
    : `${schedule.minute} ${schedule.hour} * * *`;
  cron.schedule(
    morningCron,
    () => {
      void morningRun(bot, every ? { cacheKey: perRunCacheKey() } : undefined);
    },
    { timezone: TEHRAN_TZ }
  );
  if (every) {
    console.warn(
      `daily digest: TEST MODE — poem+fal every ${every} min (DAILY_DIGEST_EVERY_MINUTES), fresh poems each run`
    );
  }

  cron.schedule(
    YALDA_CRON,
    () => {
      if (occasionToday() !== "yalda") return;
      runYaldaBroadcast(bot).catch(async (e) => {
        console.error("daily digest: yalda run crashed", e);
        await alertAdmins(bot, "اجرای فال یلدا خراب شد", e);
      });
    },
    { timezone: TEHRAN_TZ }
  );

  console.log(
    `daily digest: scheduled (${morningCron} poem+fal, ${YALDA_CRON} yalda-only, ${TEHRAN_TZ}) — opted-in users only`
  );
}

export {
  formatRunSummary,
  getDailyDigestIntervalMinutes,
  getDailyDigestSchedule,
  runDailyBroadcasts,
  runDailyDigestBroadcast,
  runDailyFalBroadcast,
  runYaldaBroadcast,
  scheduleDailyDigest,
};
