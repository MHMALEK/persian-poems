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

const config = {
  pagination: { itemPerPage: 10 },
  wikiPediaUrl: "https://fa.wikipedia.org/wiki/%D8%B3%D8%B9%D8%AF%DB%8C",
};

const showBio = (ctx: Context) => {
  const text =
    "ابومحمد مصلح‌الدین بن عبدالله شیرازی، متخلص به «سعدی»، از بزرگ‌ترین سخنوران پارسی‌گوی ایران است. دیوان او شامل غزلیات، قصاید، ترجیع‌بند، مقطعات و رباعیات است و آثار منثور او مانند گلستان و بوستان از مشهورترین نثرهای ادبی فارسی به شمار می‌روند.";
  const keyboard = new InlineKeyboard();
  keyboard
    .url("ویکی‌پدیا", config.wikiPediaUrl)
    .row()
    .text("بازگشت", "back_to_main_saadi:fa");

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
    { link, title: resolvedTitle, poetLabel: "سعدی" },
    "saadi_poems:fa",
    listNav ? { listNav } : undefined
  );
  await ctx.reply(text, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
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
        callback_data: `saadi_poems_select_fa:${item.link}`,
      },
    ]);
  });

  if (pageNum > 0) {
    keyboard.push([
      {
        text: "⬅️ قبلی",
        callback_data: `saadi_page:${pageNum - 1}|${sectionPath}`,
      },
    ]);
  }

  if (start + config.pagination.itemPerPage < list.length) {
    keyboard.push([
      {
        text: "بعدی ➡️",
        callback_data: `saadi_page:${pageNum + 1}|${sectionPath}`,
      },
    ]);
  }

  keyboard.push([
    {
      text: "بازگشت",
      callback_data: "saadi_poems:fa",
    },
  ]);

  const header = "اشعار سعدی";
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

const createSaadiMenuFa = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage"
) => {
  const menu = new InlineKeyboard();
  const text =
    "در این بخش می‌توانید غزلیات، رباعیات و قطعات سعدی را از گنجور بخوانید.";

  menu.text("اشعار سعدی", "saadi_poems:fa").row();
  menu.text("درباره سعدی", "saadi_bio:fa").row();
  menu.text("بازگشت", "back_to_poet_menu_fa").row();

  if (editOrReply === "editMessage") {
    return ctx.editMessageText(text, { reply_markup: menu });
  }
  return ctx.reply(text, { reply_markup: menu });
};

const createSaadi = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage" = "replyMessage"
) => {
  const newMenu = new InlineKeyboard()
    .text("غزلیات دیوان", "saadi_ghazals")
    .row()
    .text("رباعیات دیوان", "saadi_robaees")
    .row()
    .text("قطعات دیوان", "saadi_ghetes")
    .row()
    .text("بازگشت", "go-back-to-saadi-list");

  if (editOrReply === "editMessage") {
    return ctx.editMessageText("یک بخش را انتخاب کنید.", {
      reply_markup: newMenu,
    });
  }
  return ctx.reply("یک بخش را انتخاب کنید.", { reply_markup: newMenu });
};

const addSaadiFaCallbacks = () => {
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^saadi_page:(\d+)\|(.+)$/,
    async (ctx) => {
    const pageNum = parseInt(String(ctx.match![1]), 10);
    const sectionPath = String(ctx.match![2]);
    saveAnalyticsEvent(ctx, `saadi_page:${pageNum}`);

    const htmlPage = await fetchHtmlPageFromGanjoor("saadi", sectionPath);
    const list = await getPoems(htmlPage);
    showPage(list, ctx, pageNum, "editMessage", sectionPath);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /saadi_poems_select_fa:(.+)/,
    async (ctx) => {
      const itemLink = String(ctx.match![1]);
      const type = itemLink.split("/saadi/")[1];
      saveAnalyticsEvent(ctx, `saadi_poems_select_fa:${type}`);

      const htmlPage = await fetchHtmlPageFromGanjoor("saadi", type);
      const poemText = await extractPoemsText(htmlPage);

      const indexPath = ganjoorIndexPathFromPoemLink("saadi", itemLink);
      let listNav: PoemListNav | undefined;
      let poemTitle: string | undefined;
      if (indexPath) {
        const listPage = await fetchHtmlPageFromGanjoor("saadi", indexPath);
        const list = await getPoems(listPage);
        const listIndex = list.findIndex((x: { link: string }) => x.link === itemLink);
        if (listIndex !== -1 && list.length > 1) {
          poemTitle = list[listIndex]?.text;
          listNav = {
            author: "saadi",
            indexPath,
            listIndex,
            listLength: list.length,
            backCallback: "saadi_poems:fa",
            poetLabel: "سعدی",
          };
        }
      }

      await showPoem(ctx, poemText, itemLink, poemTitle, listNav);
    }
  );

  const openSection = async (ctx: Context, sectionPath: string, tag: string) => {
    const htmlPage = await fetchHtmlPageFromGanjoor("saadi", sectionPath);
    const list = await getPoems(htmlPage);
    saveAnalyticsEvent(ctx, tag);
    showPage(list, ctx, 0, "editMessage", sectionPath);
  };

  PersianPoemsTelegramBot.bot?.callbackQuery(/saadi_ghazals/, async (ctx) => {
    await openSection(ctx, "divan/ghazals", "saadi_ghazals");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/saadi_robaees/, async (ctx) => {
    await openSection(ctx, "divan/robaees", "saadi_robaees");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/saadi_ghetes/, async (ctx) => {
    await openSection(ctx, "divan/ghetes", "saadi_ghetes");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/saadi_bio:fa/, async (ctx) => {
    saveAnalyticsEvent(ctx, "saadi_bio");
    showBio(ctx);
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/saadi_poems:fa/, async (ctx) => {
    await ctx.answerCallbackQuery();
    saveAnalyticsEvent(ctx, "saadi_poems:fa");
    return createSaadi(ctx, poemAwareMenuMode(ctx));
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /go-back-to-saadi-list/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "go-back-to-saadi-list");
      return createSaadiMenuFa(ctx, "editMessage");
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /back_to_main_saadi:fa/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "back_to_main_saadi");
      return createSaadiMenuFa(ctx, "editMessage");
    }
  );
};

export {
  addSaadiFaCallbacks,
  createSaadi,
  createSaadiMenuFa,
  showPage,
  showPoem,
  config,
};
