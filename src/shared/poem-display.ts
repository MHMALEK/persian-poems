import { Context, InlineKeyboard } from "grammy";
import { createPoemNavToken } from "../services/poem-nav-tokens";
import { createPoemToken } from "../services/poem-tokens";
import { isFavorite, type PoemRef, setLastReadPoem } from "../services/users/poems";

export type PoemListNav = {
  author: string;
  indexPath: string;
  listIndex: number;
  listLength: number;
  backCallback: string;
  poetLabel: string;
};

export type BuildPoemKeyboardOptions = {
  /** ◀ / ▶ در همان فهرست گنجور (فقط وقتی بیش از یک شعر در فهرست است). */
  listNav?: PoemListNav | null;
  /** جریان شعر تصادفی از استخر: یک ردیف «یک شعر تصادفی دیگر». */
  poolActions?: boolean;
  /** برای ارسال زمان‌بندی‌شده بدون ctx معمولی. */
  actorUserId?: number;
  /** فقط روی پیام شعر روزانهٔ خودکار: دکمهٔ توقف ارسال. */
  digestOptOutButton?: boolean;
};

async function buildPoemActionKeyboard(
  ctx: Context | undefined,
  poem: PoemRef,
  backCallbackData: string,
  options?: BuildPoemKeyboardOptions
): Promise<InlineKeyboard> {
  const tid = options?.actorUserId ?? ctx?.from?.id;
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

  const kb = new InlineKeyboard()
    .url("مطالعه در وبسایت گنجور", `https://ganjoor.net${poem.link}`)
    .row()
    .text(starLabel, `pft:${token}`)
    .row();

  const nav = options?.listNav;
  if (nav && nav.listLength > 1) {
    const navId = await createPoemNavToken({
      author: nav.author,
      indexPath: nav.indexPath,
      listIndex: nav.listIndex,
      backCallback: nav.backCallback,
      poetLabel: nav.poetLabel,
    });
    const hasPrev = nav.listIndex > 0;
    const hasNext = nav.listIndex < nav.listLength - 1;
    if (hasPrev && hasNext) {
      kb.text("◀ قبلی", `pnv:${navId}:p`).text("بعدی ▶", `pnv:${navId}:n`);
    } else if (hasPrev) {
      kb.text("◀ قبلی", `pnv:${navId}:p`);
    } else if (hasNext) {
      kb.text("بعدی ▶", `pnv:${navId}:n`);
    }
    kb.row();
  }

  if (options?.poolActions) {
    kb.text("یک شعر تصادفی دیگر", "random_poem_more_fa").row();
  }

  if (options?.digestOptOutButton) {
    kb.text("🔕 توقف شعر روزانه", "digest_disable_fa").row();
  }

  kb.text("بازگشت", backCallbackData);

  return kb;
}

export { buildPoemActionKeyboard };
