import { InlineKeyboard } from "grammy";
import { DAILY_DIGEST_MENU_CALLBACK } from "./daily-digest-callbacks";

/** Callback data used for «منوی اصلی» from pool flows (random poem, etc.). */
const MAIN_MENU_BACK_CALLBACK = "back_to_poet_menu_fa";

type MainMenuPoet = { title: string; id: string };

const MAIN_MENU_POETS: MainMenuPoet[] = [
  { title: "حافظ شیرازی", id: "hafez" },
  { title: "خیام", id: "khayyam" },
  { title: "مولانا", id: "moulavi" },
  { title: "سعدی", id: "saadi" },
  { title: "فردوسی", id: "ferdousi" },
  { title: "نظامی", id: "nezami" },
];

function buildMainKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  MAIN_MENU_POETS.forEach((poet) => {
    keyboard.text(poet.title, `select_poet_fa:${poet.id}`).row();
  });
  keyboard.text("یک شعر تصادفی برایم بیاور", "random_poem_fa").row();
  keyboard.text("شعر روزانه و فال حافظ", DAILY_DIGEST_MENU_CALLBACK).row();
  return keyboard;
}

export { buildMainKeyboard, MAIN_MENU_BACK_CALLBACK, MAIN_MENU_POETS };
