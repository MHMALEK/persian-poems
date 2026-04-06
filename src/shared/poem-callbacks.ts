import { Context, InlineKeyboard } from "grammy";
import { saveAnalyticsEvent } from "../services/analytics";
import { getPoemToken } from "../services/poem-tokens";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import {
  addFavorite,
  getFavoriteBySubdocId,
  getLastReadPoem,
  isFavorite,
  listFavorites,
  removeFavoriteByLink,
} from "../services/users/poems";
import { authorFromGanjoorPath } from "./ganjoor-path";
import { loadPoemBodyByGanjoorLink } from "./load-ganjoor-poem";
import { buildPoemActionKeyboard } from "./poem-display";
import { derivePoemTitle } from "./poem-titles";
import {
  appendMainMenuKeyboard,
  buildMainKeyboard,
} from "./main-menu-keyboard";
import { replyPoemChunks } from "./send-poem-message";
import { splitMessage } from "../utils/splitter";

const BACK_MAIN = "back_to_poet_menu_fa";

async function openFavoritesList(ctx: Context): Promise<void> {
  const uid = ctx.from?.id;
  if (uid === undefined) return;

  const favs = await listFavorites(uid);
  if (!favs.length) {
    await ctx.reply("هنوز شعری را به علاقه‌مندی‌ها اضافه نکرده‌اید.", {
      reply_markup: buildMainKeyboard(),
    });
    return;
  }

  const kb = new InlineKeyboard();
  for (const f of favs.slice(0, 25)) {
    const label =
      (f.title || f.link).slice(0, 42) +
      ((f.title || f.link).length > 42 ? "…" : "");
    kb.text(label, `fo:${String(f._id)}`).row();
  }
  kb.text("بازگشت", BACK_MAIN);
  appendMainMenuKeyboard(kb);
  await ctx.reply("علاقه‌مندی‌های شما:", { reply_markup: kb });
}

async function openLastReadPoem(ctx: Context): Promise<void> {
  const uid = ctx.from?.id;
  if (uid === undefined) return;

  const last = await getLastReadPoem(uid);
  if (!last?.link) {
    await ctx.reply("هنوز شعری را باز نکرده‌اید.", {
      reply_markup: buildMainKeyboard(),
    });
    return;
  }

  try {
    const body = await loadPoemBodyByGanjoorLink(last.link);
    const title = last.title || derivePoemTitle(body);
    const fullText = `<b>${last.poetLabel || "—"}</b>\n<b>${title}</b>\n\n${body}`;
    const author = authorFromGanjoorPath(last.link);
    const useChunk =
      author === "moulavi" ? true : fullText.length > 3500;
    const chunks = useChunk ? splitMessage(fullText, 150) : [fullText];
    const keyboard = await buildPoemActionKeyboard(
      ctx,
      { link: last.link, title, poetLabel: last.poetLabel || "—" },
      BACK_MAIN,
      { poolActions: true }
    );
    await replyPoemChunks(ctx, chunks, keyboard);
  } catch (e) {
    console.error("openLastReadPoem failed", e);
    await ctx.reply("دریافت آخرین شعر با خطا مواجه شد.", {
      reply_markup: buildMainKeyboard(),
    });
  }
}

function addPoemFeatureCallbacks(): void {
  PersianPoemsTelegramBot.bot?.callbackQuery(/^pft:(.+)$/, async (ctx) => {
    const id = ctx.match?.[1];
    if (!id) return;

    const t = await getPoemToken(id);
    if (!t) {
      await ctx.answerCallbackQuery({
        text: "این دکمه منقضی شده؛ شعر را دوباره باز کنید.",
      });
      return;
    }

    const uid = ctx.from?.id;
    if (uid === undefined) return;

    const has = await isFavorite(uid, t.link);
    if (has) await removeFavoriteByLink(uid, t.link);
    else
      await addFavorite(uid, {
        link: t.link,
        title: t.title,
        poetLabel: t.poetLabel,
      });

    await ctx.answerCallbackQuery({
      text: has ? "از علاقه‌مندی‌ها حذف شد." : "به علاقه‌مندی‌ها اضافه شد.",
    });
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/^fav_list_fa$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    saveAnalyticsEvent(ctx, "fav_list_fa");
    await openFavoritesList(ctx);
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/^fo:(.+)$/, async (ctx) => {
    const subId = ctx.match?.[1];
    if (!subId) return;

    await ctx.answerCallbackQuery();
    saveAnalyticsEvent(ctx, "fav_open");

    const uid = ctx.from?.id;
    if (uid === undefined) return;

    const fav = await getFavoriteBySubdocId(uid, subId);
    if (!fav) {
      await ctx.reply("این مورد دیگر در علاقه‌مندی‌ها نیست.", {
        reply_markup: buildMainKeyboard(),
      });
      return;
    }

    try {
      const body = await loadPoemBodyByGanjoorLink(fav.link);
      const title = fav.title || derivePoemTitle(body);
      const fullText = `<b>${fav.poetLabel || "—"}</b>\n<b>${title}</b>\n\n${body}`;
      const author = authorFromGanjoorPath(fav.link);
      const useChunk =
        author === "moulavi" ? true : fullText.length > 3500;
      const chunks = useChunk ? splitMessage(fullText, 150) : [fullText];
      const keyboard = await buildPoemActionKeyboard(
        ctx,
        { link: fav.link, title, poetLabel: fav.poetLabel || "—" },
        BACK_MAIN,
        { poolActions: true }
      );
      await replyPoemChunks(ctx, chunks, keyboard);
    } catch (e) {
      console.error("fav_open failed", e);
      await ctx.reply("دریافت این شعر با خطا مواجه شد.", {
        reply_markup: buildMainKeyboard(),
      });
    }
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/^last_read_fa$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    saveAnalyticsEvent(ctx, "last_read_fa");
    await openLastReadPoem(ctx);
  });
}

export { addPoemFeatureCallbacks, openFavoritesList, openLastReadPoem };
