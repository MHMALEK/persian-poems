import type { Bot } from "grammy";
import { alertAdmins, describeError } from "../admin-alerts";
import { pingFatal } from "../heartbeat";

const FATAL_NOTIFY_TIMEOUT_MS = 8_000;

type ExitFn = (code: number) => void;

/**
 * Fatal path: tell Healthchecks (`/fail`) and the admins, then exit so Docker
 * restarts the container. Notification is best-effort and capped, so a dead
 * network cannot keep a broken process alive. Exits exactly once.
 */
function createCrashHandler(bot: Bot, exit: ExitFn = (c) => process.exit(c)) {
  let exiting = false;
  return (kind: string, err: unknown): void => {
    console.error(kind, err);
    if (exiting) return;
    exiting = true;
    const notify = Promise.allSettled([
      pingFatal(`${kind}: ${describeError(err)}`),
      alertAdmins(bot, `بات کرش کرد (${kind})`, err),
    ]);
    const timeout = new Promise((resolve) =>
      setTimeout(resolve, FATAL_NOTIFY_TIMEOUT_MS).unref()
    );
    void Promise.race([notify, timeout]).then(() => exit(1));
  };
}

function installCrashGuard(bot: Bot, exit?: ExitFn): (kind: string, err: unknown) => void {
  const crash = createCrashHandler(bot, exit);
  process.on("uncaughtException", (e) => crash("uncaughtException", e));
  process.on("unhandledRejection", (e) => crash("unhandledRejection", e));
  return crash;
}

export { createCrashHandler, installCrashGuard, FATAL_NOTIFY_TIMEOUT_MS };
