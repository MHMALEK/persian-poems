import {
  extractPoemsText,
  fetchHtmlPageFromGanjoor,
} from "../services/ganjoor-crawler";
import { authorFromGanjoorPath, pathAfterAuthor } from "./ganjoor-path";

async function loadPoemBodyByGanjoorLink(link: string): Promise<string> {
  const author = authorFromGanjoorPath(link);
  if (!author) {
    throw new Error(`Cannot parse author from link: ${link}`);
  }
  const rel = pathAfterAuthor(author, link);
  const html = await fetchHtmlPageFromGanjoor(author, rel);
  return extractPoemsText(html);
}

export { loadPoemBodyByGanjoorLink };
