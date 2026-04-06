import { Context, InlineKeyboard } from "grammy";
import { saveAnalyticsEvent } from "../../../services/analytics";
import {
  extractPoemsText,
  fetchHtmlPageFromGanjoor,
  getPoems,
} from "../../../services/ganjoor-crawler";
import PersianPoemsTelegramBot from "../../../services/telegram-bot";
import { createPoetListFa } from "../../../shared/commands";
import { poemAwareMenuMode } from "../../../shared/menu-delivery";
import {
  buildPoemActionKeyboard,
  type PoemListNav,
} from "../../../shared/poem-display";
import { ganjoorIndexPathFromPoemLink } from "../../../shared/ganjoor-path";
import { derivePoemTitle } from "../../../shared/poem-titles";
import { replyPoemChunks } from "../../../shared/send-poem-message";
import { normalizeTelegramChunks, splitMessage } from "../../../utils/splitter";

const config = {
  pagination: { itemPerPage: 10 },
  wikiPediaUrl: "https://fa.wikipedia.org/wiki/%D9%86%D8%B8%D8%A7%D9%85%DB%8C_%DA%AF%D9%86%D8%AC%D9%88%DB%8C",
};

const SECTIONS: { label: string; path: string; key: string }[] = [
  { label: "مخزن الاسرار", path: "5ganj/makhzanolasrar", key: "nezami_mk" },
  { label: "خسرو و شیرین", path: "5ganj/khosro-shirin", key: "nezami_ks" },
  { label: "لیلی و مجنون", path: "5ganj/leyli-majnoon", key: "nezami_lm" },
  { label: "هفت پیکر", path: "5ganj/7peykar", key: "nezami_hp" },
  { label: "شرفنامه", path: "5ganj/sharafname", key: "nezami_sh" },
  { label: "خردنامه", path: "5ganj/kheradname", key: "nezami_kh" },
];

const showBio = (ctx: Context) => {
  const text =
    "نظامی گنجوی از برجسته‌ترین حماسه‌سرایان پارسی‌سرای ایران است. پنج‌گانهٔ او (مخزن‌الاسرار، خسرو و شیرین، لیلی و مجنون، هفت‌پیکر و شرفنامه) از آثار ماندگار ادبیات فارسی است.";
  const keyboard = new InlineKeyboard();
  keyboard
    .url("ویکی‌پدیا", config.wikiPediaUrl)
    .row()
    .text("بازگشت", "back_to_main_nezami:fa");

  return ctx.reply(text, { reply_markup: keyboard });
};

const showPoem = async (
  ctx: Context,
  text: string,
  link: string,
  title?: string,
  listNav?: PoemListNav | null
) => {
  const resolvedTitle = title ?? derivePoemTitle(text);
  const keyboard = await buildPoemActionKeyboard(
    ctx,
    { link, title: resolvedTitle, poetLabel: "نظامی" },
    "nezami_poems:fa",
    listNav ? { listNav } : undefined
  );
  const chunks = normalizeTelegramChunks(splitMessage(text, 150));
  await replyPoemChunks(ctx, chunks, keyboard);
};

const showPage = (
  list: { text: string; link: string }[],
  ctx: Context,
  pageNum: number,
  editOrReplyToMessage: "replyMessage" | "editMessage",
  sectionPath: string
) => {
  const start = pageNum * config.pagination.itemPerPage;
  const itemsToShow = list.slice(start, start + config.pagination.itemPerPage);

  const keyboard: { text: string; callback_data: string }[][] = [];

  itemsToShow.forEach((item) => {
    keyboard.push([
      {
        text: item.text,
        callback_data: `nezami_poems_select_fa:${item.link}`,
      },
    ]);
  });

  if (pageNum > 0) {
    keyboard.push([
      {
        text: "⬅️ قبلی",
        callback_data: `nezami_page:${pageNum - 1}|${sectionPath}`,
      },
    ]);
  }

  if (start + config.pagination.itemPerPage < list.length) {
    keyboard.push([
      {
        text: "بعدی ➡️",
        callback_data: `nezami_page:${pageNum + 1}|${sectionPath}`,
      },
    ]);
  }

  keyboard.push([
    {
      text: "بازگشت",
      callback_data: "nezami_poems:fa",
    },
  ]);

  const header = "پنج گنج نظامی";
  if (editOrReplyToMessage === "replyMessage") {
    ctx.reply(header, {
      reply_markup: { inline_keyboard: keyboard },
    });
  } else {
    ctx.editMessageText(header, {
      reply_markup: { inline_keyboard: keyboard },
    });
  }
};

