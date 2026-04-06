import mongoose from "mongoose";
import BotUserSchema from "./schema";

const BotUser =
  mongoose.models.BotUser ?? mongoose.model("BotUser", BotUserSchema);

export type PoemRef = {
  link: string;
  title: string;
  poetLabel: string;
};

const MAX_FAVORITES = 80;

async function setLastReadPoem(
  telegramId: number,
  poem: PoemRef
): Promise<void> {
  try {
    await BotUser.findOneAndUpdate(
      { telegramId },
      {
        $set: {
          lastReadPoem: {
            ...poem,
            updatedAt: new Date(),
          },
        },
      },
      { upsert: false }
    );
  } catch (e) {
    console.error("setLastReadPoem failed", e);
  }
}

async function isFavorite(telegramId: number, link: string): Promise<boolean> {
  const u = await BotUser.findOne({
    telegramId,
    "favorites.link": link,
  })
    .select({ _id: 1 })
    .lean();
  return !!u;
}

async function addFavorite(
  telegramId: number,
  poem: PoemRef
): Promise<boolean> {
  try {
    const existing = await BotUser.findOne({
      telegramId,
      "favorites.link": poem.link,
    }).lean();
    if (existing) return false;

    await BotUser.findOneAndUpdate(
      { telegramId },
      {
        $push: {
          favorites: {
            $each: [{ ...poem, addedAt: new Date() }],
            $slice: -MAX_FAVORITES,
          },
        },
      }
    );
    return true;
  } catch (e) {
    console.error("addFavorite failed", e);
    return false;
  }
}

async function removeFavoriteByLink(
  telegramId: number,
  link: string
): Promise<boolean> {
  try {
    const r = await BotUser.findOneAndUpdate(
      { telegramId },
      { $pull: { favorites: { link } } },
      { new: true }
    );
    return !!r;
  } catch (e) {
    console.error("removeFavoriteByLink failed", e);
    return false;
  }
}

async function removeFavoriteById(
  telegramId: number,
  favoriteId: string
): Promise<boolean> {
  try {
    const r = await BotUser.findOneAndUpdate(
      { telegramId },
      { $pull: { favorites: { _id: favoriteId } } },
      { new: true }
    );
    return !!r;
  } catch (e) {
    console.error("removeFavoriteById failed", e);
    return false;
  }
}

async function getLastReadPoem(
  telegramId: number
): Promise<PoemRef | null> {
  const u = await BotUser.findOne({ telegramId })
    .select({ lastReadPoem: 1 })
    .lean();
  const lr = u?.lastReadPoem;
  if (!lr?.link) return null;
  return {
    link: lr.link,
    title: lr.title ?? "",
    poetLabel: lr.poetLabel ?? "",
  };
}

type FavoriteRow = PoemRef & { _id: mongoose.Types.ObjectId };

async function listFavorites(
  telegramId: number
): Promise<FavoriteRow[]> {
  const u = await BotUser.findOne({ telegramId })
    .select({ favorites: 1 })
    .lean();
  const fav = u?.favorites;
  if (!Array.isArray(fav)) return [];
  return fav
    .filter((x: { link?: string }) => !!x?.link)
    .map(
      (x: {
        _id: mongoose.Types.ObjectId;
        link: string;
        title?: string;
        poetLabel?: string;
      }) => ({
        _id: x._id,
        link: x.link,
        title: x.title ?? "",
        poetLabel: x.poetLabel ?? "",
      })
    );
}

async function getFavoriteBySubdocId(
  telegramId: number,
  subdocId: string
): Promise<FavoriteRow | null> {
  const u = await BotUser.findOne({ telegramId }).select({ favorites: 1 }).lean();
  const fav = u?.favorites;
  if (!Array.isArray(fav)) return null;
  const row = fav.find(
    (x: { _id?: mongoose.Types.ObjectId }) => String(x?._id) === subdocId
  );
  if (!row?.link) return null;
  return {
    _id: row._id,
    link: row.link,
    title: row.title ?? "",
    poetLabel: row.poetLabel ?? "",
  };
}

export {
  addFavorite,
  getFavoriteBySubdocId,
  getLastReadPoem,
  isFavorite,
  listFavorites,
  MAX_FAVORITES,
  removeFavoriteById,
  removeFavoriteByLink,
  setLastReadPoem,
};
