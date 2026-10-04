import { Context, InlineKeyboard } from "grammy";
import type { InlineKeyboardButton, User } from "grammy/types";
import { getDailyDigestSchedule } from "../jobs/daily-digest";
import { saveAnalyticsEvent } from "../services/analytics";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import {
  getDailySettings,
  setDailyDigest,
  setDailyFal,
  setDailyPoets,
  type DailySettings,
} from "../services/users";
import {
  DAILY_DIGEST_MENU_CALLBACK,
  DAILY_DIGEST_OFF_BUTTON_LABEL,
  DAILY_DIGEST_OFF_CALLBACK,
  DAILY_DIGEST_OFF_INLINE_CALLBACK,
  DAILY_DIGEST_ON_BUTTON_LABEL,
  DAILY_DIGEST_ON_CALLBACK,
  DAILY_FAL_OFF_BUTTON_LABEL,
  DAILY_FAL_OFF_CALLBACK,
  DAILY_FAL_OFF_INLINE_CALLBACK,
  DAILY_FAL_ON_BUTTON_LABEL,
  DAILY_FAL_ON_CALLBACK,
  DAILY_POET_TOGGLE_PREFIX,
  DAILY_POETS_ALL_CALLBACK,
  DAILY_POETS_MENU_CALLBACK,
} from "./daily-digest-callbacks";
import { MAIN_MENU_BACK_CALLBACK } from "./main-menu-keyboard";
import { editMessageOrReply } from "./menu-delivery";
import { POET_POOL } from "./poet-pool";

const ALL_POET_IDS = POET_POOL.map((p) => p.author);

const TOGGLE_FAILED_TEXT =
  "متأسفانه ذخیرهٔ تنظیم با خطا مواجه شد. لطفاً دوباره تلاش کنید.";

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

function poetLabel(id: string): string {
  return POET_POOL.find((p) => p.author === id)?.labelFa ?? id;
}

function validPoets(poets: string[]): string[] {
  return poets.filter((p) => ALL_POET_IDS.includes(p));
}

function poetsLabel(poets: string[]): string {
  const valid = validPoets(poets);
  return valid.length === 0 ? "همهٔ شاعران" : valid.map(poetLabel).join("، ");
}

function onOff(enabled: boolean): string {
  return enabled ? "روشن ✅" : "خاموش";
}

function buildSettingsText(s: DailySettings): string {
  return (
    "<b>شعر روزانه و فال حافظ</b>\n\n" +
    `${scheduleLabelFa()} برایتان فرستاده می‌شود. هر دو به‌صورت پیش‌فرض خاموش‌اند و هر وقت بخواهید می‌توانید روشن یا خاموششان کنید.\n\n` +
    `• شعر روزانه: <b>${onOff(s.dailyDigest)}</b>\n` +
    `   شاعران: ${poetsLabel(s.dailyPoets)}\n` +
    `• فال روزانهٔ حافظ: <b>${onOff(s.dailyFal)}</b>`
  );
}

function buildSettingsKeyboard(s: DailySettings): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (s.dailyDigest) {
    kb.text(DAILY_DIGEST_OFF_BUTTON_LABEL, DAILY_DIGEST_OFF_CALLBACK).row();
  } else {
    kb.text(DAILY_DIGEST_ON_BUTTON_LABEL, DAILY_DIGEST_ON_CALLBACK).row();
  }
  kb.text("انتخاب شاعران شعر روزانه", DAILY_POETS_MENU_CALLBACK).row();
  if (s.dailyFal) {
    kb.text(DAILY_FAL_OFF_BUTTON_LABEL, DAILY_FAL_OFF_CALLBACK).row();
  } else {
    kb.text(DAILY_FAL_ON_BUTTON_LABEL, DAILY_FAL_ON_CALLBACK).row();
  }
  kb.text("بازگشت", MAIN_MENU_BACK_CALLBACK);
  return kb;
}

function buildPoetsText(poets: string[]): string {
  return (
    "<b>شاعران شعر روزانه</b>\n\n" +
    "روی یک شاعر بزنید تا شعر روزانه فقط از او باشد؛ دوباره بزنید تا اضافه یا کم شود. «همهٔ شاعران» انتخاب را پاک می‌کند.\n\n" +
    `انتخاب فعلی: <b>${poetsLabel(poets)}</b>`
  );
}

