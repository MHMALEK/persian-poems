import { selectAndRenderRandomGhazal } from "../poets/hafez/fa";
import { saveAnalyticsEvent } from "../services/analytics";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import { upsertUserOnStart } from "../services/users";
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

};

export { addDefaultCommands };
