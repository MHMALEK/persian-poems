import {
  extractPoemsText,
  fetchHtmlPageFromGanjoor,
  getPoems,
} from "../services/ganjoor-crawler";
import { pathAfterAuthor } from "./ganjoor-path";

async function fetchPoemFromIndexWithPicker(
  author: string,
  indexPath: string,
  pickIndex: (len: number) => number
): Promise<{ title: string; link: string; poemText: string } | null> {
  const htmlPage = await fetchHtmlPageFromGanjoor(author, indexPath);
  const list = await getPoems(htmlPage);
  if (!list.length) return null;
  const idx = pickIndex(list.length);
  const item = list[idx];
  if (!item?.link) return null;
  const rel = pathAfterAuthor(author, item.link);
  const poemHtml = await fetchHtmlPageFromGanjoor(author, rel);
  const poemText = await extractPoemsText(poemHtml);
  return { title: item.text, link: item.link, poemText };
}

export { fetchPoemFromIndexWithPicker };
