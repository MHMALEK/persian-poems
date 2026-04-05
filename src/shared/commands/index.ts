import { Context, InlineKeyboard } from "grammy";
import { createHafezMenuFa } from "../../poets/hafez/fa";
import { createKhayamMenuFa } from "../../poets/khayyam/fa";
import { createMoulaviMenuFa } from "../../poets/molana/fa";
import { saveAnalyticsEvent } from "../../services/analytics";
import PersianPoemsTelegramBot from "../../services/telegram-bot";
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
};

/** First screen after /start — new message with poet list */
const showMainMenu = (ctx: Context) => {
  const text =
    "به ربات تلگرام شعر فارسی خوش آمدید. شاعر مورد نظر را انتخاب کنید.";

  const keyboard = new InlineKeyboard();
  Object.values(poets).forEach((poet) => {
    keyboard.text(poet.title, `select_poet_fa:${poet.id}`).row();
  });
  keyboard
    .text("یک شعر رندوم برایم بیاور", "random_poem_fa")
    .row();

  return ctx.reply(text, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
};

/** Return to poet list from an edited inline message */
const createPoetListFa = async (ctx: Context) => {
  const keyboard = new InlineKeyboard();
  Object.values(poets).forEach((poet) => {
    keyboard.text(poet.title, `select_poet_fa:${poet.id}`).row();
  });
  keyboard
    .text("یک شعر رندوم برایم بیاور", "random_poem_fa")
    .row();

  return ctx.editMessageText("لطفا شاعر مورد نظر خود را انتخاب نمایید.", {
    reply_markup: keyboard,
  });
};

const addSelectPoetCallbacks = () => {
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /select_poet_fa:(.+)/,
    async (ctx: Context) => {
      const poetId = ctx.match?.[1];
      if (!poetId) return;

      switch (poetId) {
        case "hafez":
          return createHafezMenuFa(ctx, "editMessage");
        case "saadi":
          return createKhayamMenuFa(ctx, "editMessage");
        case "khayyam":
          return createKhayamMenuFa(ctx, "editMessage");
        case "moulavi":
          return createMoulaviMenuFa(ctx, "editMessage");
        default:
          return createKhayamMenuFa(ctx, "editMessage");
      }
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /back_to_poet_menu_fa/,
    async (ctx: Context) => {
      createPoetListFa(ctx);
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
};

export {
  addSelectPoetCallbacks,
  createPoetListFa,
  showMainMenu,
};
