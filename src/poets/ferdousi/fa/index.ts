import { Context, InlineKeyboard } from "grammy";
import { saveAnalyticsEvent } from "../../../services/analytics";
import {
  extractPoemsText,
  fetchHtmlPageFromGanjoor,
  getCategoryLinks,
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

const AUTHOR = "ferdousi";

const config = {
  pagination: { itemPerPage: 10 },
  wikiPediaUrl: "https://fa.wikipedia.org/wiki/%D9%81%D8%B1%D8%AF%D9%88%D8%B3%DB%8C",
};

const showBio = (ctx: Context) => {
  const text =
    "حکیم ابوالقاسم فردوسی طوسی، حماسه‌سرای بزرگ پارسی‌گوی و سرایندهٔ شاهنامه است. شاهنامه، حماسهٔ ملی ایران و از پایدارترین سروده‌های ادبیات فارسی به‌شمار می‌رود.";
  const keyboard = new InlineKeyboard();
  keyboard
    .url("ویکی‌پدیا", config.wikiPediaUrl)
    .row()
    .text("بازگشت", "back_to_main_ferdousi:fa");

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
    { link, title: resolvedTitle, poetLabel: "فردوسی" },
    "ferdousi_poems:fa",
    listNav ? { listNav } : undefined
  );
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
    return;
  }
  await ctx.reply(text, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
};

const showPoemList = (
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
        callback_data: `ferdousi_poems_select_fa:${item.link}`,
      },
    ]);
  });

  if (pageNum > 0) {
    keyboard.push([
      {
        text: "⬅️ قبلی",
        callback_data: `ferdousi_page:${pageNum - 1}|${sectionPath}`,
      },
    ]);
  }

  if (start + config.pagination.itemPerPage < list.length) {
    keyboard.push([
      {
        text: "بعدی ➡️",
        callback_data: `ferdousi_page:${pageNum + 1}|${sectionPath}`,
      },
    ]);
  }

  keyboard.push([
    {
      text: "بازگشت",
      callback_data: "ferdousi_poems:fa",
    },
  ]);

  const header = "شاهنامه فردوسی";
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

const showCategoryList = (
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
    const enc = encodeURIComponent(item.link);
    keyboard.push([
      {
        text: item.text.slice(0, 58),
        callback_data: `ferdousi_nav:${enc}`,
      },
    ]);
  });

  if (pageNum > 0) {
    keyboard.push([
      {
        text: "⬅️ قبلی",
        callback_data: `ferdousi_cpage:${pageNum - 1}|${sectionPath}`,
      },
    ]);
  }

  if (start + config.pagination.itemPerPage < list.length) {
    keyboard.push([
      {
        text: "بعدی ➡️",
        callback_data: `ferdousi_cpage:${pageNum + 1}|${sectionPath}`,
      },
    ]);
  }

  keyboard.push([
    {
      text: "بازگشت",
      callback_data: "ferdousi_poems:fa",
    },
  ]);

  const header = "فهرست بخش‌ها";
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

const createFerdousiMenuFa = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage"
) => {
  const menu = new InlineKeyboard();
  const text =
    "فردوسی — شاهنامه را از گنجور بخوانید یا وارد فهرست بخش‌های شاهنامه شوید.";

  menu.text("اشعار فردوسی", "ferdousi_poems:fa").row();
  menu.text("درباره فردوسی", "ferdousi_bio:fa").row();
  menu.text("بازگشت", "back_to_poet_menu_fa").row();

  if (editOrReply === "editMessage") {
    return ctx.editMessageText(text, { reply_markup: menu });
  }
  return ctx.reply(text, { reply_markup: menu });
};

const createFerdousi = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage" = "replyMessage"
) => {
  const menu = new InlineKeyboard()
    .text("شاهنامه — آغاز", "ferdousi_shahname_aghaz")
    .row()
    .text("شاهنامه — فهرست بخش‌ها", "ferdousi_shahname_cat")
    .row()
    .text("بازگشت", "go-back-to-ferdousi-list");

  if (editOrReply === "editMessage") {
    return ctx.editMessageText("یک گزینه را انتخاب کنید.", {
      reply_markup: menu,
    });
  }
  return ctx.reply("یک گزینه را انتخاب کنید.", { reply_markup: menu });
};

