import * as cheerio from "cheerio";
import { Context, InlineKeyboard } from "grammy";
import { saveAnalyticsEvent } from "../../../services/analytics";
import {
  extractPoemsText,
  fetchHtmlPageFromGanjoor,
  getPoems,
  loadHtml,
} from "../../../services/ganjoor-crawler";
import PersianPoemsTelegramBot from "../../../services/telegram-bot";
import { createPoetListFa } from "../../../shared/commands";
const config = {
  pagination: {
    itemPerPage: 10,
  },
  wikiPediaUrl: "https://fa.wikipedia.org/wiki/%D8%AD%D8%A7%D9%81%D8%B8",
  sourceBaseUrl: "https://ganjoor.net/",
};

const showHafezBio = (ctx: Context) => {
  const text =
    "خواجه شمس‌الدین محمد شیرازی متخلص به «حافظ»، غزلسرای بزرگ و از خداوندان شعر و ادب پارسی است. وی حدود سال ۷۲۶ هجری قمری در شیراز متولد شد. علوم و فنون را در محفل درس استادان زمان فراگرفت و در علوم ادبی عصر پایه‌ای رفیع یافت. خاصه در علوم فقهی و الهی تأمل بسیار کرد و قرآن را با چهارده روایت مختلف از بر داشت. گوته دانشمند بزرگ و شاعر و سخنور مشهور آلمانی دیوان شرقی خود را به نام او و با کسب الهام از افکار وی تدوین کرد. دیوان اشعار او شامل غزلیات، چند قصیده، چند مثنوی، قطعات و رباعیات است. وی به سال ۷۹۲ هجری قمری در شیراز درگذشت. آرامگاه او در حافظیهٔ شیراز زیارتگاه صاحبنظران و عاشقان شعر و ادب پارسی است.    ";
  const keyboard = new InlineKeyboard();
  keyboard
    .url("سایت ویکیپدیا", config.wikiPediaUrl)
    .row()
    .text("بازگشت", "back:fa")
    .row();

  return ctx.reply(text, {
    reply_markup: keyboard,
  });
};

