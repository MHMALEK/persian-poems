/** Relative path under the author for `fetchHtmlPageFromGanjoor(author, rel)`. */
function pathAfterAuthor(author: string, link: string): string {
  const needle = `/${author}/`;
  const i = link.indexOf(needle);
  if (i === -1) {
    throw new Error(`Unexpected poem link for ${author}: ${link}`);
  }
  return link.slice(i + needle.length);
}

function authorFromGanjoorPath(link: string): string | null {
  if (!link.startsWith("/")) return null;
  const rest = link.slice(1);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  return rest.slice(0, slash);
}

export { authorFromGanjoorPath, pathAfterAuthor };
