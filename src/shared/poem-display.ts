import { Context, InlineKeyboard } from "grammy";
import { createPoemNavToken } from "../services/poem-nav-tokens";
import { createPoemToken } from "../services/poem-tokens";
import { isFavorite, type PoemRef, setLastReadPoem } from "../services/users/poems";
import {
  appendMainMenuKeyboard,
  MAIN_MENU_BACK_CALLBACK,
} from "./main-menu-keyboard";

export type PoemListNav = {
  author: string;
  indexPath: string;
  listIndex: number;
  listLength: number;
  backCallback: string;
  poetLabel: string;
};

export type BuildPoemKeyboardOptions = {
  /** ◀ / ▶ within the same Ganjoor list (requires listLength > 1). */
  listNav?: PoemListNav | null;
  /** Extra row: another random poem (pool flows); back label becomes «منوی اصلی». */
  poolActions?: boolean;
  /** When sending outside a normal update (e.g. scheduled job), set the recipient’s Telegram user id. */
  actorUserId?: number;
  /** Scheduled daily digest: show one-tap opt-out before the back row. */
  digestOptOutButton?: boolean;
  /**
   * Append full main-menu navigation under poem actions (default: true).
   * Set false only if the keyboard must stay short.
   */
  mainMenuNav?: boolean;
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

  const mainMenuNav = options?.mainMenuNav !== false;
  const skipPoolMainBack =
    mainMenuNav &&
    options?.poolActions &&
    backCallbackData === MAIN_MENU_BACK_CALLBACK;

  if (!skipPoolMainBack) {
    kb.row().text(
      options?.poolActions ? "منوی اصلی" : "بازگشت",
      backCallbackData
    );
  }

  if (mainMenuNav) {
    appendMainMenuKeyboard(kb);
  }

  return kb;
}

export { buildPoemActionKeyboard };
