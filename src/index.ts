import connectToDB from "./services/db";
import PersianPoemsTelegramBot from "./services/telegram-bot";
import { addHafezFaCallbacks } from "./poets/hafez/fa";
import { addDefaultCommands } from "./commands";
import { addSelectPoetCallbacks } from "./shared/commands";
import { addkhayamFaCallbacks } from "./poets/khayyam/fa";
import { addmoulaviFaCallbacks } from "./poets/molana/fa";
import { addSaadiFaCallbacks } from "./poets/saadi/fa";
import { addNezamiFaCallbacks } from "./poets/nezami/fa";
import { addFerdousiFaCallbacks } from "./poets/ferdousi/fa";
import { addPoemFeatureCallbacks } from "./shared/poem-callbacks";
import { addPoemNavCallbacks } from "./shared/poem-nav-callbacks";
import { startWebhookServer } from "./http/webhook-server";
import { scheduleDailyDigest } from "./jobs/daily-digest";

function resolveMongoUrl(): string {
  const url = process.env.MONGODB_URL?.trim() || process.env.MANGO_DB_URL?.trim();
  if (!url) {
    throw new Error("Set MONGODB_URL (recommended) or MANGO_DB_URL");
  }
  return url;
}

function resolveTransport(): "webhook" | "polling" {
  const explicit = process.env.BOT_TRANSPORT?.trim().toLowerCase();
  if (explicit === "webhook" || explicit === "polling") return explicit;
  return process.env.NODE_ENV === "production" ? "webhook" : "polling";
}

async function main() {
  await connectToDB(resolveMongoUrl());

  addDefaultCommands();
  addSelectPoetCallbacks();
  addPoemFeatureCallbacks();
  addPoemNavCallbacks();
  addHafezFaCallbacks();
  addkhayamFaCallbacks();
  addmoulaviFaCallbacks();
  addSaadiFaCallbacks();
  addNezamiFaCallbacks();
  addFerdousiFaCallbacks();

  const transport = resolveTransport();
  if (transport === "webhook") {
    await startWebhookServer(PersianPoemsTelegramBot.bot);
  } else {
    await PersianPoemsTelegramBot.startPolling();
  }

  scheduleDailyDigest(PersianPoemsTelegramBot.bot);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
