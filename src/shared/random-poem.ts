import { Context, InlineKeyboard } from "grammy";
import type { PoemRef } from "../services/users/poems";
import { POET_POOL } from "./poet-pool";
import { fetchPoemFromIndexWithPicker } from "./poet-fetch";
import { buildPoemActionKeyboard } from "./poem-display";
import { normalizeTelegramChunks, splitMessage } from "../utils/splitter";
import { sendOrEditPoemChunks } from "./send-poem-message";

const RANDOM_POEM_BACK_CALLBACK = "back_to_poet_menu_fa";

/**
 * One random poem from {@link POET_POOL} (all poets). Chunks are Telegram-safe.
 */
async function pickRandomPoemFromPool(): Promise<{
  chunks: string[];
  poem: PoemRef;
} | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const entry = POET_POOL[Math.floor(Math.random() * POET_POOL.length)];
      if (!entry) continue;
      const indexPath =
        entry.indexPaths[Math.floor(Math.random() * entry.indexPaths.length)];
      if (!indexPath) continue;

      const picked = await fetchPoemFromIndexWithPicker(
        entry.author,
        indexPath,
        (len) => Math.floor(Math.random() * len)
      );
      if (!picked) continue;

      const fullText = `<b>${entry.labelFa}</b>\n<b>${picked.title}</b>\n\n${picked.poemText}`;
      const rawChunks = entry.useChunkSplit
        ? splitMessage(fullText, 150)
        : [fullText];
      const chunks = normalizeTelegramChunks(rawChunks);
      const poem: PoemRef = {
        link: picked.link,
        title: picked.title,
        poetLabel: entry.labelFa,
      };
      return { chunks, poem };
    } catch (e) {
      console.error("random poem attempt failed", e);
    }
  }
  return null;
}

/**
 * Builds random poem content for sending as **new** messages (e.g. «یک شعر دیگر»).
 */
async function renderRandomPoemReply(
  ctx: Context
): Promise<{ chunks: string[]; keyboard: InlineKeyboard } | null> {
  const picked = await pickRandomPoemFromPool();
  if (!picked) return null;

  const keyboard = await buildPoemActionKeyboard(
    ctx,
    picked.poem,
    RANDOM_POEM_BACK_CALLBACK,
    { poolActions: true }
  );
  return { chunks: picked.chunks, keyboard };
}

async function selectAndRenderRandomPoem(ctx: Context): Promise<void> {
  const out = await renderRandomPoemReply(ctx);
  if (out) {
    await sendOrEditPoemChunks(ctx, out.chunks, out.keyboard);
    return;
  }

  const backOnlyKeyboard = new InlineKeyboard().text(
    "بازگشت",
    RANDOM_POEM_BACK_CALLBACK
  );
  const err =
    "متأسفانه دریافت شعر تصادفی با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
  if (ctx.callbackQuery) {
    await ctx.editMessageText(err, { reply_markup: backOnlyKeyboard });
  } else {
    await ctx.reply(err, { reply_markup: backOnlyKeyboard });
  }
}

export {
  pickRandomPoemFromPool,
  renderRandomPoemReply,
  selectAndRenderRandomPoem,
  RANDOM_POEM_BACK_CALLBACK,
};
