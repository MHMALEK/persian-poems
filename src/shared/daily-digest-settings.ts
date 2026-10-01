import { Context, InlineKeyboard } from "grammy";
import type { InlineKeyboardButton } from "grammy/types";
import { getDailyDigestSchedule } from "../jobs/daily-digest";
import { saveAnalyticsEvent } from "../services/analytics";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import { isDailyDigestEnabled, setDailyDigest } from "../services/users";
import {
  DAILY_DIGEST_MENU_CALLBACK,
  DAILY_DIGEST_OFF_BUTTON_LABEL,
  DAILY_DIGEST_OFF_CALLBACK,
  DAILY_DIGEST_OFF_INLINE_CALLBACK,
  DAILY_DIGEST_ON_BUTTON_LABEL,
  DAILY_DIGEST_ON_CALLBACK,
} from "./daily-digest-callbacks";
import { MAIN_MENU_BACK_CALLBACK } from "./main-menu-keyboard";
import { editMessageOrReply } from "./menu-delivery";

const TOGGLE_FAILED_TEXT =
  "متأسفانه ذخیرهٔ تنظیم شعر روزانه با خطا مواجه شد. لطفاً دوباره تلاش کنید.";

function toFaDigits(s: string): string {
  return s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d);
}

function scheduleLabelFa(): string {
  const schedule = getDailyDigestSchedule();
  if (!schedule) return "هر روز صبح";
  const hh = String(schedule.hour).padStart(2, "0");
  const mm = String(schedule.minute).padStart(2, "0");
  return `هر روز ساعت ${toFaDigits(`${hh}:${mm}`)} به وقت تهران`;
}

function buildSettingsText(enabled: boolean): string {
  const status = enabled ? "روشن ✅" : "خاموش";
  return (
    "<b>شعر روزانه</b>\n\n" +
    `${scheduleLabelFa()} یک شعر تصادفی از شاعران گنجور برایتان فرستاده می‌شود.\n` +
    "این قابلیت به‌صورت پیش‌فرض خاموش است و هر وقت بخواهید می‌توانید آن را روشن یا خاموش کنید.\n\n" +
    `وضعیت فعلی: <b>${status}</b>`
  );
}

function buildSettingsKeyboard(enabled: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (enabled) {
    kb.text(DAILY_DIGEST_OFF_BUTTON_LABEL, DAILY_DIGEST_OFF_CALLBACK).row();
  } else {
    kb.text(DAILY_DIGEST_ON_BUTTON_LABEL, DAILY_DIGEST_ON_CALLBACK).row();
  }
  kb.text("بازگشت", MAIN_MENU_BACK_CALLBACK);
  return kb;
}

/** Shows the on/off screen; edits in place from a callback, replies from a command. */
async function showDailyDigestSettings(ctx: Context): Promise<void> {
  const enabled = ctx.from ? await isDailyDigestEnabled(ctx.from.id) : false;
  await editMessageOrReply(ctx, buildSettingsText(enabled), {
    reply_markup: buildSettingsKeyboard(enabled),
    parse_mode: "HTML",
  });
}

/**
 * Drops the inline «خاموش کردن» button from the daily poem the user tapped on,
 * leaving the poem text and its other buttons untouched. Best-effort.
 */
async function removeInlineOffButton(ctx: Context): Promise<void> {
  const rows = ctx.callbackQuery?.message?.reply_markup?.inline_keyboard;
  if (!rows) return;
  const kept: InlineKeyboardButton[][] = rows
    .map((row) =>
      row.filter(
        (b) =>
          !("callback_data" in b) ||
          b.callback_data !== DAILY_DIGEST_OFF_INLINE_CALLBACK
      )
    )
    .filter((row) => row.length > 0);
  try {
    await ctx.editMessageReplyMarkup({
      reply_markup: { inline_keyboard: kept },
    });
  } catch (e) {
    console.warn("daily digest: could not strip inline off button", e);
  }
}

async function applyToggle(
  ctx: Context,
  enabled: boolean,
  event: string
): Promise<boolean> {
  const from = ctx.callbackQuery?.from ?? ctx.from;
  if (!from) return false;
  try {
    await setDailyDigest(from, enabled);
  } catch (e) {
    console.error("daily digest: toggle failed", from.id, e);
    await ctx.answerCallbackQuery({ text: "خطا در ذخیرهٔ تنظیم", show_alert: true });
    return false;
  }
  saveAnalyticsEvent(ctx, event);
  await ctx.answerCallbackQuery({
    text: enabled ? "شعر روزانه روشن شد ✅" : "شعر روزانه خاموش شد",
  });
  return true;
}

function addDailyDigestCallbacks(): void {
  const bot = PersianPoemsTelegramBot.bot;

  bot.callbackQuery(DAILY_DIGEST_MENU_CALLBACK, async (ctx) => {
    await ctx.answerCallbackQuery();
    saveAnalyticsEvent(ctx, "daily_digest_menu");
    await showDailyDigestSettings(ctx);
  });

  bot.callbackQuery(DAILY_DIGEST_ON_CALLBACK, async (ctx) => {
    if (await applyToggle(ctx, true, "daily_digest_on")) {
      await showDailyDigestSettings(ctx);
    }
  });

  bot.callbackQuery(DAILY_DIGEST_OFF_CALLBACK, async (ctx) => {
    if (await applyToggle(ctx, false, "daily_digest_off")) {
      await showDailyDigestSettings(ctx);
    }
  });

  bot.callbackQuery(DAILY_DIGEST_OFF_INLINE_CALLBACK, async (ctx) => {
    if (!(await applyToggle(ctx, false, "daily_digest_off_inline"))) {
      await ctx.reply(TOGGLE_FAILED_TEXT);
      return;
    }
    await removeInlineOffButton(ctx);
    await ctx.reply(buildSettingsText(false), {
      reply_markup: buildSettingsKeyboard(false),
      parse_mode: "HTML",
    });
  });
}

export { addDailyDigestCallbacks, showDailyDigestSettings };