const showPoem = async (ctx: Context, text: string, link: string) => {
  // show menu at the end of poem
  let keyboard = new InlineKeyboard();
  keyboard.url("مطالعه در وبسایت گنجور", `https://ganjoor.net${link}`).row();

  keyboard.text("بازگشت", "hafez_poems:fa");

  ctx.reply(text, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
};

const showPage = (
  list: any,
  ctx: Context,
  pageNum: number,
  editOrReplyToMessage: "replyMessage" | "editMessage",
  type: string
) => {
  let start = pageNum * config.pagination.itemPerPage;
  let itemsToShow = list.slice(start, start + config.pagination.itemPerPage);

  let keyboard: any = [];

  itemsToShow.forEach((item: any) => {
    keyboard.push([
      {
        text: item.text,
        callback_data: `hafez_poems_select_fa:${item.link}`,
      },
    ]);
  });

  if (pageNum > 0) {
    keyboard.push([
      {
        text: "⬅️ Previous",
        callback_data: `hafez_page:${pageNum - 1}:${type}`,
      },
    ]);
  }

  if (start + config.pagination.itemPerPage < list.length) {
    keyboard.push([
      {
        text: "Next ➡️",
        callback_data: `hafez_page:${pageNum + 1}:${type}`,
      },
    ]);
  }

  keyboard.push([
    {
      text: "بازگشت",
      callback_data: `hafez_poems:fa`,
    },
  ]);

  if (editOrReplyToMessage === "replyMessage") {
    ctx.reply(`اشعار حافظ`, {
      reply_markup: {
        inline_keyboard: [keyboard],
      },
    });
  }

  if (editOrReplyToMessage === "editMessage") {
    ctx.editMessageText(`اشعار حافظ `, {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  }
};

const createHafezMenuFa = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage"
) => {
  const menu = new InlineKeyboard();

  const text =
    "به ربات تلگرام شعر های حافظ خوش آمدید. در این ربات، شما می توانید شعر های زیبای حافظ را بخوانید. همچنین با استفاده از دستور /poem می توانید شعر روز را دریافت کنید. لذت ببرید.";

  menu.text("اشعار حافظ", "hafez_poems:fa").row();
  menu.text("فال حافظ", "hafez_get_fal").row();
  menu.text("درباره حافظ", "hafez_bio:fa").row();
  menu.text("بازگشت", "back_to_poet_menu_fa").row();

  if (editOrReply === "editMessage") {
    return ctx.editMessageText(text, {
      reply_markup: menu,
    });
  }
  if (editOrReply === "replyMessage") {
    return ctx.reply(text, {
      reply_markup: menu,
    });
  }
};

const createHafez = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage" = "replyMessage"
) => {
  const newMenu = new InlineKeyboard()
    .text("غزلیات", "hafez_ghazal")
    .row()
    .text("رباعیات", "hafez_robaee2")
    .row()
    .text("قطعات", "hafez_ghete")
    .row()
    .text("قصاید", "hafez_ghaside")
    .row()
    .text("مثنوی", "hafez_masnavi")
    .row()
    .text("ساقی نامه", "hafez_saghiname")
    .row()

    .text("بازگشت", "go-back-to-hafez-list");

  if (editOrReply === "editMessage") {
    return ctx.editMessageText("لطفا یک مورد را انتخاب نمایید", {
      reply_markup: newMenu,
    });
  }
  if (editOrReply === "replyMessage") {
    return ctx.reply("لطفا یک مورد انتخاب کنید", {
      reply_markup: newMenu,
    });
  }
};

const selectAndRenderRandomGhazal = async (ctx: Context) => {
  const htmlPage = await fetchHtmlPageFromGanjoor("hafez", "ghazal");
  const list = await getPoems(htmlPage);
  const randomGhazalIndex = Math.floor(Math.random() * list.length);
  const randomGhazal = list[randomGhazalIndex];

  const randomGhazalHtml = await fetchHtmlPageFromGanjoor(
    "hafez",
    randomGhazal.link.split("/hafez/")[1]
  );

  const poemText = await extractPoemsText(randomGhazalHtml);

  const text = `
          <b>${randomGhazal.text} </b>
    
    
        ${poemText}
        
        `;

  showPoem(ctx, text, randomGhazal.link);
};

const addHafezFaCallbacks = () => {
  // callbacks
  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_page:(.+)/, async (ctx: Context) => {
    const pageNum = parseInt(String(ctx.match![1]));
    saveAnalyticsEvent(ctx, `hafez_page:${pageNum}`);

    const type = ctx.callbackQuery!.data!.split(":")[2];
    const htmlPage = await fetchHtmlPageFromGanjoor("hafez", "ghazal");
    const list = await getPoems(htmlPage);

    showPage(list, ctx, pageNum, "editMessage", type);
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /hafez_poems_select_fa:(.+)/,
    async (ctx: Context) => {
      const itemLink = String(ctx.match![1]);
      const type = itemLink.split("/hafez/")[1];
      saveAnalyticsEvent(ctx, `hafez_poems_select_fa:${type}`);

      const htmlPage = await fetchHtmlPageFromGanjoor("hafez", type);

      const poemText = await extractPoemsText(htmlPage);
      showPoem(ctx, poemText, itemLink);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_ghazal/, async (ctx: any) => {
    const htmlPage = await fetchHtmlPageFromGanjoor("hafez", "ghazal");
    const list = await getPoems(htmlPage);
    saveAnalyticsEvent(ctx, "ghazal");
    showPage(list, ctx, 0, "editMessage", "ghazal");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_ghete/, async (ctx: any) => {
    const htmlPage = await fetchHtmlPageFromGanjoor("hafez", "ghete");
    const list = await getPoems(htmlPage);
    saveAnalyticsEvent(ctx, "ghete");

    showPage(list, ctx, 0, "editMessage", "ghete");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_robaee2/, async (ctx: any) => {
    const htmlPage = await fetchHtmlPageFromGanjoor("hafez", "robaee2");
    const list = await getPoems(htmlPage);
    saveAnalyticsEvent(ctx, "hafez_robaee2");

    showPage(list, ctx, 0, "editMessage", "robaee2");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_ghaside/, async (ctx: any) => {
    const htmlPage = await fetchHtmlPageFromGanjoor("hafez", "ghaside");
    const list = await getPoems(htmlPage);
    saveAnalyticsEvent(ctx, "hafez_ghaside");

    showPage(list, ctx, 0, "editMessage", "ghaside");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_masnavi/, async (ctx: any) => {
    saveAnalyticsEvent(ctx, "hafez_masnavi");
    const htmlPage = await fetchHtmlPageFromGanjoor("hafez", "masnavi");
    const poem = await extractPoemsText(htmlPage);
    showPoem(ctx, poem, "hafez/masnavi");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_saghiname/, async (ctx: any) => {
    const htmlPage = await fetchHtmlPageFromGanjoor("hafez", "saghiname");
    const poem = await extractPoemsText(htmlPage);
    saveAnalyticsEvent(ctx, "saghiname");

    showPoem(ctx, poem, "hafez/saghiname");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_bio:fa/, async (ctx: any) => {
    saveAnalyticsEvent(ctx, "hafez_bio");
    showHafezBio(ctx);
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_get_fal/, async (ctx: any) => {
    saveAnalyticsEvent(ctx, "hafez_get_fal");

    selectAndRenderRandomGhazal(ctx);
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/hafez_poems:fa/, async (ctx: any) => {
    saveAnalyticsEvent(ctx, "hafez_poems:fa");

    return createHafez(ctx, "editMessage");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(/back:fa/, async (ctx: any) => {
    saveAnalyticsEvent(ctx, "back:fa");

    return createHafezMenuFa(ctx, "editMessage");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /hafez_main_menu_back_fa/,
    async (ctx: any) => {
      saveAnalyticsEvent(ctx, "hafez_main_menu_back_fa");

      console.log(ctx);
      return createPoetListFa(ctx);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /go-back-to-hafez-list/,
    async (ctx: any) => {
      saveAnalyticsEvent(ctx, "go-back-to-hafez-list");

      console.log(ctx);
      return createHafezMenuFa(ctx, "editMessage");
    }
  );
};

export {
  showPoem,
  showPage,
  createHafezMenuFa,
  createHafez,
  selectAndRenderRandomGhazal,
  addHafezFaCallbacks,
  config,
};
