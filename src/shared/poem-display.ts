import { Context, InlineKeyboard } from "grammy";
import { createPoemToken } from "../services/poem-tokens";
import { isFavorite, type PoemRef, setLastReadPoem } from "../services/users/poems";

async function buildPoemActionKeyboard(
  ctx: Context,
  poem: PoemRef,
  backCallbackData: string
): Promise<InlineKeyboard> {
  const tid = ctx.from?.id;
  let favorited = false;
  if (tid) {
    favorited = await isFavorite(tid, poem.link);
    await setLastReadPoem(tid, poem);
  }

  const token = await createPoemToken({
    link: poem.link,
    title: poem.title,
    poetLabel: poem.poetLabel,
    favorited,
  });

  const starLabel = favorited
    ? "⭐ حذف از علاقه‌مندی‌ها"
    : "⭐ افزودن به علاقه‌مندی‌ها";

  return new InlineKeyboard()
    .url("مطالعه در وبسایت گنجور", `https://ganjoor.net${poem.link}`)
    .row()
    .text(starLabel, `pft:${token}`)
    .row()
    .text("بازگشت", backCallbackData);
}

export { buildPoemActionKeyboard };
