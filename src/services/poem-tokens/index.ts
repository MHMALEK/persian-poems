import mongoose from "mongoose";
import PoemTokenSchema from "./schema";

const PoemToken =
  mongoose.models.PoemToken ?? mongoose.model("PoemToken", PoemTokenSchema);

export type PoemTokenPayload = {
  link: string;
  title: string;
  poetLabel: string;
  favorited: boolean;
};

async function createPoemToken(payload: PoemTokenPayload): Promise<string> {
  const doc = await PoemToken.create(payload);
  return String(doc._id);
}

async function getPoemToken(id: string): Promise<PoemTokenPayload | null> {
  const doc = await PoemToken.findById(id).lean();
  if (!doc) return null;
  return {
    link: doc.link,
    title: doc.title,
    poetLabel: doc.poetLabel ?? "",
    favorited: doc.favorited ?? false,
  };
}

export { PoemToken, createPoemToken, getPoemToken };
