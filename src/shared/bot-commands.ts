import type { Bot } from "grammy";
import type { BotCommand } from "grammy/types";
import { adminTelegramIds } from "./admin";

/** Public command menu (replaces whatever BotFather holds; re-applied on every start). */
const PUBLIC_COMMANDS: BotCommand[] = [
  { command: "start", description: "منوی اصلی" },
  { command: "fal", description: "فال حافظ" },
  { command: "random_poem", description: "یک شعر تصادفی از چند شاعر" },
  { command: "poem", description: "یک غزل تصادفی از حافظ" },
  { command: "daily_poem", description: "شعر روزانه: روشن/خاموش و انتخاب شاعر" },
  { command: "daily_fal", description: "فال روزانهٔ حافظ: روشن/خاموش" },
];

const ADMIN_ONLY_COMMANDS: BotCommand[] = [
  { command: "digest_now", description: "اجرای فوری ارسال روزانه (ادمین)" },
  { command: "stats", description: "آمار کاربران و opt-in (ادمین)" },
];

/** Best-effort: a failure here must not stop the bot. */
async function registerBotCommands(bot: Bot): Promise<void> {
  try {
    await bot.api.setMyCommands(PUBLIC_COMMANDS);
    for (const chatId of adminTelegramIds()) {
      await bot.api.setMyCommands([...PUBLIC_COMMANDS, ...ADMIN_ONLY_COMMANDS], {
        scope: { type: "chat", chat_id: chatId },
      });
    }
    console.log(
      `bot commands registered: ${PUBLIC_COMMANDS.length} public, admin scope for ${adminTelegramIds().size} chat(s)`
    );
  } catch (e) {
    console.error("bot commands: setMyCommands failed", e);
  }
}

export { registerBotCommands };
