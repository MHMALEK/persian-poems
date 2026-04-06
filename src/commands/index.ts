import { selectAndRenderRandomGhazal } from "../poets/hafez/fa";
import { saveAnalyticsEvent } from "../services/analytics";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import {
  BotUser,
  setDailyDigestPreference,
  upsertUserOnStart,
} from "../services/users";
import { readDigestEnabled } from "../shared/digest-preference";
import {
  openFavoritesList,
  openLastReadPoem,
} from "../shared/poem-callbacks";
import { showMainMenu } from "../shared/commands";

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

  PersianPoemsTelegramBot.addCommandEventListener("favorites", async (ctx) => {
    saveAnalyticsEvent(ctx, "favorites_command");
    await openFavoritesList(ctx);
  });

  PersianPoemsTelegramBot.addCommandEventListener("last", async (ctx) => {
    saveAnalyticsEvent(ctx, "last_command");
    await openLastReadPoem(ctx);
  });

  PersianPoemsTelegramBot.addCommandEventListener("digest_off", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const u = await BotUser.findOne({ telegramId: from.id }).lean();
    if (!u) {
      await ctx.reply("ابتدا /start را بزنید تا در ربات ثبت شوید.");
      return;
    }
    if (!readDigestEnabled(u.preferences)) {
      await ctx.reply(
        "الان هم ارسال خودکار شعر روزانه برای شما خاموش است."
      );
      return;
    }
    await setDailyDigestPreference(from.id, false);
    saveAnalyticsEvent(ctx, "digest_off");
    await ctx.reply(
      "✅ ارسال خودکار شعر روزانه متوقف شد. با دکمهٔ «روشن» در منو یا /digest_on می‌توانید دوباره فعال کنید."
    );
  });

  PersianPoemsTelegramBot.addCommandEventListener("digest_on", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const u = await BotUser.findOne({ telegramId: from.id }).lean();
    if (!u) {
      await ctx.reply("ابتدا /start را بزنید تا در ربات ثبت شوید.");
      return;
    }
    if (readDigestEnabled(u.preferences)) {
      await ctx.reply(
        "الان هم ارسال خودکار شعر روزانه برای شما روشن است."
      );
      return;
    }
    await setDailyDigestPreference(from.id, true);
    saveAnalyticsEvent(ctx, "digest_on");
    await ctx.reply(
      "✅ از این پس در صورت فعال بودن سرور، شعر روزانه برای شما فرستاده می‌شود."
    );
  });
};

export { addDefaultCommands };
