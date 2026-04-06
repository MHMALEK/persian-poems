import * as cheerio from "cheerio";
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
import { normalizeTelegramChunks, splitMessage } from "../../../utils/splitter";
const config = {
  pagination: {
    itemPerPage: 10,
  },
  wikiPediaUrl: "https://fa.wikipedia.org/wiki/%D9%85%D9%88%D9%84%D9%88%DB%8C",
  sourceBaseUrl: "https://ganjoor.net/moulavi",
};

const showBio = (ctx: Context) => {
  const text =
    "حکیم ابوالفتح عمربن ابراهیم المولانای مشهور به «مولانا» فیلسوف و ریاضیدان و منجم و شاعر ایرانی در سال ۴۳۹ هجری قمری در نیشابور زاده شد. وی در ترتیب رصد ملکشاهی و اصلاح تقویم جلالی همکاری داشت. وی اشعاری به زبان پارسی و تازی و کتابهایی نیز به هر دو زبان دارد. از آثار او در ریاضی و جبر و مقابله رساله فی شرح ما اشکل من مصادرات کتاب اقلیدس، رساله فی الاحتیال لمعرفه مقداری الذهب و الفضه فی جسم مرکب منهما، و لوازم الامکنه را می‌توان نام برد. وی به سال ۵۲۶ هجری قمری درگذشت. رباعیات او شهرت جهانی دارد.  ";
  const keyboard = new InlineKeyboard();
  keyboard
    .url("سایت ویکیپدیا", config.wikiPediaUrl)
    .row()
    .text("بازگشت", "back_to_main_moulavi:fa")
    .row();

  return ctx.reply(text, {
    reply_markup: keyboard,
  });
};

