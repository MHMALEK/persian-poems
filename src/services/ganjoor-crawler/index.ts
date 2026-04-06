import * as cheerio from "cheerio";
import HttpClient from "../../utils/http-client";
const ganjoorBaseUrl = "https://ganjoor.net";

const GanjoorHttpClient = new HttpClient(ganjoorBaseUrl);

const loadHtml = async (url: string) => {
  return await GanjoorHttpClient.getData(url);
};

const fetchHtmlPageFromGanjoor = async (author: string, type: string) => {
  const itemLinkToFetch = `${ganjoorBaseUrl}/${author}/${type}`;
  console.log("itemLinkToFetch", itemLinkToFetch, author, type);
  const htmlPage = await loadHtml(itemLinkToFetch);
  return htmlPage;
};
const extractPoemsText = async (poemHtml: string) => {
  let $ = cheerio.load(poemHtml);
  let items: any = [];
  $(".b").each((index, element) => {
    let m1Text = $(element).find(".m1 p").text();
    let m2Text = $(element).find(".m2 p").text();
    items.push({ m1: m1Text, m2: m2Text });
  });
  let poem = "";
  items.forEach((item: any) => {
    poem += `${item.m1}\n ${item.m2}\n \n`;
  });

  return poem;
};

const getPoems = async (htmlPage: any) => {
  let $ = cheerio.load(htmlPage);
  let list: any = [];
  $(".poem-excerpt").each(function (i, elem) {
    list[i] = {
      text: $(this).text(),
      link: $(elem).children().attr("href"),
    };
  });

  return list;
};

/**
 * Child section links on category index pages (e.g. شاهنامه فردوسی).
 * Uses `td.c2 a` table rows used on many Ganjoor indices.
 */
const getCategoryLinks = (htmlPage: string, authorSlug: string) => {
  const $ = cheerio.load(htmlPage);
  const seen = new Set<string>();
  const list: { text: string; link: string }[] = [];
  $(`td.c2 a[href^="/${authorSlug}/"]`).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const text = $(el).text().trim();
    if (!text || seen.has(href)) return;
    seen.add(href);
    list.push({ text, link: href });
  });
  return list;
};

export {
  extractPoemsText,
  getCategoryLinks,
  getPoems,
  loadHtml,
  fetchHtmlPageFromGanjoor,
};
