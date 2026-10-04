/** Telegram user ids allowed to run operator commands, from `ADMIN_TELEGRAM_IDS` (comma-separated). */
function adminTelegramIds(): Set<number> {
  const raw = process.env.ADMIN_TELEGRAM_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
  );
}

function isAdmin(telegramId: number | undefined): boolean {
  return telegramId !== undefined && adminTelegramIds().has(telegramId);
}

export { adminTelegramIds, isAdmin };