const showPoem = async (
  ctx: Context,
  text: string,
  link: string,
  title?: string,
  listNav?: PoemListNav | null
) => {
  const resolvedTitle = title ?? derivePoemTitle(text);
  const maxChunkLines = 150;
  const chunks = normalizeTelegramChunks(splitMessage(text, maxChunkLines));
  const keyboard = await buildPoemActionKeyboard(
    ctx,
    { link, title: resolvedTitle, poetLabel: "مولانا" },
    "moulavi_poems:fa",
    listNav ? { listNav } : undefined
  );

  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await ctx.reply(chunks[i], {
      reply_markup: isLast ? keyboard : undefined,
      parse_mode: "HTML",
    });
  }
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
        callback_data: `moulavi_poems_select_fa:${item.link}`,
      },
    ]);
  });

  if (pageNum > 0) {
    keyboard.push([
      {
        text: "⬅️ Previous",
        callback_data: `moulavi_page:${pageNum - 1}:${type}`,
      },
    ]);
  }

  if (start + config.pagination.itemPerPage < list.length) {
    keyboard.push([
      {
        text: "Next ➡️",
        callback_data: `moulavi_page:${pageNum + 1}:${type}`,
      },
    ]);
  }

  keyboard.push([
    {
      text: "بازگشت",
      callback_data: `moulavi_poems:fa`,
    },
  ]);

  if (editOrReplyToMessage === "replyMessage") {
    ctx.reply(`اشعار مولانا`, {
      reply_markup: {
        inline_keyboard: [keyboard],
      },
    });
  }

  if (editOrReplyToMessage === "editMessage") {
    ctx.editMessageText(`اشعار مولانا `, {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  }
};

const createMoulaviMenuFa = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage"
) => {
  const menu = new InlineKeyboard();

  const text =
    "به ربات تلگرام شعرهای فارسی خوش آمدید. در این ربات، شما می توانید شعر های زیبای مولانا را بخوانید.";

  menu.text("اشعار مولانا", "moulavi_poems:fa").row();
  menu.text("درباره مولانا", "moulavi_bio:fa").row();
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

const createMoulavi = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage" = "replyMessage"
) => {
  const newMenu = new InlineKeyboard()

    .text("شمس", "moulavi_shams_menu")
    .row()
    .text("مثنوی", "moulavi_masnavi_menu")
    .row()

    .text("بازگشت", "go-back-to-moulavi-list");

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

const createMoulaviShamsMenu = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage" = "replyMessage"
) => {
  const newMenu = new InlineKeyboard()

    .text("غزلیات", "moulavi_shams:ghazalsh")
    .row()
    .text("مستدرکات", "moulavi_shams:mostadrakat")
    .row()
    .text("ترجیعات", "moulavi_shams:tarjeeat")
    .row()
    .text("رباعیات", "moulavi_shams:robaeesh")
    .row()

    .text("بازگشت", "go-back-to-moulavi-list");

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

const createMoulaviMasnaviMenu = (
  ctx: Context,
  editOrReply: "editMessage" | "replyMessage" = "replyMessage"
) => {
  const newMenu = new InlineKeyboard()

    .text("دفتر اول", "moulavi_masnavi:daftar1")
    .row()
    .text("دفتر دوم", "moulavi_masnavi:daftar2")
    .row()
    .text("دفتر سوم", "moulavi_masnavi:daftar3")
    .row()
    .text("دفتر چهارم", "moulavi_masnavi:daftar4")
    .row()
    .text("دفتر پنجم", "moulavi_masnavi:daftar5")
    .row()
    .text("دفتر ششم", "moulavi_masnavi:daftar6")
    .row()

    .text("بازگشت", "go-back-to-moulavi-list");

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

const addmoulaviFaCallbacks = () => {
  // callbacks
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_page:(.+)/,
    async (ctx) => {
      const pageNum = parseInt(ctx.match[1]);
      saveAnalyticsEvent(ctx, `moulavi_page:${pageNum}`);

      const type = ctx.callbackQuery.data.split(":")[2];
      const htmlPage = await fetchHtmlPageFromGanjoor("moulavi", type);
      const list = await getPoems(htmlPage);

      showPage(list, ctx, pageNum, "editMessage", type);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_poems_select_fa:(.+)/,
    async (ctx) => {
      const itemLink = ctx.match[1];
      const type = ctx.match[1].split("/moulavi/")[1];
      saveAnalyticsEvent(ctx, `moulavi_poems_select_fa:${type}`);

      const htmlPage = await fetchHtmlPageFromGanjoor("moulavi", type);
      const poemText = await extractPoemsText(htmlPage);

      const indexPath = ganjoorIndexPathFromPoemLink("moulavi", itemLink);
      let listNav: PoemListNav | undefined;
      let poemTitle: string | undefined;
      if (indexPath) {
        const listPage = await fetchHtmlPageFromGanjoor("moulavi", indexPath);
        const list = await getPoems(listPage);
        const listIndex = list.findIndex((x: { link: string }) => x.link === itemLink);
        if (listIndex !== -1 && list.length > 1) {
          poemTitle = list[listIndex]?.text;
          listNav = {
            author: "moulavi",
            indexPath,
            listIndex,
            listLength: list.length,
            backCallback: "moulavi_poems:fa",
            poetLabel: "مولانا",
          };
        }
      }

      await showPoem(ctx, poemText, itemLink, poemTitle, listNav);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_shams_menu/,
    async (ctx) => {
      return createMoulaviShamsMenu(ctx);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_masnavi_menu/,
    async (ctx) => {
      return createMoulaviMasnaviMenu(ctx);
    }
  );

  // shams page

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_shams:ghazalsh/,
    async (ctx) => {
      console.log("asdasdsads", ctx);
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "shams/ghazalsh"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "moulavi_shams:ghazalsh");

      showPage(list, ctx, 0, "editMessage", "shams/ghazalsh");
    }
  );
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_shams:mostadrakat/,
    async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "shams/mostadrakat"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "moulavi_shams:mostadrakat");

      showPage(list, ctx, 0, "editMessage", "shams/mostadrakat");
    }
  );
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_shams:tarjeeat/,
    async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "shams/tarjeeat"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "moulavi_shams:tarjeeat");

      showPage(list, ctx, 0, "editMessage", "shams/tarjeeat");
    }
  );
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_shams:robaeesh/,
    async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "shams/robaeesh"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "moulavi_shams:robaeesh");

      showPage(list, ctx, 0, "editMessage", "shams/robaeesh");
    }
  );
  // end of shams page

  // shams page

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_masnavi:daftar1/,
    async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "masnavi/daftar1"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "moulavi_shams:masnavi/daftar1");

      showPage(list, ctx, 0, "editMessage", "masnavi/daftar1");
    }
  );
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_masnavi:daftar2/,
    async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "masnavi/daftar2"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "masnavi/daftar2");

      showPage(list, ctx, 0, "editMessage", "masnavi/daftar2");
    }
  );
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_masnavi:daftar3/,
    async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "masnavi/daftar3"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "masnavi/daftar3");

      showPage(list, ctx, 0, "editMessage", "masnavi/daftar3");
    }
  );
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_masnavi:daftar4/,
    async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "masnavi/daftar4"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "masnavi/daftar4");

      showPage(list, ctx, 0, "editMessage", "masnavi/daftar4");
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_masnavi:daftar5/,
    async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "masnavi/daftar5"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "masnavi/daftar5");

      showPage(list, ctx, 0, "editMessage", "masnavi/daftar5");
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_masnavi:daftar6/,
    async (ctx) => {
      const htmlPage = await fetchHtmlPageFromGanjoor(
        "moulavi",
        "masnavi/daftar6"
      );
      const list = await getPoems(htmlPage);
      saveAnalyticsEvent(ctx, "masnavi/daftar6");

      showPage(list, ctx, 0, "editMessage", "masnavi/daftar6");
    }
  );
  // end of shams page

  // bio
  PersianPoemsTelegramBot.bot?.callbackQuery(/moulavi_bio:fa/, async (ctx) => {
    saveAnalyticsEvent(ctx, "moulavi_bio");
    showBio(ctx);
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_poems:fa/,
    async (ctx) => {
      await ctx.answerCallbackQuery();
      saveAnalyticsEvent(ctx, "moulavi_poems:fa");

      return createMoulavi(ctx, poemAwareMenuMode(ctx));
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(/back:fa/, async (ctx) => {
    saveAnalyticsEvent(ctx, "back:fa");

    return createMoulaviMenuFa(ctx, "editMessage");
  });

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /moulavi_main_menu_back_fa/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "moulavi_main_menu_back_fa");

      console.log(ctx);
      return createPoetListFa(ctx);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /go-back-to-moulavi-list/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "go-back-to-moulavi-list");

      console.log(ctx);
      return createMoulaviMenuFa(ctx, "editMessage");
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /back_to_main_moulavi/,
    async (ctx) => {
      saveAnalyticsEvent(ctx, "back_to_main_moulavi");

      console.log(ctx);
      return createMoulaviMenuFa(ctx, "editMessage");
    }
  );
};

export {
  showPoem,
  showPage,
  createMoulaviMenuFa,
  createMoulavi,
  addmoulaviFaCallbacks,
  config,
};
