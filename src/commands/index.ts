import { selectAndRenderRandomGhazal } from "../poets/hafez/fa";
import { saveAnalyticsEvent } from "../services/analytics";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import { upsertUserOnStart } from "../services/users";
import {
  formatRunSummary,
  runDailyBroadcasts,
  type BroadcastSelection,
} from "../jobs/daily-digest";
import { isAdmin } from "../shared/admin";
import { showMainMenu } from "../shared/commands";
import { showDailyDigestSettings } from "../shared/daily-digest-settings";
import { selectAndRenderRandomPoem } from "../shared/random-poem";

const BROADCAST_SELECTIONS: BroadcastSelection[] = ["morning", "digest", "fal", "yalda"];

const addDefaultCommands = () => {
  PersianPoemsTelegramBot.addCommandEventListener("start", async (ctx) => {
    await upsertUserOnStart(ctx);
    saveAnalyticsEvent(ctx, "start");
    await showMainMenu(ctx);
  });

  PersianPoemsTelegramBot.addCommandEventListener("poem", async (ctx) => {
    saveAnalyticsEvent(ctx, "poem_command");
    await selectAndRenderRandomGhazal(ctx);
  });

  PersianPoemsTelegramBot.addCommandEventListener("fal", async (ctx) => {
    saveAnalyticsEvent(ctx, "fal");
    await selectAndRenderRandomGhazal(ctx);
  });

  /** Multi-poet pool (same as the «یک شعر تصادفی» button). Telegram command names use underscores, not hyphens. */
  PersianPoemsTelegramBot.addCommandEventListener("random_poem", async (ctx) => {
    saveAnalyticsEvent(ctx, "random_poem_command");
    await selectAndRenderRandomPoem(ctx);
  });

  /** Per-user daily poem / fal on-off (same screen as the main-menu button). */
  PersianPoemsTelegramBot.addCommandEventListener("daily_poem", async (ctx) => {
    saveAnalyticsEvent(ctx, "daily_poem_command");
    await showDailyDigestSettings(ctx);
  });

  PersianPoemsTelegramBot.addCommandEventListener("daily_fal", async (ctx) => {
    saveAnalyticsEvent(ctx, "daily_fal_command");
    await showDailyDigestSettings(ctx);
  });

  /** Operator only (ADMIN_TELEGRAM_IDS): `/digest_now [morning|digest|fal|yalda]` runs a broadcast right away. */
  PersianPoemsTelegramBot.addCommandEventListener("digest_now", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const arg = (typeof ctx.match === "string" ? ctx.match : "").trim();
    const which = (BROADCAST_SELECTIONS as string[]).includes(arg)
      ? (arg as BroadcastSelection)
      : "morning";
    saveAnalyticsEvent(ctx, "digest_now_command", { which });
    await ctx.reply(`در حال اجرای ارسال (${which})…`);
    const summaries = await runDailyBroadcasts(PersianPoemsTelegramBot.bot, which);
    await ctx.reply(summaries.map(formatRunSummary).join("\n"));
  });
};

export { addDefaultCommands };
