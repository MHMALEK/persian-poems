import { Context } from "grammy";
import type { User } from "grammy/types";
import mongoose from "mongoose";
import BotUserSchema from "./schema";

const BotUser = mongoose.models.BotUser ?? mongoose.model("BotUser", BotUserSchema);

/**
 * Create or update the user on /start. Safe to call on every start (idempotent).
 * Never touches `dailyDigest`, so re-running /start keeps the user's choice.
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

/** Whether the user has opted in to the daily poem. Missing row or field = off. */
async function isDailyDigestEnabled(telegramId: number): Promise<boolean> {
  const doc = await BotUser.findOne({ telegramId })
    .select("dailyDigest")
    .lean<{ dailyDigest?: boolean } | null>();
  return doc?.dailyDigest === true;
}

/**
 * Turns the daily poem on or off for one user. Upserts so the choice sticks
 * even if the user has no row yet (e.g. they never sent /start). Throws on DB
 * failure so the caller can tell the user the change did not stick.
 */
async function setDailyDigest(from: User, enabled: boolean): Promise<void> {
  await BotUser.updateOne(
    { telegramId: from.id },
    {
      $set: { dailyDigest: enabled, active: true },
      $unset: { deactivatedAt: "", deactivationReason: "" },
      $setOnInsert: {
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        languageCode: from.language_code,
        isBot: from.is_bot ?? false,
      },
    },
    { upsert: true }
  );
}

export {
  BotUser,
  upsertUserOnStart,
  deactivateUser,
  isDailyDigestEnabled,
  setDailyDigest,
};
