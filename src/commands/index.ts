import { selectAndRenderRandomGhazal } from "../poets/hafez/fa";
import { saveAnalyticsEvent } from "../services/analytics";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import { setDailyDigestPreference, upsertUserOnStart } from "../services/users";
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
    saveAnalyticsEvent(ctx, "digest_off");
    const { matched } = await setDailyDigestPreference(from.id, false);
    if (!matched) {
      await ctx.reply("ابتدا /start را بزنید تا در ربات ثبت شوید.");
      return;
    }
    await ctx.reply(
      "ارسال خودکار شعر روزانه خاموش شد. با /digest_on دوباره فعال کنید."
    );
  });

  PersianPoemsTelegramBot.addCommandEventListener("digest_on", async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    saveAnalyticsEvent(ctx, "digest_on");
    const { matched } = await setDailyDigestPreference(from.id, true);
    if (!matched) {
      await ctx.reply("ابتدا /start را بزنید تا در ربات ثبت شوید.");
      return;
    }
    await ctx.reply("ارسال خودکار شعر روزانه برای شما فعال شد.");
  });
};

export { addDefaultCommands };