function buildPoetsKeyboard(poets: string[]): InlineKeyboard {
  const selected = new Set(validPoets(poets));
  const kb = new InlineKeyboard();
  POET_POOL.forEach((p, i) => {
    const mark = selected.has(p.author) ? "✅ " : "";
    kb.text(`${mark}${p.labelFa}`, `${DAILY_POET_TOGGLE_PREFIX}${p.author}`);
    if (i % 2 === 1) kb.row();
  });
  if (POET_POOL.length % 2 === 1) kb.row();
  kb.text("همهٔ شاعران", DAILY_POETS_ALL_CALLBACK).row();
  kb.text("بازگشت به تنظیمات", DAILY_DIGEST_MENU_CALLBACK);
  return kb;
}

/** Empty = all. From "all", tapping narrows to that poet; otherwise toggles it; removing the last one is back to all. */
function nextPoets(current: string[], tapped: string): string[] {
  const valid = validPoets(current);
  if (valid.length === 0) return [tapped];
  if (valid.includes(tapped)) return valid.filter((p) => p !== tapped);
  return [...valid, tapped];
}

/** Shows the on/off screen; edits in place from a callback, replies from a command. */
async function showDailyDigestSettings(ctx: Context): Promise<void> {
  const s = ctx.from
    ? await getDailySettings(ctx.from.id)
    : { dailyDigest: false, dailyFal: false, dailyPoets: [] };
  await editMessageOrReply(ctx, buildSettingsText(s), {
    reply_markup: buildSettingsKeyboard(s),
    parse_mode: "HTML",
  });
}

async function showPoetsPicker(ctx: Context): Promise<void> {
  const s = ctx.from
    ? await getDailySettings(ctx.from.id)
    : { dailyDigest: false, dailyFal: false, dailyPoets: [] };
  await editMessageOrReply(ctx, buildPoetsText(s.dailyPoets), {
    reply_markup: buildPoetsKeyboard(s.dailyPoets),
    parse_mode: "HTML",
  });
}

/**
 * Drops one inline button from the poem the user tapped on, leaving the poem
 * text and its other buttons untouched. Best-effort.
 */
async function removeInlineButton(ctx: Context, callbackData: string): Promise<void> {
  const rows = ctx.callbackQuery?.message?.reply_markup?.inline_keyboard;
  if (!rows) return;
  const kept: InlineKeyboardButton[][] = rows
    .map((row) =>
      row.filter(
        (b) => !("callback_data" in b) || b.callback_data !== callbackData
      )
    )
    .filter((row) => row.length > 0);
  try {
    await ctx.editMessageReplyMarkup({
      reply_markup: { inline_keyboard: kept },
    });
  } catch (e) {
    console.warn("daily digest: could not strip inline button", e);
  }
}

function callbackUser(ctx: Context): User | undefined {
  return ctx.callbackQuery?.from ?? ctx.from;
}

/** Persists one change; answers the callback with a toast (or an alert on failure). */
async function applyChange(
  ctx: Context,
  event: string,
  toast: string,
  write: (from: User) => Promise<void>
): Promise<boolean> {
  const from = callbackUser(ctx);
  if (!from) return false;
  try {
    await write(from);
  } catch (e) {
    console.error("daily digest: settings write failed", from.id, event, e);
    await ctx.answerCallbackQuery({ text: "خطا در ذخیرهٔ تنظیم", show_alert: true });
    return false;
  }
  saveAnalyticsEvent(ctx, event);
  await ctx.answerCallbackQuery({ text: toast });
  return true;
}

async function replySettingsAfterInlineOff(ctx: Context, callbackData: string): Promise<void> {
  await removeInlineButton(ctx, callbackData);
  const from = callbackUser(ctx);
  const s = from
    ? await getDailySettings(from.id)
    : { dailyDigest: false, dailyFal: false, dailyPoets: [] };
  await ctx.reply(buildSettingsText(s), {
    reply_markup: buildSettingsKeyboard(s),
    parse_mode: "HTML",
  });
}

