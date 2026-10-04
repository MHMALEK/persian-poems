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
import { buildStatsReport } from "../shared/stats";

const BROADCAST_SELECTIONS: BroadcastSelection[] = ["morning", "digest", "fal", "yalda"];

/** Deep link `t.me/<bot>?start=daily` lands on the daily settings instead of the main menu. */
const START_DAILY_PARAM = "daily";

function commandArg(match: unknown): string {
  return typeof match === "string" ? match.trim() : "";
}

const addDefaultCommands = () => {
  PersianPoemsTelegramBot.addCommandEventListener("start", async (ctx) => {
    await upsertUserOnStart(ctx);
    if (commandArg(ctx.match) === START_DAILY_PARAM) {
      saveAnalyticsEvent(ctx, "start_daily_deeplink");
      await showDailyDigestSettings(ctx);
      return;
    }
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
    const arg = commandArg(ctx.match);
    const which = (BROADCAST_SELECTIONS as string[]).includes(arg)
      ? (arg as BroadcastSelection)
      : "morning";
    saveAnalyticsEvent(ctx, "digest_now_command", { which });
    await ctx.reply(`در حال اجرای ارسال (${which})…`);
    const summaries = await runDailyBroadcasts(PersianPoemsTelegramBot.bot, which);
    await ctx.reply(summaries.map(formatRunSummary).join("\n"));
  });

  /** Operator only: opt-in counts and the last week of events. */
  PersianPoemsTelegramBot.addCommandEventListener("stats", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    saveAnalyticsEvent(ctx, "stats_command");
    await ctx.reply(await buildStatsReport());
  });
};

export { addDefaultCommands };
