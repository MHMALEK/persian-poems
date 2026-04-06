import { selectAndRenderRandomGhazal } from "../poets/hafez/fa";
import { saveAnalyticsEvent } from "../services/analytics";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import { upsertUserOnStart } from "../services/users";
import {
  openFavoritesList,
  openLastReadPoem,
} from "../shared/poem-callbacks";
import { selectAndRenderDailyPoem } from "../shared/daily-poem";
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

  PersianPoemsTelegramBot.addCommandEventListener("daily", async (ctx) => {
    saveAnalyticsEvent(ctx, "daily_command");
    await selectAndRenderDailyPoem(ctx);
  });

  PersianPoemsTelegramBot.addCommandEventListener("favorites", async (ctx) => {
    saveAnalyticsEvent(ctx, "favorites_command");
    await openFavoritesList(ctx);
  });

  PersianPoemsTelegramBot.addCommandEventListener("last", async (ctx) => {
    saveAnalyticsEvent(ctx, "last_command");
    await openLastReadPoem(ctx);
  });
};

export { addDefaultCommands };
