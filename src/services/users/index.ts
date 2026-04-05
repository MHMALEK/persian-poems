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
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("upsertUserOnStart failed", err);
  }
}

export { BotUser, upsertUserOnStart };
