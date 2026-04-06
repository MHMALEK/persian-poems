import { Context, InlineKeyboard } from "grammy";
import { createFerdousiMenuFa } from "../../poets/ferdousi/fa";
import { createHafezMenuFa } from "../../poets/hafez/fa";
import { createKhayamMenuFa } from "../../poets/khayyam/fa";
import { createMoulaviMenuFa } from "../../poets/molana/fa";
import { createNezamiMenuFa } from "../../poets/nezami/fa";
import { createSaadiMenuFa } from "../../poets/saadi/fa";
import { saveAnalyticsEvent } from "../../services/analytics";
import PersianPoemsTelegramBot from "../../services/telegram-bot";
import { selectAndRenderDailyPoem } from "../daily-poem";
import { selectAndRenderRandomPoem } from "../random-poem";

const poets: {
  [x: string]: {
    title: string;
    id: string;
  };
} = {
  hafez: {
    title: "حافظ شیرازی",
    id: "hafez",
  },
  khayyam: {
    title: "خیام",
    id: "khayyam",
  },
  moulavi: {
    title: "مولانا",
    id: "moulavi",
  },
  saadi: {
    title: "سعدی",
    id: "saadi",
  },
  ferdousi: {
    title: "فردوسی",
    id: "ferdousi",
  },
  nezami: {
    title: "نظامی",
    id: "nezami",
  },
};

function buildMainKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  Object.values(poets).forEach((poet) => {
    keyboard.text(poet.title, `select_poet_fa:${poet.id}`).row();
  });
  keyboard.text("یک شعر رندوم برایم بیاور", "random_poem_fa").row();
  keyboard
    .text("شعر امروز (شخصی)", "daily_poem_fa")
    .text("علاقه‌مندی‌ها", "fav_list_fa")
    .row();
  keyboard.text("آخرین شعر", "last_read_fa").row();
  return keyboard;
}

/** First screen after /start — new message with poet list */
const showMainMenu = (ctx: Context) => {
  const text =
    "به ربات تلگرام شعر فارسی خوش آمدید. شاعر مورد نظر را انتخاب کنید.";

  return ctx.reply(text, {
    reply_markup: buildMainKeyboard(),
    parse_mode: "HTML",
  });
};

/** Return to poet list from an edited inline message */
const createPoetListFa = async (ctx: Context) => {
  return ctx.editMessageText("لطفا شاعر مورد نظر خود را انتخاب نمایید.", {
    reply_markup: buildMainKeyboard(),
  });
};

const addSelectPoetCallbacks = () => {
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /select_poet_fa:(.+)/,
    async (ctx: Context) => {
      await ctx.answerCallbackQuery();
      const poetId = ctx.match?.[1];
      if (!poetId) return;

      switch (poetId) {
        case "hafez":
          return createHafezMenuFa(ctx, "editMessage");
        case "khayyam":
          return createKhayamMenuFa(ctx, "editMessage");
        case "moulavi":
          return createMoulaviMenuFa(ctx, "editMessage");
        case "saadi":
          return createSaadiMenuFa(ctx, "editMessage");
        case "ferdousi":
          return createFerdousiMenuFa(ctx, "editMessage");
        case "nezami":
          return createNezamiMenuFa(ctx, "editMessage");
        default:
          return createHafezMenuFa(ctx, "editMessage");
      }
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /back_to_poet_menu_fa/,
    async (ctx: Context) => {
      await ctx.answerCallbackQuery();
      await createPoetListFa(ctx);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /random_poem_fa/,
    async (ctx: Context) => {
      saveAnalyticsEvent(ctx, "random_poem_fa");
      await ctx.answerCallbackQuery();
      await selectAndRenderRandomPoem(ctx);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^daily_poem_fa$/,
    async (ctx: Context) => {
      saveAnalyticsEvent(ctx, "daily_poem_fa");
      await ctx.answerCallbackQuery();
      await selectAndRenderDailyPoem(ctx);
    }
  );
};

export {
  addSelectPoetCallbacks,
  createPoetListFa,
  showMainMenu,
};
