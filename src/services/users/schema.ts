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
    /** Extensible store for upcoming features (notifications, favorites, etc.) */
    preferences: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "bot_users" }
);

export default BotUserSchema;
