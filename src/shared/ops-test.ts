import { alertAdmins } from "../services/admin-alerts";
import { pingDailyDigest } from "../services/heartbeat";
import PersianPoemsTelegramBot from "../services/telegram-bot";
import { isAdmin } from "./admin";

const SCENARIOS = ["handler_error", "rejection", "exception", "daily_fail", "alert"] as const;
type Scenario = (typeof SCENARIOS)[number];

/** Only where `OPS_TEST_COMMANDS=true` (staging deploy); admins only even then. */
function opsTestEnabled(): boolean {
  return process.env.OPS_TEST_COMMANDS === "true";
}

function addOpsTestCommand(): void {
  PersianPoemsTelegramBot.addCommandEventListener("ops_test", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    if (!opsTestEnabled()) {
      await ctx.reply("ops_test فقط روی staging فعال است (OPS_TEST_COMMANDS=true).");
      return;
    }
    const arg = typeof ctx.match === "string" ? ctx.match.trim() : "";
    if (!(SCENARIOS as readonly string[]).includes(arg)) {
      await ctx.reply(`سناریوها: ${SCENARIOS.join(", ")}`);
      return;
    }
    switch (arg as Scenario) {
      case "handler_error":
        await ctx.reply(
          "خطا داخل هندلر پرتاب می‌شود. انتظار: پیام خطای کاربر + DM هشدار؛ بات بالا می‌ماند."
        );
        throw new Error("ops_test: handler_error");
      case "rejection":
        await ctx.reply(
          "unhandledRejection تا ۱ ثانیه دیگر. انتظار: DM «بات کرش کرد»، پینگ /fail، خروج، ری‌استارت توسط Docker (~۱۰ تا ۲۰ ثانیه)."
        );
        setTimeout(() => {
          void Promise.reject(new Error("ops_test: unhandledRejection"));
        }, 1000);
        return;
      case "exception":
        await ctx.reply(
          "uncaughtException تا ۱ ثانیه دیگر. انتظار: همان مسیر کرش و ری‌استارت."
        );
        setTimeout(() => {
          throw new Error("ops_test: uncaughtException");
        }, 1000);
        return;
      case "daily_fail":
        await pingDailyDigest(false, "ops_test: simulated daily-run failure");
        await ctx.reply("پینگ /fail برای چک daily فرستاده شد (اگر HEALTHCHECKS_DAILY_PING_URL ست باشد).");
        return;
      case "alert":
        await alertAdmins(
          PersianPoemsTelegramBot.bot,
          "تست هشدار ادمین",
          new Error("ops_test: alert"),
          "manual"
        );
        await ctx.reply("DM تست فرستاده شد (مگر همین را در ۱۰ دقیقهٔ اخیر زده باشی).");
        return;
    }
  });
}

export { addOpsTestCommand };
