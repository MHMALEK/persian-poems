import express from "express";
import type { Bot } from "grammy";
import { BotError, webhookCallback } from "grammy";

/**
 * Starts the HTTP server that serves the Telegram webhook.
 *
 * By default it also registers the webhook with Telegram at `WEBHOOK_URL`
 * (path defaults to `WEBHOOK_PATH` or `/telegram/webhook` when the URL has
 * none). When `BOT_WEBHOOK_EXTERNAL=true`, it only serves the endpoint and
 * leaves registration to an external owner — e.g. an ephemeral Cloudflare
 * quick tunnel whose public URL changes on every restart.
 */
export async function startWebhookServer(bot: Bot): Promise<void> {
  // When the webhook is registered by an external process (e.g. an ephemeral
  // Cloudflare quick tunnel whose URL changes on every restart), the bot only
  // *serves* the webhook and never calls setWebhook itself.
  const externallyManaged = process.env.BOT_WEBHOOK_EXTERNAL === "true";
  const rawWebhookUrl = process.env.WEBHOOK_URL?.trim();

  if (!externallyManaged && !rawWebhookUrl) {
    throw new Error(
      "WEBHOOK_URL is missing. Add it to .env, e.g. https://abc123.ngrok-free.app " +
        "(optional path; if omitted, /telegram/webhook is used). PORT must match `ngrok http <PORT>`. " +
        "Or set BOT_WEBHOOK_EXTERNAL=true to let an external process register the webhook."
    );
  }

  const configuredPath = process.env.WEBHOOK_PATH?.trim();
  const defaultPath =
    configuredPath && configuredPath !== "/"
      ? configuredPath.startsWith("/")
        ? configuredPath
        : `/${configuredPath}`
      : "/telegram/webhook";

  // The path we serve on, and the full URL to register (null when external).
  let pathname = defaultPath;
  let webhookUrl: string | null = null;

  if (!externallyManaged && rawWebhookUrl) {
    let url: URL;
    try {
      url = new URL(rawWebhookUrl);
    } catch {
      throw new Error(`Invalid WEBHOOK_URL: ${rawWebhookUrl}`);
    }
    if (!url.pathname || url.pathname === "/") {
      url.pathname = defaultPath;
      console.log(`WEBHOOK_URL had no path; using ${url.origin}${url.pathname}`);
    }
    pathname = url.pathname;
    webhookUrl = url.href;
  }

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

  if (externallyManaged || !webhookUrl) {
    console.log(
      `Webhook externally managed (BOT_WEBHOOK_EXTERNAL=true); serving ${pathname}, ` +
        "not calling setWebhook — an external process owns the public URL."
    );
    return;
  }

  await bot.api.setWebhook(webhookUrl, {
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
  console.log(`Telegram webhook registered: ${webhookUrl}`);
}
