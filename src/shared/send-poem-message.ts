import { Bot, Context, InlineKeyboard } from "grammy";
import { normalizeTelegramChunks } from "../utils/splitter";

/**
 * Sends poem text as **new chat messages** (always `reply`), including when the user
 * tapped an inline button — so each chunk can be forwarded or saved separately.
 */
async function replyPoemChunks(
  ctx: Context,
  chunks: string[],
  keyboard: InlineKeyboard
): Promise<void> {
  chunks = normalizeTelegramChunks(chunks);
  const opts = { parse_mode: "HTML" as const };
  if (chunks.length === 0) return;
  if (chunks.length === 1) {
    await ctx.reply(chunks[0], {
      ...opts,
      reply_markup: keyboard,
    });
    return;
  }
  await ctx.reply(chunks[0], opts);
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
