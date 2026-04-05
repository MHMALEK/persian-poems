import { Context, InlineKeyboard } from "grammy";
import {
  extractPoemsText,
  fetchHtmlPageFromGanjoor,
  getPoems,
} from "../services/ganjoor-crawler";
import { splitMessage } from "../utils/splitter";

const MOULAVI_INDEX_PATHS = [
  "shams/ghazalsh",
  "shams/mostadrakat",
  "shams/tarjeeat",
  "shams/robaeesh",
  "masnavi/daftar1",
  "masnavi/daftar2",
  "masnavi/daftar3",
  "masnavi/daftar4",
  "masnavi/daftar5",
  "masnavi/daftar6",
] as const;

function pathAfterAuthor(author: string, link: string): string {
  const needle = `/${author}/`;
  const i = link.indexOf(needle);
  if (i === -1) {
    throw new Error(`Unexpected poem link for ${author}: ${link}`);
  }
  return link.slice(i + needle.length);
}

async function fetchRandomFromList(
  author: string,
  indexPath: string
): Promise<{ title: string; link: string } | null> {
  const htmlPage = await fetchHtmlPageFromGanjoor(author, indexPath);
  const list = await getPoems(htmlPage);
  if (!list.length) return null;
  const item = list[Math.floor(Math.random() * list.length)];
  return { title: item.text, link: item.link };
}

/** Same callback as «بازگشت» from a poet screen — shows the root poet list (+ random poem). */
const RANDOM_POEM_BACK_CALLBACK = "back_to_poet_menu_fa";

function buildPoemKeyboard(link: string) {
  return new InlineKeyboard()
    .url("مطالعه در وبسایت گنجور", `https://ganjoor.net${link}`)
    .row()
    .text("بازگشت", RANDOM_POEM_BACK_CALLBACK);
}

function backOnlyKeyboard() {
  return new InlineKeyboard().text("بازگشت", RANDOM_POEM_BACK_CALLBACK);
}

/** Replace the menu message with the poem; extra chunks become new messages (long مولانا). */
async function showPoemEditingMenuMessage(
  ctx: Context,
  chunks: string[],
  keyboard: InlineKeyboard
): Promise<void> {
  if (chunks.length === 0) return;
  const opts = { parse_mode: "HTML" as const };
  if (chunks.length === 1) {
    await ctx.editMessageText(chunks[0], {
      ...opts,
      reply_markup: keyboard,
    });
    return;
  }
  await ctx.editMessageText(chunks[0], opts);
  for (let i = 1; i < chunks.length - 1; i++) {
    await ctx.reply(chunks[i], opts);
  }
  await ctx.reply(chunks[chunks.length - 1], {
    ...opts,
    reply_markup: keyboard,
  });
}

/**
 * Picks one of حافظ / خیام / مولانا at random, then a random piece from their corpus on گنجور.
 */
async function selectAndRenderRandomPoem(ctx: Context): Promise<void> {
  const poetRoll = Math.floor(Math.random() * 3);
  let author: string;
  let labelFa: string;
  let indexPath: string;
  let useChunkSplit: boolean;

  if (poetRoll === 0) {
    author = "hafez";
    labelFa = "حافظ";
    indexPath = "ghazal";
    useChunkSplit = false;
  } else if (poetRoll === 1) {
    author = "khayyam";
    labelFa = "خیام";
    indexPath = "robaee";
    useChunkSplit = false;
  } else {
    author = "moulavi";
    labelFa = "مولانا";
    const mi = Math.floor(Math.random() * MOULAVI_INDEX_PATHS.length);
    indexPath = MOULAVI_INDEX_PATHS[mi] ?? "shams/ghazalsh";
    useChunkSplit = true;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const picked = await fetchRandomFromList(author, indexPath);
      if (!picked) continue;
      const rel = pathAfterAuthor(author, picked.link);
      const poemHtml = await fetchHtmlPageFromGanjoor(author, rel);
      const poemText = await extractPoemsText(poemHtml);
      const fullText = `<b>${labelFa}</b>\n<b>${picked.title}</b>\n\n${poemText}`;
      const keyboard = buildPoemKeyboard(picked.link);
      const chunks = useChunkSplit
        ? splitMessage(fullText, 150)
        : [fullText];
      await showPoemEditingMenuMessage(ctx, chunks, keyboard);
      return;
    } catch (e) {
      console.error("random poem attempt failed", e);
    }
  }

  await ctx.editMessageText(
    "متأسفانه دریافت شعر تصادفی با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    { reply_markup: backOnlyKeyboard() }
  );
}

export { selectAndRenderRandomPoem };
