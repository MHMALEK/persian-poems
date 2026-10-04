import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Telegram users who have used /start. `preferences` is reserved for future bot features.
 */
const BotUserSchema = new Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String },
    username: { type: String },
    languageCode: { type: String },
    isBot: { type: Boolean, default: false },
    /**
     * Whether the user still receives broadcasts. Set to `false` when the bot
     * detects it can no longer message them (e.g. they blocked the bot). Users
     * are reactivated automatically if they `/start` again.
     */
    active: { type: Boolean, default: true, index: true },
    /** When the user was last deactivated, if applicable. */
    deactivatedAt: { type: Date },
    /** Why the user was deactivated, e.g. the Telegram error description. */
    deactivationReason: { type: String },
    /**
     * Per-user opt-in for the scheduled daily poem. Off by default; the user
     * turns it on from «شعر روزانه» in the main menu or `/daily_poem`.
     * Documents without the field (users from before the opt-in) count as off.
     */
    dailyDigest: { type: Boolean, default: false, index: true },
    /** Poet ids (POET_POOL authors) the daily poem is drawn from. Empty/missing = all poets. */
    dailyPoets: { type: [String], default: undefined },
    /** Per-user opt-in for the daily Hafez fal. Off by default. */
    dailyFal: { type: Boolean, default: false, index: true },
    /** Extensible store for future bot preferences. */
    preferences: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "bot_users" }
);

export default BotUserSchema;
