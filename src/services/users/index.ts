import { Context } from "grammy";
import type { User } from "grammy/types";
import mongoose from "mongoose";
import BotUserSchema from "./schema";

const BotUser = mongoose.models.BotUser ?? mongoose.model("BotUser", BotUserSchema);

export type DailySettings = {
  dailyDigest: boolean;
  dailyFal: boolean;
  /** Empty = all poets. */
  dailyPoets: string[];
};

/**
 * Create or update the user on /start. Safe to call on every start (idempotent).
 * Never touches the daily* preferences, so re-running /start keeps the user's choices.
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

/**
 * Writes preference fields for one user. Upserts so the choice sticks even if
 * the user has no row yet (e.g. they never sent /start); a user changing a
 * setting is reachable, so they are reactivated too. Throws on DB failure so
 * the caller can tell the user the change did not stick.
 */
async function upsertUserFields(
  from: User,
  fields: Record<string, unknown>
): Promise<void> {
  await BotUser.updateOne(
    { telegramId: from.id },
    {
      $set: { ...fields, active: true },
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

/** Daily-poem preferences for one user. Missing row or fields = everything off, all poets. */
async function getDailySettings(telegramId: number): Promise<DailySettings> {
  const doc = await BotUser.findOne({ telegramId })
    .select("dailyDigest dailyFal dailyPoets")
    .lean<{ dailyDigest?: boolean; dailyFal?: boolean; dailyPoets?: string[] } | null>();
  return {
    dailyDigest: doc?.dailyDigest === true,
    dailyFal: doc?.dailyFal === true,
    dailyPoets: Array.isArray(doc?.dailyPoets) ? doc.dailyPoets : [],
  };
}

async function isDailyDigestEnabled(telegramId: number): Promise<boolean> {
  return (await getDailySettings(telegramId)).dailyDigest;
}

async function setDailyDigest(from: User, enabled: boolean): Promise<void> {
  await upsertUserFields(from, { dailyDigest: enabled });
}

async function setDailyFal(from: User, enabled: boolean): Promise<void> {
  await upsertUserFields(from, { dailyFal: enabled });
}

/** `poets` empty = all poets. */
async function setDailyPoets(from: User, poets: string[]): Promise<void> {
  await upsertUserFields(from, { dailyPoets: poets });
}

export {
  BotUser,
  upsertUserOnStart,
  deactivateUser,
  getDailySettings,
  isDailyDigestEnabled,
  setDailyDigest,
  setDailyFal,
  setDailyPoets,
};
