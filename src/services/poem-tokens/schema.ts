import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Short-lived tokens for inline buttons (Telegram `callback_data` ≤ 64 bytes).
 * Used to pass poem metadata for favorite toggles without stuffing URLs in callbacks.
 */
const PoemTokenSchema = new Schema(
  {
    link: { type: String, required: true },
    title: { type: String, required: true },
    poetLabel: { type: String, default: "" },
    /** Whether the poem was already in favorites when the keyboard was built. */
    favorited: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 3600 },
  },
  { collection: "poem_tokens" }
);

export default PoemTokenSchema;
