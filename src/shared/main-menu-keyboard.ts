import { InlineKeyboard } from "grammy";

/** Callback data used for «منوی اصلی» from pool flows (random poem, favorites, etc.). */
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
  keyboard
    .text("علاقه‌مندی‌ها", "fav_list_fa")
    .text("آخرین شعری که خوانده‌اید", "last_read_fa")
    .row();
  keyboard.text("شعر روزانهٔ خودکار (قطع / وصل)", "digest_toggle_fa").row();
  return keyboard;
}

/**
 * Appends the same navigation as the main menu (for use under poem messages).
 * Call after poem-specific rows so users can jump without scrolling up.
 */
function appendMainMenuKeyboard(kb: InlineKeyboard): void {
  kb.row();
  MAIN_MENU_POETS.forEach((poet) => {
    kb.text(poet.title, `select_poet_fa:${poet.id}`).row();
  });
  kb.text("یک شعر تصادفی برایم بیاور", "random_poem_fa").row();
  kb.text("علاقه‌مندی‌ها", "fav_list_fa")
    .text("آخرین شعری که خوانده‌اید", "last_read_fa")
    .row();
  kb.text("شعر روزانهٔ خودکار (قطع / وصل)", "digest_toggle_fa").row();
}

export {
  appendMainMenuKeyboard,
  buildMainKeyboard,
  MAIN_MENU_BACK_CALLBACK,
  MAIN_MENU_POETS,
};
