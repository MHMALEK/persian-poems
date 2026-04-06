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
    /** Extensible store for future bot preferences. */
    preferences: { type: Schema.Types.Mixed, default: {} },
    /** Starred poems (deduped by `link` in app logic). */
    favorites: [
      {
        link: { type: String, required: true },
        title: { type: String, required: true },
        poetLabel: { type: String, default: "" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: "bot_users" }
);

export default BotUserSchema;
