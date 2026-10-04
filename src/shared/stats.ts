import { AnalyticsEvent } from "../services/analytics";
import { BotUser } from "../services/users";

const WEEK_MS = 7 * 24 * 3600_000;

type EventRow = { _id: string; n: number; users: number };

/** Operator snapshot: opt-in counts plus the last 7 days of events. Plain text for a Telegram reply. */
async function buildStatsReport(): Promise<string> {
  const since = new Date(Date.now() - WEEK_MS);
  const reachable = { active: { $ne: false } };
  const [total, active, digestOn, falOn, poetsNarrowed, newUsers7d, deactivated7d] =
    await Promise.all([
      BotUser.countDocuments({}),
      BotUser.countDocuments(reachable),
      BotUser.countDocuments({ dailyDigest: true, ...reachable }),
      BotUser.countDocuments({ dailyFal: true, ...reachable }),
      BotUser.countDocuments({ dailyDigest: true, "dailyPoets.0": { $exists: true }, ...reachable }),
      BotUser.countDocuments({ createdAt: { $gte: since } }),
      BotUser.countDocuments({ deactivatedAt: { $gte: since } }),
    ]);

  const events = (await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: "$event", n: { $sum: 1 }, users: { $addToSet: "$telegramId" } } },
    { $project: { n: 1, users: { $size: "$users" } } },
    { $sort: { n: -1 } },
    { $limit: 15 },
  ])) as EventRow[];

  const pct = (n: number, d: number) => (d > 0 ? ` (${Math.round((n / d) * 100)}%)` : "");
  const lines = [
    "📊 آمار بات",
    `کاربران: ${total} کل، ${active} قابل‌دسترس`,
    `شعر روزانه روشن: ${digestOn}${pct(digestOn, active)} — با شاعر انتخابی: ${poetsNarrowed}`,
    `فال روزانه روشن: ${falOn}${pct(falOn, active)}`,
    `۷ روز اخیر: ${newUsers7d} کاربر جدید، ${deactivated7d} غیرفعال‌شده (بلاک)`,
    "",
    "رویدادهای ۷ روز اخیر (تعداد / کاربر یکتا):",
    ...events.map((e) => `• ${e._id}: ${e.n} / ${e.users}`),
  ];
  if (events.length === 0) lines.push("• هیچ رویدادی ثبت نشده");
  return lines.join("\n");
}

export { buildStatsReport };