function addDailyDigestCallbacks(): void {
  const bot = PersianPoemsTelegramBot.bot;

  bot.callbackQuery(DAILY_DIGEST_MENU_CALLBACK, async (ctx) => {
    await ctx.answerCallbackQuery();
    saveAnalyticsEvent(ctx, "daily_digest_menu");
    await showDailyDigestSettings(ctx);
  });

  bot.callbackQuery(DAILY_DIGEST_ON_CALLBACK, async (ctx) => {
    if (
      await applyChange(ctx, "daily_digest_on", "شعر روزانه روشن شد ✅", (from) =>
        setDailyDigest(from, true)
      )
    ) {
      await showDailyDigestSettings(ctx);
    }
  });

  bot.callbackQuery(DAILY_DIGEST_OFF_CALLBACK, async (ctx) => {
    if (
      await applyChange(ctx, "daily_digest_off", "شعر روزانه خاموش شد", (from) =>
        setDailyDigest(from, false)
      )
    ) {
      await showDailyDigestSettings(ctx);
    }
  });

  bot.callbackQuery(DAILY_FAL_ON_CALLBACK, async (ctx) => {
    if (
      await applyChange(ctx, "daily_fal_on", "فال روزانه روشن شد ✅", (from) =>
        setDailyFal(from, true)
      )
    ) {
      await showDailyDigestSettings(ctx);
    }
  });

  bot.callbackQuery(DAILY_FAL_OFF_CALLBACK, async (ctx) => {
    if (
      await applyChange(ctx, "daily_fal_off", "فال روزانه خاموش شد", (from) =>
        setDailyFal(from, false)
      )
    ) {
      await showDailyDigestSettings(ctx);
    }
  });

  bot.callbackQuery(DAILY_POETS_MENU_CALLBACK, async (ctx) => {
    await ctx.answerCallbackQuery();
    saveAnalyticsEvent(ctx, "daily_poets_menu");
    await showPoetsPicker(ctx);
  });

  bot.callbackQuery(
    new RegExp(`^${DAILY_POET_TOGGLE_PREFIX}(.+)$`),
    async (ctx) => {
      const tapped = ctx.match?.[1];
      const from = callbackUser(ctx);
      if (!tapped || !ALL_POET_IDS.includes(tapped) || !from) {
        await ctx.answerCallbackQuery({ text: "شاعر نامعتبر" });
        return;
      }
      const current = (await getDailySettings(from.id)).dailyPoets;
      const next = nextPoets(current, tapped);
      const toast = next.length === 0 ? "همهٔ شاعران" : poetsLabel(next);
      if (
        await applyChange(ctx, "daily_poets_set", toast, (u) =>
          setDailyPoets(u, next)
        )
      ) {
        await showPoetsPicker(ctx);
      }
    }
  );

  bot.callbackQuery(DAILY_POETS_ALL_CALLBACK, async (ctx) => {
    const from = callbackUser(ctx);
    if (!from) return;
    const current = validPoets((await getDailySettings(from.id)).dailyPoets);
    if (current.length === 0) {
      await ctx.answerCallbackQuery({ text: "همهٔ شاعران از قبل انتخاب‌اند" });
      return;
    }
    if (
      await applyChange(ctx, "daily_poets_set", "همهٔ شاعران", (u) =>
        setDailyPoets(u, [])
      )
    ) {
      await showPoetsPicker(ctx);
    }
  });

  bot.callbackQuery(DAILY_DIGEST_OFF_INLINE_CALLBACK, async (ctx) => {
    if (
      !(await applyChange(ctx, "daily_digest_off_inline", "شعر روزانه خاموش شد", (from) =>
        setDailyDigest(from, false)
      ))
    ) {
      await ctx.reply(TOGGLE_FAILED_TEXT);
      return;
    }
    await replySettingsAfterInlineOff(ctx, DAILY_DIGEST_OFF_INLINE_CALLBACK);
  });

  bot.callbackQuery(DAILY_FAL_OFF_INLINE_CALLBACK, async (ctx) => {
    if (
      !(await applyChange(ctx, "daily_fal_off_inline", "فال روزانه خاموش شد", (from) =>
        setDailyFal(from, false)
      ))
    ) {
      await ctx.reply(TOGGLE_FAILED_TEXT);
      return;
    }
    await replySettingsAfterInlineOff(ctx, DAILY_FAL_OFF_INLINE_CALLBACK);
  });
}

export { addDailyDigestCallbacks, nextPoets, showDailyDigestSettings };