const createNezamiMenuFa = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage"
) => {
  const menu = new InlineKeyboard();
  const text =
    "نظامی گنجوی — پنج گنج را از گنجور باز کنید و شعر را بخوانید.";

  menu.text("پنج گنج", "nezami_poems:fa").row();
  menu.text("درباره نظامی", "nezami_bio:fa").row();
  menu.text("بازگشت", "back_to_poet_menu_fa").row();

  if (editOrReply === "editMessage") {
    return ctx.editMessageText(text, { reply_markup: menu });
  }
  return ctx.reply(text, { reply_markup: menu });
};

const createNezami = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage" = "replyMessage"
) => {
  const menu = new InlineKeyboard();
  SECTIONS.forEach((s) => {
    menu.text(s.label, s.key).row();
  });
  menu.text("بازگشت", "go-back-to-nezami-list");

  if (editOrReply === "editMessage") {
    return ctx.editMessageText("یک اثر را انتخاب کنید.", {
      reply_markup: menu,
    });
  }
  return ctx.reply("یک اثر را انتخاب کنید.", { reply_markup: menu });
};

const addNezamiFaCallbacks = () => {
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^nezami_page:(\d+)\|(.+)$/,
    async (ctx) => {
      const pageNum = parseInt(String(ctx.match![1]), 10);
      const sectionPath = String(ctx.match![2]);
      saveAnalyticsEvent(ctx, `nezami_page:${pageNum}`);

      const htmlPage = await fetchHtmlPageFromGanjoor("nezami", sectionPath);
      const list = await getPoems(htmlPage);
      showPage(list, ctx, pageNum, "editMessage", sectionPath);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /nezami_poems_select_fa:(.+)/,
    async (ctx) => {
      const itemLink = String(ctx.match![1]);
      const type = itemLink.split("/nezami/")[1];
      saveAnalyticsEvent(ctx, `nezami_poems_select_fa:${type}`);

      const htmlPage = await fetchHtmlPageFromGanjoor("nezami", type);
      const poemText = await extractPoemsText(htmlPage);

      const indexPath = ganjoorIndexPathFromPoemLink("nezami", itemLink);
      let listNav: PoemListNav | undefined;
      let poemTitle: string | undefined;
      if (indexPath) {
        const listPage = await fetchHtmlPageFromGanjoor("nezami", indexPath);
        const list = await getPoems(listPage);
        const listIndex = list.findIndex((x: { link: string }) => x.link === itemLink);
        if (listIndex !== -1 && list.length > 1) {
          poemTitle = list[listIndex]?.text;
          listNav = {
            author: "nezami",
            indexPath,
            listIndex,
            listLength: list.length,
            backCallback: "nezami_poems:fa",
            poetLabel: "نظامی",
          };
        }
      }

      await showPoem(ctx, poemText, itemLink, poemTitle, listNav);
    }
  );

  SECTIONS.forEach((s) => {
    PersianPoemsTelegramBot.bot?.callbackQuery(new RegExp(`^${s.key}$`), async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor("nezami", s.path);
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, s.key);
      showPage(list, ctx, 0, "editMessage", s.path);
    });
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/nezami_bio:fa/, async (ctx) => {
    saveAnalyticsEvent(ctx, "nezami_bio");
    showBio(ctx);
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/nezami_poems:fa/, async (ctx) => {
    await ctx.answerCallbackQuery();
    saveAnalyticsEvent(ctx, "nezami_poems:fa");
    return createNezami(ctx, poemAwareMenuMode(ctx));
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /go-back-to-nezami-list/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "go-back-to-nezami-list");
      return createNezamiMenuFa(ctx, "editMessage");
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /back_to_main_nezami:fa/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "back_to_main_nezami");
      return createNezamiMenuFa(ctx, "editMessage");
    }
  );
};

export {
  addNezamiFaCallbacks,
  createNezami,
  createNezamiMenuFa,
  showPage,
  showPoem,
  config,
};
