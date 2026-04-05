import { selectAndRenderRandomGhazal } from "../poets/hafez/fa";
import { saveAnalyticsEvent } from "../services/analytics";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import { showMainMenu } from "../shared/commands";

const addDefaultCommands = () => {
  PersianPoemsTelegramBot.addCommandEventListener("start", (ctx) => {
    saveAnalyticsEvent(ctx, "start");
    showMainMenu(ctx);
  });

  PersianPoemsTelegramBot.addCommandEventListener("poem", (ctx) => {
    saveAnalyticsEvent(ctx, "poem_command");
    selectAndRenderRandomGhazal(ctx);
  });

  PersianPoemsTelegramBot.addCommandEventListener("fal", (ctx) => {
    saveAnalyticsEvent(ctx, "fal");
    selectAndRenderRandomGhazal(ctx);
  });
};

export { addDefaultCommands };
