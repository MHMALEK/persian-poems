import { Context } from "grammy";
import mongoose from "mongoose";
import AnalyticsEventSchema from "./schema";

const AnalyticsEvent =
  mongoose.models.AnalyticsEvent ??
  mongoose.model("AnalyticsEvent", AnalyticsEventSchema);

export type AnalyticsMeta = Record<string, unknown>;

function buildEventPayload(
  ctx: Context,
  event: string,
  meta?: AnalyticsMeta
): Record<string, unknown> | null {
  const from = ctx.from;
  if (!from) return null;

  const payload: Record<string, unknown> = {
    telegramId: from.id,
    event,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
    languageCode: from.language_code,
    isBot: from.is_bot ?? false,
    chatType: ctx.chat?.type,
  };

  if (meta && Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  return payload;
}

/**
 * Records a single analytics event in MongoDB. Non-blocking: does not await the write
 * so Telegram handlers stay responsive. Failures are logged only.
 *
 * Optional `meta` for extra dimensions (keep small; avoid PII you do not need).
 */
function saveAnalyticsEvent(
  ctx: Context,
  event: string,
  meta?: AnalyticsMeta
): void {
  const doc = buildEventPayload(ctx, event, meta);
  if (!doc) return;

  void AnalyticsEvent.create(doc).catch((err) => {
    console.error("analytics: failed to save event", event, err);
  });
}

export { AnalyticsEvent, saveAnalyticsEvent };
