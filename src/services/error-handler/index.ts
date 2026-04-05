import { Context, InlineKeyboard } from "grammy";
import * as Sentry from "@sentry/node";

const initSentryForErrorsTracking = () => {
  if (process.env.NODE_ENV === "development") return;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
  });
};

initSentryForErrorsTracking();

const createError = (ctx: Context) => {
  Sentry.captureException(new Error("poem_fetch_failed"));
  const keyboard = new InlineKeyboard();

  keyboard.text("بازگشت", `hafez_poems:fa`);

  ctx.reply("در حال حاضر دریافت شعر ممکن نیست. لطفاً دوباره تلاش کنید.", {
    reply_markup: keyboard,
  });
};

export default createError;
