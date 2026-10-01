import cron from "node-cron";
import { Bot, GrammyError } from "grammy";
import { BotUser, deactivateUser } from "../services/users";
import type { PoemRef } from "../services/users/poems";
import { buildPoemActionKeyboard } from "../shared/poem-display";
import {
  pickRandomPoemFromPool,
  RANDOM_POEM_BACK_CALLBACK,
} from "../shared/random-poem";
import { sendPoemChunksToChat } from "../shared/send-poem-message";

const INTRO_HTML =
  "🌅 <b>شعر روزانه</b>\nیک شعر تصادفی از شاعران گنجور برای شما.";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function sendDigestToUser(
  bot: Bot,
  telegramId: number,
  chunks: string[],
  poem: PoemRef
): Promise<void> {
  const keyboard = await buildPoemActionKeyboard(
    undefined,
    poem,
    RANDOM_POEM_BACK_CALLBACK,
    { actorUserId: telegramId, dailyDigestActions: true }
  );
  await bot.api.sendMessage(telegramId, INTRO_HTML, { parse_mode: "HTML" });
  await sendPoemChunksToChat(bot, telegramId, chunks, keyboard);
}

/**
 * Picks one random poem (from the full poet pool) and sends it to every user
 * who has opted in (`dailyDigest: true`) and is still reachable (`active` not
 * false). Users who have blocked the bot are deactivated so future runs skip them.
 */
async function runDailyDigestBroadcast(bot: Bot): Promise<void> {
  const picked = await pickRandomPoemFromPool();
  if (!picked) {
    console.error("daily digest: pickRandomPoemFromPool returned null");
    return;
  }

  const { chunks, poem } = picked;
  const users = await BotUser.find({ dailyDigest: true, active: { $ne: false } })
    .select("telegramId")
    .lean<{ telegramId: number }[]>();

  let ok = 0;
  let failed = 0;
  let deactivated = 0;
  for (const u of users) {
    const tid = u.telegramId;
    try {
      await sendDigestToUser(bot, tid, chunks, poem);
      ok += 1;
    } catch (e) {
      failed += 1;
      const reason = unreachableUserReason(e);
      if (reason) {
        await deactivateUser(tid, reason);
        deactivated += 1;
        console.warn("daily digest: deactivated unreachable user", tid, reason);
      } else {
        console.error("daily digest: send failed", tid, e);
      }
    }
    await delay(55);
  }
  console.log(
    `daily digest: finished recipients=${users.length} ok=${ok} failed=${failed} deactivated=${deactivated}`
  );
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
 * Global scheduler switch: `DAILY_DIGEST_ENABLED=true` starts the cron. It
 * only decides whether the job runs at all; who receives the poem is the
 * per-user `dailyDigest` opt-in (see runDailyDigestBroadcast).
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

  const cronExpr = `${schedule.minute} ${schedule.hour} * * *`;
  cron.schedule(
    cronExpr,
    () => {
      void runDailyDigestBroadcast(bot);
    },
    { timezone: "Asia/Tehran" }
  );

  console.log(
    `daily digest: scheduled (${cronExpr}, Asia/Tehran) — opted-in users only, same random poem for all`
  );
}

export { getDailyDigestSchedule, runDailyDigestBroadcast, scheduleDailyDigest };
