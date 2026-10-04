import mongoose from "mongoose";
import type { PoemRef } from "../users/poems";
import DailyPoemSchema from "./schema";

const DailyPoem =
  mongoose.models.DailyPoem ?? mongoose.model("DailyPoem", DailyPoemSchema);

export type DailyPoemKind = "digest" | "fal" | "yalda";
export type PickedPoem = { chunks: string[]; poem: PoemRef };

type DailyPoemRow = { chunks: string[]; poem: PoemRef };

function isDuplicateKey(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === 11000
  );
}

/**
 * Returns today's cached poem for (kind, poetId), picking and storing one when
 * missing. Two concurrent runs racing on the insert resolve to the stored row.
 */
async function getOrPickDailyPoem(
  dateKey: string,
  kind: DailyPoemKind,
  poetId: string,
  pick: () => Promise<PickedPoem | null>
): Promise<PickedPoem | null> {
  const key = { dateKey, kind, poetId };
  const found = await DailyPoem.findOne(key).lean<DailyPoemRow | null>();
  if (found) return { chunks: found.chunks, poem: found.poem };

  const picked = await pick();
  if (!picked) return null;

  try {
    await DailyPoem.create({ ...key, chunks: picked.chunks, poem: picked.poem });
  } catch (e) {
    if (isDuplicateKey(e)) {
      const again = await DailyPoem.findOne(key).lean<DailyPoemRow | null>();
      if (again) return { chunks: again.chunks, poem: again.poem };
    } else {
      console.warn("daily poems: cache write failed", key, e);
    }
  }
  return picked;
}

export { DailyPoem, getOrPickDailyPoem };
