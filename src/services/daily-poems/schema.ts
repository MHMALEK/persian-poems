import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * One picked poem per (Tehran day, kind, poet). Lets every recipient of the
 * same poet get the same poem, survives restarts, and keeps Ganjoor fetches
 * to one per poet per day. Rows expire after three days.
 */
const DailyPoemSchema = new Schema(
  {
    dateKey: { type: String, required: true },
    kind: { type: String, required: true },
    poetId: { type: String, required: true },
    chunks: { type: [String], required: true },
    poem: {
      link: { type: String, required: true },
      title: { type: String, required: true },
      poetLabel: { type: String, required: true },
      excerpt: { type: String },
    },
    createdAt: { type: Date, default: Date.now, expires: 3 * 24 * 3600 },
  },
  { collection: "daily_poems" }
);

DailyPoemSchema.index({ dateKey: 1, kind: 1, poetId: 1 }, { unique: true });

export default DailyPoemSchema;
