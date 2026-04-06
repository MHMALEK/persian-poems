import mongoose from "mongoose";
import PoemNavTokenSchema from "./schema";

const PoemNavToken =
  mongoose.models.PoemNavToken ??
  mongoose.model("PoemNavToken", PoemNavTokenSchema);

export type PoemNavTokenPayload = {
  author: string;
  indexPath: string;
  listIndex: number;
  backCallback: string;
  poetLabel: string;
};

async function createPoemNavToken(
  payload: PoemNavTokenPayload
): Promise<string> {
  const doc = await PoemNavToken.create(payload);
  return String(doc._id);
}

export { PoemNavToken, createPoemNavToken };
