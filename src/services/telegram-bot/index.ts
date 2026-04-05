import { Bot, Context, session, SessionFlavor } from "grammy";
import TelegramBotMenu from "./menu/create-menu";
import { Menu } from "@grammyjs/menu";

import * as dotenv from "dotenv";
dotenv.config();

function resolveBotToken(): string {
  const single = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (single) return single;
  if (process.env.NODE_ENV === "development") {
    const dev = process.env.TELEGRAM_BOT_API_TOKEN_DEV?.trim();
    if (dev) return dev;
  }
  const prod = process.env.TELEGRAM_BOT_API_TOKEN_PROD?.trim();
  if (prod) return prod;
  throw new Error(
    "Set TELEGRAM_BOT_TOKEN (recommended) or TELEGRAM_BOT_API_TOKEN_DEV / TELEGRAM_BOT_API_TOKEN_PROD"
  );
}

class TelegramBot extends TelegramBotMenu {
  bot: Bot;
  readonly token: string;

  constructor() {
    super();
    this.token = resolveBotToken();
    this.bot = new Bot(this.token);
  }

  async startPolling(): Promise<void> {
    await this.bot.start();
    console.log("Bot running (long polling)");
  }

  async stop(): Promise<void> {
    await this.bot.stop();
  }

  getInstance() {
    return this.bot;
  }

  sendMessage() {}

  addOnEventHandler(event: string, callBack: (ctx: Context) => void) {
    this.bot.on(event as never, callBack);
  }

  addCommandEventListener(event: string, callBack: (ctx: Context) => void) {
    this.bot.command(event, callBack);
  }

  useSession(sessionInitials?: Record<string, unknown>) {
    const seed = sessionInitials ?? {};
    this.bot.use(
      session({ initial: () => ({ ...seed }) }) as never
    );
  }

  addMenu({
    menu,
    commandName,
    menuTitle,
  }: {
    menu: Menu<Context>;
    commandName: string;
    menuTitle: string;
  }) {
    this.bot.use(menu);

    const onMenuCommandCallBack = async (ctx: Context) => {
      await ctx.reply(menuTitle, { reply_markup: menu });
    };

    this.bot.command(commandName, onMenuCommandCallBack);
  }

  setLanguage = (ctx: Context & SessionFlavor<Record<string, unknown>>, lang: "en" | "fa") => {
    ctx.session.langauge = lang;
  };
}

const PersianPoemsTelegramBot = new TelegramBot();

export { TelegramBot };
export default PersianPoemsTelegramBot;
