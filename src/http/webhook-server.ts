import express from "express";
import type { Bot } from "grammy";
import { BotError, webhookCallback } from "grammy";

/**
 * Starts HTTP server and registers Telegram webhook at WEBHOOK_URL.
 * If WEBHOOK_URL has no path (typical ngrok URL), defaults to WEBHOOK_PATH or /telegram/webhook.
 */
export async function startWebhookServer(bot: Bot): Promise<void> {
  const rawWebhookUrl = process.env.WEBHOOK_URL?.trim();
  if (!rawWebhookUrl) {
    throw new Error(
      "WEBHOOK_URL is missing. Add it to .env, e.g. https://abc123.ngrok-free.app " +
        "(optional path; if omitted, /telegram/webhook is used). PORT must match `ngrok http <PORT>`."
    );
  }

  let url: URL;
  try {
    url = new URL(rawWebhookUrl);
  } catch {
    throw new Error(`Invalid WEBHOOK_URL: ${rawWebhookUrl}`);
  }

  const configuredPath = process.env.WEBHOOK_PATH?.trim();
  const defaultPath =
    configuredPath && configuredPath !== "/"
      ? configuredPath.startsWith("/")
        ? configuredPath
        : `/${configuredPath}`
      : "/telegram/webhook";

  let pathname = url.pathname;
  if (!pathname || pathname === "/") {
    pathname = defaultPath;
    url.pathname = pathname;
    console.log(`WEBHOOK_URL had no path; using ${url.origin}${pathname}`);
  }

  const webhookUrl = url.href;

  const port = Number(process.env.PORT || 3000);
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  const app = express();
  app.disable("x-powered-by");
  app.get("/health", (_req, res) => res.status(200).send("ok"));

  app.use(express.json());

  const webhookHandler = webhookCallback(
    bot,
    "express",
    secretToken ? { secretToken } : undefined
  );

  app.use(pathname, async (req, res, next) => {
    try {
      await webhookHandler(req, res);
    } catch (e: unknown) {
      if (e instanceof BotError) {
        await bot.errorHandler(e);
        if (!res.headersSent) {
          res.status(200).end();
        }
        return;
      }
      next(e);
    }
  });

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Listening on port ${port}, webhook path ${pathname}`);
      resolve();
    });
    server.on("error", reject);
  });

  await bot.api.setWebhook(webhookUrl, {
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
  console.log(`Telegram webhook registered: ${webhookUrl}`);
}
