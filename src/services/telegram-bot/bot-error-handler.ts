import { Bot, BotError, Context } from "grammy";
import { buildMainKeyboard } from "../../shared/main-menu-keyboard";

const USER_FACING =
  "متأسفانه این درخواست با خطا مواجه شد. لطفاً دوباره تلاش کنید یا از منوی اصلی ادامه دهید.";

/**
 * Installs grammY `bot.catch` so a single handler failure does not stop long polling
 * (default handler calls `bot.stop()`). The same handler runs for webhook errors via
 * `bot.errorHandler` in `webhook-server.ts`.
 */
function installBotErrorHandler(bot: Bot<Context>): void {
  bot.catch(async (err: BotError<Context>) => {
    const cause = err.error;
    console.error(
      "Error in middleware while handling update",
      err.ctx?.update?.update_id,
      cause
    );

    const ctx = err.ctx;
    try {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery().catch(() => {});
      }
      if (ctx.chat) {
        await ctx.reply(USER_FACING, {
          reply_markup: buildMainKeyboard(),
        });
      }
    } catch (notifyErr) {
      console.error("Failed to notify user after handler error:", notifyErr);
    }
  });
}

export { installBotErrorHandler };
