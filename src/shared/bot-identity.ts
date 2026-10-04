import type { Bot } from "grammy";

/** Bot username for share links; `bot.init()` is idempotent, so this is safe before any update arrived. */
async function getBotUsername(bot: Bot): Promise<string | undefined> {
  try {
    await bot.init();
    return bot.botInfo.username;
  } catch (e) {
    console.warn("bot identity: getMe failed", e);
    return undefined;
  }
}

export { getBotUsername };
