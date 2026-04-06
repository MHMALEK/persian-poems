import cron from "node-cron";
import { Bot } from "grammy";
import { BotUser } from "../services/users";
import type { PoemRef } from "../services/users/poems";
import { buildPoemActionKeyboard } from "../shared/poem-display";
import {
  pickRandomPoemFromPool,
  RANDOM_POEM_BACK_CALLBACK,
} from "../shared/random-poem";
import { sendPoemChunksToChat } from "../shared/send-poem-message";

const INTRO_HTML =
  "🌅 <b>شعر روزانه</b>\nیک شعر تصادفی از شاعران گنجور برای شما.\n\n<i>نمی‌خواهید دیگر دریافت کنید؟ دکمهٔ «توقف» زیر شعر، یا دستور /digest_off</i>";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    {
      poolActions: true,
      actorUserId: telegramId,
      digestOptOutButton: true,
    }
  );
  await bot.api.sendMessage(telegramId, INTRO_HTML, { parse_mode: "HTML" });
  await sendPoemChunksToChat(bot, telegramId, chunks, keyboard);
}

/**
 * Picks one random poem (from the full poet pool) and sends it to every user
 * who has not opted out (`preferences.dailyDigest !== false`).
 */
async function runDailyDigestBroadcast(bot: Bot): Promise<void> {
  const picked = await pickRandomPoemFromPool();
  if (!picked) {
    console.error("daily digest: pickRandomPoemFromPool returned null");
    return;
  }

  const { chunks, poem } = picked;
  const users = await BotUser.find({
    "preferences.dailyDigest": { $ne: false },
  })
    .select("telegramId")
    .lean();

  let ok = 0;
  let failed = 0;
  for (const u of users) {
    const tid = u.telegramId;
    try {
      await sendDigestToUser(bot, tid, chunks, poem);
      ok += 1;
    } catch (e) {
      failed += 1;
      console.error("daily digest: send failed", tid, e);
    }
    await delay(55);
  }
  console.log(
    `daily digest: finished recipients=${users.length} ok=${ok} failed=${failed}`
  );
}

/**
 * Cron in `Asia/Tehran`. Enable with `DAILY_DIGEST_ENABLED=true`.
 * Default: 08:00 Tehran. Override with `DAILY_DIGEST_HOUR_TEHRAN` / `DAILY_DIGEST_MINUTE_TEHRAN` (0–23 / 0–59).
 */
function scheduleDailyDigest(bot: Bot): void {
  const enabled = process.env.DAILY_DIGEST_ENABLED === "true";
  if (!enabled) {
    console.log("daily digest: off (set DAILY_DIGEST_ENABLED=true to enable)");
    return;
  }

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
    console.error(
      "daily digest: invalid DAILY_DIGEST_HOUR_TEHRAN / DAILY_DIGEST_MINUTE_TEHRAN"
    );
    return;
  }

  const cronExpr = `${minute} ${hour} * * *`;
  cron.schedule(
    cronExpr,
    () => {
      void runDailyDigestBroadcast(bot);
    },
    { timezone: "Asia/Tehran" }
  );

  console.log(
    `daily digest: scheduled (${cronExpr}, Asia/Tehran) — same random poem for all recipients`
  );
}

export { runDailyDigestBroadcast, scheduleDailyDigest };
