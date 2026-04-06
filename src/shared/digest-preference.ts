import { Context } from "grammy";
import { saveAnalyticsEvent } from "../services/analytics";
import { BotUser, setDailyDigestPreference } from "../services/users";

function readDigestEnabled(
  preferences: unknown
): boolean {
  const p = preferences as { dailyDigest?: boolean } | undefined;
  return p?.dailyDigest !== false;
}

/**
 * Sets daily-digest preference from an inline callback. Answers exactly once.
 * @param analyticsOnChange — event name when preference actually changes (default: digest_pref_on_fa / digest_pref_off_fa)
 */
async function answerDigestPreferenceCallback(
  ctx: Context,
  wantEnabled: boolean,
  analyticsOnChange?: string
): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const u = await BotUser.findOne({ telegramId: from.id }).lean();
  if (!u) {
    await ctx.answerCallbackQuery({
      text: "ابتدا /start را بزنید تا در ربات ثبت شوید.",
      show_alert: true,
    });
    return;
  }

  const currentlyEnabled = readDigestEnabled(u.preferences);

  if (currentlyEnabled === wantEnabled) {
    await ctx.answerCallbackQuery({
      text: wantEnabled
        ? "الان هم ارسال خودکار شعر روزانه برای شما روشن است."
        : "الان هم ارسال خودکار شعر روزانه برای شما خاموش است.",
    });
    return;
  }

  await setDailyDigestPreference(from.id, wantEnabled);
  const event =
    analyticsOnChange ??
    (wantEnabled ? "digest_pref_on_fa" : "digest_pref_off_fa");
  saveAnalyticsEvent(ctx, event);
  await ctx.answerCallbackQuery({
    text: wantEnabled
      ? "✅ از این پس در صورت فعال بودن سرور، شعر روزانه برای شما فرستاده می‌شود."
      : "✅ ارسال خودکار شعر روزانه متوقف شد. با دکمهٔ «روشن» یا /digest_on می‌توانید دوباره فعال کنید.",
  });
}

export { answerDigestPreferenceCallback, readDigestEnabled };
