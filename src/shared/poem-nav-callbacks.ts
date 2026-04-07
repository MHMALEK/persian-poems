import { Context } from "grammy";
import { saveAnalyticsEvent } from "../services/analytics";
import {
  extractPoemsText,
  fetchHtmlPageFromGanjoor,
  getPoems,
} from "../services/ganjoor-crawler";
import { PoemNavToken } from "../services/poem-nav-tokens";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import { pathAfterAuthor } from "./ganjoor-path";
import { buildPoemActionKeyboard, type PoemListNav } from "./poem-display";
import { POET_POOL } from "./poet-pool";
import { replyPoemChunks } from "./send-poem-message";
import { normalizeTelegramChunks, splitMessage } from "../utils/splitter";

function useChunkSplitForAuthor(author: string): boolean {
  const e = POET_POOL.find((p) => p.author === author);
  return e?.useChunkSplit ?? false;
}

type NavBase = {
  author: string;
  indexPath: string;
  backCallback: string;
  poetLabel: string;
};

async function renderPoemAtListIndex(
  ctx: Context,
  nav: NavBase,
  listIndex: number
): Promise<void> {
  const htmlPage = await fetchHtmlPageFromGanjoor(nav.author, nav.indexPath);
  const list = await getPoems(htmlPage);
  if (listIndex < 0 || listIndex >= list.length) return;

  const item = list[listIndex];
  if (!item?.link) return;

  const rel = pathAfterAuthor(nav.author, item.link);
  const poemHtml = await fetchHtmlPageFromGanjoor(nav.author, rel);
  const poemText = await extractPoemsText(poemHtml);

  const fullText = `<b>${nav.poetLabel}</b>\n<b>${item.text}</b>\n\n${poemText}`;
  const useChunk = useChunkSplitForAuthor(nav.author);
  const chunks = useChunk
    ? normalizeTelegramChunks(splitMessage(fullText, 150))
    : normalizeTelegramChunks([fullText]);

  const listNav: PoemListNav = {
    author: nav.author,
    indexPath: nav.indexPath,
    listIndex,
    listLength: list.length,
    backCallback: nav.backCallback,
    poetLabel: nav.poetLabel,
  };

  const keyboard = await buildPoemActionKeyboard(
    ctx,
    {
      link: item.link,
      title: item.text,
      poetLabel: nav.poetLabel,
    },
    nav.backCallback,
    { listNav }
  );

  await replyPoemChunks(ctx, chunks, keyboard);
}

function addPoemNavCallbacks(): void {
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^pnv:([a-f\d]{24}):([np])$/i,
    async (ctx: Context) => {
      const id = ctx.match?.[1];
      const dir = ctx.match?.[2];
      if (!id || !dir) return;

      const token = await PoemNavToken.findById(id).lean();
      if (!token) {
        await ctx.answerCallbackQuery({
          text: "این دکمه منقضی شده؛ دوباره از فهرست باز کنید.",
        });
        return;
      }

      await ctx.answerCallbackQuery();
      saveAnalyticsEvent(ctx, `pnv:${dir}`);

      const delta = dir === "n" ? 1 : -1;
      const nextIdx = token.listIndex + delta;

      const htmlPage = await fetchHtmlPageFromGanjoor(
        token.author,
        token.indexPath
      );
      const list = await getPoems(htmlPage);
      if (nextIdx < 0 || nextIdx >= list.length) return;

      await renderPoemAtListIndex(
        ctx,
        {
          author: token.author,
          indexPath: token.indexPath,
          backCallback: token.backCallback,
          poetLabel: token.poetLabel,
        },
        nextIdx
      );
    }
  );
}

export { addPoemNavCallbacks };
