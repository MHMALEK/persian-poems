import { Context } from "grammy";
import { createFerdousiMenuFa } from "../../poets/ferdousi/fa";
import { createHafezMenuFa } from "../../poets/hafez/fa";
import { createKhayamMenuFa } from "../../poets/khayyam/fa";
import { createMoulaviMenuFa } from "../../poets/molana/fa";
import { createNezamiMenuFa } from "../../poets/nezami/fa";
import { createSaadiMenuFa } from "../../poets/saadi/fa";
import { saveAnalyticsEvent } from "../../services/analytics";
import PersianPoemsTelegramBot from "../../services/telegram-bot";
import { BotUser, setDailyDigestPreference } from "../../services/users";
import { buildMainKeyboard } from "../main-menu-keyboard";
import { renderRandomPoemReply, selectAndRenderRandomPoem } from "../random-poem";
import { replyPoemChunks } from "../send-poem-message";

/** First screen after /start — new message with poet list */
const showMainMenu = (ctx: Context) => {
  const text =
    "به ربات تلگرام شعر فارسی خوش آمدید. شاعر مورد نظر را انتخاب کنید.\n\nبرای قطع یا وصل ارسال خودکار شعر روزانه، دکمهٔ پایین منو را بزنید (یا /digest_off و /digest_on).";

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
    /^random_poem_more_fa$/,
    async (ctx: Context) => {
      await ctx.answerCallbackQuery();
      saveAnalyticsEvent(ctx, "random_poem_more_fa");
      const out = await renderRandomPoemReply(ctx);
      if (out) {
        await replyPoemChunks(ctx, out.chunks, out.keyboard);
      } else {
        await ctx.reply(
          "متأسفانه دریافت شعر تصادفی با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
          { reply_markup: buildMainKeyboard() }
        );
      }
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^digest_disable_fa$/,
    async (ctx: Context) => {
      await ctx.answerCallbackQuery({
        text: "ارسال شعر روزانه خاموش شد. با /digest_on دوباره فعال کنید.",
      });
      saveAnalyticsEvent(ctx, "digest_disable_fa");
      const from = ctx.from;
      if (!from) return;
      await setDailyDigestPreference(from.id, false);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^digest_toggle_fa$/,
    async (ctx: Context) => {
      const from = ctx.from;
      if (!from) return;

      const u = await BotUser.findOne({ telegramId: from.id }).lean();
      if (!u) {
        await ctx.answerCallbackQuery({
          text: "ابتدا /start را بزنید تا در ربات ثبت شوید.",
        });
        return;
      }

      const enabled =
        (u.preferences as { dailyDigest?: boolean } | undefined)
          ?.dailyDigest !== false;
      const next = !enabled;
      await setDailyDigestPreference(from.id, next);
      saveAnalyticsEvent(ctx, "digest_toggle_fa");
      await ctx.answerCallbackQuery({
        text: next
          ? "ارسال خودکار شعر روزانه برای شما فعال شد."
          : "ارسال خودکار شعر روزانه خاموش شد.",
      });
    }
  );
};

export {
  addSelectPoetCallbacks,
  createPoetListFa,
  showMainMenu,
};
