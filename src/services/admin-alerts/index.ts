import type { Bot } from "grammy";
import { adminTelegramIds } from "../../shared/admin";

/** Same (title, error) at most once per window, so a hot loop cannot flood the admin chat. */
const REPEAT_WINDOW_MS = 10 * 60_000;
const MAX_TRACKED_SIGNATURES = 500;
const lastSentAt = new Map<string, number>();

function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** DMs every id in ADMIN_TELEGRAM_IDS. Never throws; no-op without admins. */
async function alertAdmins(
  bot: Bot,
  title: string,
  error: unknown,
  context?: string
): Promise<void> {
  const ids = adminTelegramIds();
  if (ids.size === 0) return;

  const detail = truncate(describeError(error).split("\n")[0] ?? "", 300);
  const key = `${title}|${detail}`;
  const now = Date.now();
  if (now - (lastSentAt.get(key) ?? 0) < REPEAT_WINDOW_MS) return;
  if (lastSentAt.size >= MAX_TRACKED_SIGNATURES) lastSentAt.clear();
  lastSentAt.set(key, now);

  const text =
    `⚠️ <b>${escapeHtml(title)}</b>\n<code>${escapeHtml(detail)}</code>` +
    (context ? `\n${escapeHtml(truncate(context, 500))}` : "");

  for (const id of ids) {
    try {
      await bot.api.sendMessage(id, text, { parse_mode: "HTML" });
    } catch (e) {
      console.error("admin alert: send failed", id, e);
    }
  }
}

export { alertAdmins, describeError };
