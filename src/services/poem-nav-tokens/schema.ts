import mongoose from "mongoose";

const { Schema } = mongoose;

/** Short-lived context for ◀ / ▶ navigation within one Ganjoor index list. */
const PoemNavTokenSchema = new Schema(
  {
    author: { type: String, required: true },
    indexPath: { type: String, required: true },
    listIndex: { type: Number, required: true },
    backCallback: { type: String, required: true },
    poetLabel: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 },
  },
  { collection: "poem_nav_tokens" }
);

export default PoemNavTokenSchema;