async function handleFerdousiNav(ctx: Context, link: string) {
  const rel = link.replace(/^\/ferdousi\//, "");
  const html = await fetchHtmlPageFromGanjoor(AUTHOR, rel);
  const poems = await getPoems(html);
  const cats = getCategoryLinks(html, AUTHOR);

  if (poems.length > 0) {
    showPoemList(poems, ctx, 0, "editMessage", rel);
  } else if (cats.length > 0) {
    showCategoryList(cats, ctx, 0, "editMessage", rel);
  } else {
    const body = await extractPoemsText(html);
    if (body.trim().length > 30) {
      await showPoem(ctx, body, link, derivePoemTitle(body));
    } else {
      await ctx.reply(
        "این بخش زیرفهرست دارد؛ از گزینهٔ «فهرست بخش‌ها» وارد شوید."
      );
    }
  }
}

const addFerdousiFaCallbacks = () => {
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^ferdousi_page:(\d+)\|(.+)$/,
    async (ctx) => {
      const pageNum = parseInt(String(ctx.match![1]), 10);
      const sectionPath = String(ctx.match![2]);
      saveAnalyticsEvent(ctx, `ferdousi_page:${pageNum}`);

      const htmlPage = await fetchHtmlPageFromGanjoor(AUTHOR, sectionPath);
      const list = await getPoems(htmlPage);
      showPoemList(list, ctx, pageNum, "editMessage", sectionPath);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^ferdousi_cpage:(\d+)\|(.+)$/,
    async (ctx) => {
      const pageNum = parseInt(String(ctx.match![1]), 10);
      const sectionPath = String(ctx.match![2]);
      saveAnalyticsEvent(ctx, `ferdousi_cpage:${pageNum}`);

      const htmlPage = await fetchHtmlPageFromGanjoor(AUTHOR, sectionPath);
      const list = getCategoryLinks(htmlPage, AUTHOR);
      showCategoryList(list, ctx, pageNum, "editMessage", sectionPath);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^ferdousi_nav:(.+)$/,
    async (ctx) => {
      const enc = String(ctx.match![1]);
      let link: string;
      try {
        link = decodeURIComponent(enc);
      } catch {
        await ctx.reply("نشانی نامعتبر است.");
        return;
      }
      saveAnalyticsEvent(ctx, "ferdousi_nav");
      await handleFerdousiNav(ctx, link);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /ferdousi_poems_select_fa:(.+)/,
    async (ctx) => {
      const itemLink = String(ctx.match![1]);
      const type = itemLink.split("/ferdousi/")[1];
      saveAnalyticsEvent(ctx, `ferdousi_poems_select_fa:${type}`);

      const htmlPage = await fetchHtmlPageFromGanjoor(AUTHOR, type);
      const poemText = await extractPoemsText(htmlPage);

      const indexPath = ganjoorIndexPathFromPoemLink(AUTHOR, itemLink);
      let listNav: PoemListNav | undefined;
      let poemTitle: string | undefined;
      if (indexPath) {
        const listPage = await fetchHtmlPageFromGanjoor(AUTHOR, indexPath);
        const list = await getPoems(listPage);
        const listIndex = list.findIndex((x: { link: string }) => x.link === itemLink);
        if (listIndex !== -1 && list.length > 1) {
          poemTitle = list[listIndex]?.text;
          listNav = {
            author: AUTHOR,
            indexPath,
            listIndex,
            listLength: list.length,
            backCallback: "ferdousi_poems:fa",
            poetLabel: "فردوسی",
          };
        }
      }

      await showPoem(ctx, poemText, itemLink, poemTitle, listNav);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /ferdousi_shahname_aghaz/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "ferdousi_shahname_aghaz");
      const htmlPage = await fetchHtmlPageFromGanjoor(AUTHOR, "shahname/aghaz");
      const list = await getPoems(htmlPage);
      showPoemList(list, ctx, 0, "editMessage", "shahname/aghaz");
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /ferdousi_shahname_cat/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "ferdousi_shahname_cat");
      const htmlPage = await fetchHtmlPageFromGanjoor(AUTHOR, "shahname");
      const list = getCategoryLinks(htmlPage, AUTHOR);
      showCategoryList(list, ctx, 0, "editMessage", "shahname");
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(/ferdousi_bio:fa/, async (ctx) => {
    saveAnalyticsEvent(ctx, "ferdousi_bio");
    showBio(ctx);
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/ferdousi_poems:fa/, async (ctx) => {
    await ctx.answerCallbackQuery();
    saveAnalyticsEvent(ctx, "ferdousi_poems:fa");
    return createFerdousi(ctx, poemAwareMenuMode(ctx));
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /go-back-to-ferdousi-list/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "go-back-to-ferdousi-list");
      return createFerdousiMenuFa(ctx, "editMessage");
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /back_to_main_ferdousi:fa/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "back_to_main_ferdousi");
      return createFerdousiMenuFa(ctx, "editMessage");
    }
  );
};

export {
  addFerdousiFaCallbacks,
  createFerdousi,
  createFerdousiMenuFa,
  showPoemList,
  showPoem,
  config,
};
