import { Context, InlineKeyboard } from "grammy";
import {
  extractPoemsText,
  fetchHtmlPageFromGanjoor,
  getPoems,
} from "../services/ganjoor-crawler";
import { saveAnalyticsEvent } from "../services/analytics";
import { pathAfterAuthor } from "./ganjoor-path";
import { POET_POOL } from "./poet-pool";
import { buildPoemActionKeyboard } from "./poem-display";
import { splitMessage } from "../utils/splitter";
import { sendOrEditPoemChunks } from "./send-poem-message";

const RANDOM_POEM_BACK_CALLBACK = "back_to_poet_menu_fa";

function tehranDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function seedFromDayAndUser(dayKey: string, userId: number): number {
  const s = `${dayKey}:${userId}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable poem index for a day; independent of retry/network so the same poem is chosen. */
function stableIndexFromSeed(seedStr: string, modulo: number): number {
  if (modulo <= 0) return 0;
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % modulo;
}

/**
 * One poem per calendar day (Asia/Tehran), stable for each Telegram user.
 */
async function selectAndRenderDailyPoem(ctx: Context): Promise<void> {
  const uid = ctx.from?.id;
  if (uid === undefined) return;

  saveAnalyticsEvent(ctx, "daily_poem");

  const dayKey = tehranDateKey();
  const rng = mulberry32(seedFromDayAndUser(dayKey, uid));
  const pick = (n: number) => Math.floor(rng() * n);

  const pi = pick(POET_POOL.length);
  const entry = POET_POOL[pi];
  if (!entry) return;
  const ip = pick(entry.indexPaths.length);
  const indexPath = entry.indexPaths[ip];
  if (!indexPath) return;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const htmlPage = await fetchHtmlPageFromGanjoor(entry.author, indexPath);
      const list = await getPoems(htmlPage);
      if (!list.length) break;

      const li = stableIndexFromSeed(
        `${dayKey}:${uid}:${entry.author}:${indexPath}`,
        list.length
      );
      const item = list[li];
      if (!item?.link) break;

      const rel = pathAfterAuthor(entry.author, item.link);
      const poemHtml = await fetchHtmlPageFromGanjoor(entry.author, rel);
      const poemText = await extractPoemsText(poemHtml);

      const fullText = `<b>${entry.labelFa}</b>\n<b>${item.text}</b>\n\n${poemText}`;
      const poem = {
        link: item.link,
        title: item.text,
        poetLabel: entry.labelFa,
      };
      const keyboard = await buildPoemActionKeyboard(
        ctx,
        poem,
        RANDOM_POEM_BACK_CALLBACK
      );
      const chunks = entry.useChunkSplit
        ? splitMessage(fullText, 150)
        : [fullText];
      await sendOrEditPoemChunks(ctx, chunks, keyboard);
      return;
    } catch (e) {
      console.error("daily poem attempt failed", e);
    }
  }

  const backKb = new InlineKeyboard().text(
    "بازگشت",
    RANDOM_POEM_BACK_CALLBACK
  );
  const err =
    "متأسفانه دریافت شعر روز با خطا مواجه شد. لطفاً بعداً دوباره تلاش کنید.";
  if (ctx.callbackQuery) {
    await ctx.editMessageText(err, { reply_markup: backKb });
  } else {
    await ctx.reply(err, { reply_markup: backKb });
  }
}

export { selectAndRenderDailyPoem, tehranDateKey };
