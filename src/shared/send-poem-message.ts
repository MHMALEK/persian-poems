import { Bot, Context, InlineKeyboard } from "grammy";
import { normalizeTelegramChunks } from "../utils/splitter";

/**
 * Delivers poem HTML to the chat. From an inline callback, **edits** the triggering
 * message for the first chunk when it fits in one Telegram message; only sends **new**
 * messages when splitting is required (additional chunks). Without a callback (rare),
 * uses `reply` for the first chunk too.
 */
async function replyPoemChunks(
  ctx: Context,
  chunks: string[],
  keyboard: InlineKeyboard
): Promise<void> {
  chunks = normalizeTelegramChunks(chunks);
  const opts = { parse_mode: "HTML" as const };
  if (chunks.length === 0) return;

  const useEditFirst =
    ctx.callbackQuery !== undefined && ctx.callbackQuery.message !== undefined;

  if (chunks.length === 1) {
    if (useEditFirst) {
      await ctx.editMessageText(chunks[0], {
        ...opts,
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(chunks[0], {
        ...opts,
        reply_markup: keyboard,
      });
    }
    return;
  }

  if (useEditFirst) {
    await ctx.editMessageText(chunks[0], { ...opts });
  } else {
    await ctx.reply(chunks[0], { ...opts });
  }
  for (let i = 1; i < chunks.length - 1; i++) {
    await ctx.reply(chunks[i], opts);
  }
  await ctx.reply(chunks[chunks.length - 1], {
    ...opts,
    reply_markup: keyboard,
  });
}

/** Send poem chunks to a chat by id (e.g. scheduled broadcast). Keyboard only on the last chunk. */
async function sendPoemChunksToChat(
  bot: Bot,
  chatId: number,
  chunks: string[],
  keyboard: InlineKeyboard
): Promise<void> {
  chunks = normalizeTelegramChunks(chunks);
  const opts = { parse_mode: "HTML" as const };
  if (chunks.length === 0) return;
  if (chunks.length === 1) {
    await bot.api.sendMessage(chatId, chunks[0], {
      ...opts,
      reply_markup: keyboard,
    });
    return;
  }
  await bot.api.sendMessage(chatId, chunks[0], opts);
  for (let i = 1; i < chunks.length - 1; i++) {
    await bot.api.sendMessage(chatId, chunks[i], opts);
  }
  await bot.api.sendMessage(chatId, chunks[chunks.length - 1], {
    ...opts,
    reply_markup: keyboard,
  });
}

export { replyPoemChunks, sendPoemChunksToChat };
