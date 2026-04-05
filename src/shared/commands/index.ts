import { Context, InlineKeyboard } from "grammy";
import { createHafezMenuFa } from "../../poets/hafez/fa";
import { createKhayamMenuFa } from "../../poets/khayyam/fa";
import { createMoulaviMenuFa } from "../../poets/molana/fa";
import PersianPoemsTelegramBot from "../../services/telegram-bot";

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

  return ctx.editMessageText("لطفا شاعر مورد نظر خود را انتخاب نمایید.", {
    reply_markup: keyboard,
  });
};

const addSelectPoetCallbacks = () => {
  PersianPoemsTelegramBot.bot?.callbackQuery(
    /select_poet_fa:(.+)/,
    async (ctx) => {
      const poetId = ctx.match[1];

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
    async (ctx) => {
      createPoetListFa(ctx);
    }
  );
};

export {
  addSelectPoetCallbacks,
  createPoetListFa,
  showMainMenu,
};
