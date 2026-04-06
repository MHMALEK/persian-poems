import { Context } from "grammy";
import { createFerdousiMenuFa } from "../../poets/ferdousi/fa";
import { createHafezMenuFa } from "../../poets/hafez/fa";
import { createKhayamMenuFa } from "../../poets/khayyam/fa";
import { createMoulaviMenuFa } from "../../poets/molana/fa";
import { createNezamiMenuFa } from "../../poets/nezami/fa";
import { createSaadiMenuFa } from "../../poets/saadi/fa";
import { saveAnalyticsEvent } from "../../services/analytics";
import PersianPoemsTelegramBot from "../../services/telegram-bot";
import { answerDigestPreferenceCallback } from "../digest-preference";
import { buildMainKeyboard } from "../main-menu-keyboard";
import { shouldSendMenuAsNewMessage } from "../menu-delivery";
import { renderRandomPoemReply, selectAndRenderRandomPoem } from "../random-poem";
import { replyPoemChunks } from "../send-poem-message";

/** Shared intro for /start and «منوی اصلی» (HTML). */
const MAIN_MENU_INTRO_HTML =
  "<b>به ربات شعر فارسی خوش آمدید.</b>\n\n" +
  "متن شعرها از <b>گنجور</b> خوانده می‌شود. زیر هر شعر می‌توانید همان صفحه را در وب باز کنید، با ستاره در «علاقه‌مندی‌ها» ذخیره کنید و با دکمه‌های پایین شعر بین بخش‌ها جابه‌جا شوید.\n\n" +
  "• <b>شاعران</b> — فهرست آثار هر شاعر\n" +
  "• <b>یک شعر تصادفی</b> — از چند شاعر در یک مجموعه\n" +
  "• <b>علاقه‌مندی‌ها / آخرین شعری که خوانده‌اید</b> — بعد از ثبت با /start در حساب شما نگه داشته می‌شود\n" +
  "• <b>شعر روزانهٔ خودکار</b> — اگر سرور فعال باشد، روزی یک شعر می‌فرستد؛ با دکمه‌های <b>روشن / خاموش</b> پایین منو یا دستورات /digest_on و /digest_off کنترل کنید\n\n" +
  "یک شاعر را انتخاب کنید:";

/** First screen after /start — new message with poet list */
const showMainMenu = (ctx: Context) => {
  return ctx.reply(MAIN_MENU_INTRO_HTML, {
    reply_markup: buildMainKeyboard(),
    parse_mode: "HTML",
  });
};

/** Return to main poet list — new message if the callback was on a poem (keeps poem text). */
const createPoetListFa = async (ctx: Context) => {
  const opts = {
    reply_markup: buildMainKeyboard(),
    parse_mode: "HTML" as const,
  };
  if (shouldSendMenuAsNewMessage(ctx)) {
    return ctx.reply(MAIN_MENU_INTRO_HTML, opts);
  }
  return ctx.editMessageText(MAIN_MENU_INTRO_HTML, opts);
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
      await answerDigestPreferenceCallback(ctx, false, "digest_disable_fa");
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^digest_pref_on_fa$/,
    async (ctx: Context) => {
      await answerDigestPreferenceCallback(ctx, true);
    }
  );

  PersianPoemsTelegramBot.bot?.callbackQuery(
    /^digest_pref_off_fa$/,
    async (ctx: Context) => {
      await answerDigestPreferenceCallback(ctx, false);
    }
  );
};

export {
  addSelectPoetCallbacks,
  createPoetListFa,
  showMainMenu,
};
