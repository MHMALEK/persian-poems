import type { Context, InlineKeyboard } from "grammy";

/**
 * Poem keyboards use these callbacks; menu-only keyboards do not.
 * Used to avoid editMessageText on poem messages (which would replace the text).
 */
function isPoemKeyboardMessage(msg: {
  reply_markup?: { inline_keyboard?: { callback_data?: string }[][] };
}): boolean {
  const rows = msg.reply_markup?.inline_keyboard;
  if (!rows) return false;
  for (const row of rows) {
    for (const btn of row) {
      const cd = btn.callback_data;
      if (typeof cd !== "string") continue;
      if (cd.startsWith("pnv:") || cd === "random_poem_more_fa") {
        return true;
      }
    }
  }
  return false;
}

/**
 * When the user tapped a button on a poem message, the next menu must be a **new**
 * message so poem chunks stay in the chat.
 */
function shouldSendMenuAsNewMessage(ctx: Context): boolean {
  void ctx;
  return false;
}

/** For poets' createX(ctx, mode) helpers. */
function poemAwareMenuMode(ctx: Context): "replyMessage" | "editMessage" {
  void ctx;
  return "editMessage";
}

/**
 * One text bubble: edit the message from an inline callback when possible;
 * otherwise send a new message (e.g. slash commands).
 */
async function editMessageOrReply(
  ctx: Context,
  text: string,
  options: { reply_markup?: InlineKeyboard; parse_mode?: "HTML" }
): Promise<unknown> {
  if (ctx.callbackQuery?.message !== undefined) {
    return ctx.editMessageText(text, options);
  }
  return ctx.reply(text, options);
}

export {
  editMessageOrReply,
  isPoemKeyboardMessage,
  poemAwareMenuMode,
  shouldSendMenuAsNewMessage,
};
