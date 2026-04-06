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

/**
 * Path to the listing page (e.g. `ghazal` or `shams/ghazalsh`) for a poem item link.
 * Returns `null` when the link has no parent segment (single-page work).
 */
function ganjoorIndexPathFromPoemLink(
  author: string,
  itemLink: string
): string | null {
  const needle = `/${author}/`;
  const i = itemLink.indexOf(needle);
  if (i === -1) return null;
  const rest = itemLink.slice(i + needle.length);
  const segments = rest.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return segments.slice(0, -1).join("/");
}

export {
  authorFromGanjoorPath,
  ganjoorIndexPathFromPoemLink,
  pathAfterAuthor,
};

