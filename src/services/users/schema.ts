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
    /** Extensible store for future bot preferences. */
    preferences: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "bot_users" }
);

export default BotUserSchema;
