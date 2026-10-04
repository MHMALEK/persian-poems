import { Context, InlineKeyboard } from "grammy";
import { createPoemNavToken } from "../services/poem-nav-tokens";
import { type PoemRef } from "../services/users/poems";
import {
  DAILY_DIGEST_OFF_BUTTON_LABEL,
  DAILY_DIGEST_OFF_INLINE_CALLBACK,
  DAILY_FAL_OFF_BUTTON_LABEL,
  DAILY_FAL_OFF_INLINE_CALLBACK,
} from "./daily-digest-callbacks";

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
  /** زیر شعر روزانه: یک ردیف «خاموش کردن شعر روزانه». */
  dailyDigestActions?: boolean;
  /** زیر فال روزانه: یک ردیف «خاموش کردن فال روزانه». */
  dailyFalActions?: boolean;
  /** برای ارسال زمان‌بندی‌شده بدون ctx معمولی. */
  actorUserId?: number;
  /** For the share button when there is no ctx (scheduled sends); from ctx.me otherwise. */
  botUsername?: string;
};

const SHARE_BUTTON_LABEL = "ارسال برای دوستان";

/** Telegram's native share sheet: the Ganjoor link plus a short caption that carries the bot handle. */
function buildShareUrl(poem: PoemRef, botUsername: string): string {
  const ganjoorUrl = `https://ganjoor.net${poem.link}`;
  const excerpt = poem.excerpt ? `\n${poem.excerpt}` : "";
  const text = `${poem.poetLabel} — ${poem.title}${excerpt}\n\n@${botUsername}`;
  return `https://t.me/share/url?url=${encodeURIComponent(ganjoorUrl)}&text=${encodeURIComponent(text)}`;
}

async function buildPoemActionKeyboard(
  ctx: Context | undefined,
  poem: PoemRef,
  backCallbackData: string,
  options?: BuildPoemKeyboardOptions
): Promise<InlineKeyboard> {
  const kb = new InlineKeyboard()
    .url("مطالعه در وبسایت گنجور", `https://ganjoor.net${poem.link}`)
    .row();

  const botUsername = options?.botUsername ?? ctx?.me?.username;
  if (botUsername) {
    kb.url(SHARE_BUTTON_LABEL, buildShareUrl(poem, botUsername)).row();
  }

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

  if (options?.dailyDigestActions) {
    kb.text(DAILY_DIGEST_OFF_BUTTON_LABEL, DAILY_DIGEST_OFF_INLINE_CALLBACK).row();
  }

  if (options?.dailyFalActions) {
    kb.text(DAILY_FAL_OFF_BUTTON_LABEL, DAILY_FAL_OFF_INLINE_CALLBACK).row();
  }

  kb.text("بازگشت", backCallbackData);

  return kb;
}

export { buildPoemActionKeyboard, buildShareUrl, SHARE_BUTTON_LABEL };
