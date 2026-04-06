import { Context, InlineKeyboard } from "grammy";
import { POET_POOL } from "./poet-pool";
import { fetchPoemFromIndexWithPicker } from "./poet-fetch";
import { buildPoemActionKeyboard } from "./poem-display";
import { splitMessage } from "../utils/splitter";
import { sendOrEditPoemChunks } from "./send-poem-message";

const RANDOM_POEM_BACK_CALLBACK = "back_to_poet_menu_fa";

async function selectAndRenderRandomPoem(ctx: Context): Promise<void> {
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
      const keyboard = await buildPoemActionKeyboard(
        ctx,
        {
          link: picked.link,
          title: picked.title,
          poetLabel: entry.labelFa,
        },
        RANDOM_POEM_BACK_CALLBACK
      );
      const chunks = entry.useChunkSplit
        ? splitMessage(fullText, 150)
        : [fullText];
      await sendOrEditPoemChunks(ctx, chunks, keyboard);
      return;
    } catch (e) {
      console.error("random poem attempt failed", e);
    }
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

export { selectAndRenderRandomPoem };
