import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Append-only event log for bot usage (commands, callbacks, navigation).
 */
const AnalyticsEventSchema = new Schema(
  {
    telegramId: { type: Number, required: true, index: true },
    event: { type: String, required: true, index: true },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    languageCode: { type: String },
    isBot: { type: Boolean, default: false },
    /** e.g. private, group, supergroup — useful if the bot is ever used in groups */
    chatType: { type: String },
    /** Optional structured payload (feature flags, A/B, etc.) */
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "analytics_events" }
);

AnalyticsEventSchema.index({ event: 1, createdAt: -1 });
AnalyticsEventSchema.index({ telegramId: 1, createdAt: -1 });

export default AnalyticsEventSchema;
