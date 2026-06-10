import { Context } from "grammy";
import mongoose from "mongoose";
import BotUserSchema from "./schema";

const BotUser = mongoose.models.BotUser ?? mongoose.model("BotUser", BotUserSchema);

/**
 * Create or update the user on /start. Safe to call on every start (idempotent).
 */
async function upsertUserOnStart(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  try {
    await BotUser.findOneAndUpdate(
      { telegramId: from.id },
      {
        $set: {
          firstName: from.first_name,
          lastName: from.last_name,
          username: from.username,
          languageCode: from.language_code,
          isBot: from.is_bot ?? false,
          // Anyone interacting with the bot is reachable again — reactivate
          // them so they resume receiving broadcasts.
          active: true,
        },
        $unset: { deactivatedAt: "", deactivationReason: "" },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("upsertUserOnStart failed", err);
  }
}

/**
 * Marks a user as inactive so broadcasts skip them. Called when Telegram tells
 * us the user is unreachable (blocked the bot, deactivated their account, etc.).
 * Idempotent and best-effort — failures are logged, never thrown.
 */
async function deactivateUser(
  telegramId: number,
  reason: string
): Promise<void> {
  try {
    await BotUser.updateOne(
      { telegramId },
      {
        $set: {
          active: false,
          deactivatedAt: new Date(),
          deactivationReason: reason,
        },
      }
    );
  } catch (err) {
    console.error("deactivateUser failed", telegramId, err);
  }
}

export { BotUser, upsertUserOnStart, deactivateUser };
