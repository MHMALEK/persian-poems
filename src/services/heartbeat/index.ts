const PING_TIMEOUT_MS = 10_000;
const LIVENESS_INTERVAL_MS = 60_000;

type PingSuffix = "" | "/fail";

function pingUrl(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/** Healthchecks.io style: any request = "alive"; `/fail` = "alive but failed". Body is kept as the check's log. */
async function ping(url: string, suffix: PingSuffix, body?: string): Promise<void> {
  try {
    await fetch(url + suffix, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
  } catch (e) {
    console.warn("heartbeat: ping failed", suffix || "/", e);
  }
}

/** Liveness: pings `HEALTHCHECKS_PING_URL` every minute; the check alerts when pings stop. */
function startHeartbeat(): void {
  const url = pingUrl("HEALTHCHECKS_PING_URL");
  if (!url) {
    console.log("heartbeat: off (set HEALTHCHECKS_PING_URL to enable)");
    return;
  }
  void ping(url, "");
  setInterval(() => void ping(url, ""), LIVENESS_INTERVAL_MS).unref();
  console.log("heartbeat: pinging every 60s");
}

/** Process is going down: mark the liveness check failed right away instead of waiting for the grace period. */
async function pingFatal(message: string): Promise<void> {
  const url = pingUrl("HEALTHCHECKS_PING_URL");
  if (!url) return;
  await ping(url, "/fail", message);
}

/** `HEALTHCHECKS_DAILY_PING_URL` expects one ping per day after the morning run; `/fail` when that run crashed. */
async function pingDailyDigest(ok: boolean, summary: string): Promise<void> {
  const url = pingUrl("HEALTHCHECKS_DAILY_PING_URL");
  if (!url) return;
  await ping(url, ok ? "" : "/fail", summary);
}

export { pingDailyDigest, pingFatal, startHeartbeat };
