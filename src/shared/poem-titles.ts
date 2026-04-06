/** Short label for favorites when Ganjoor does not expose a separate title. */
function derivePoemTitle(poemPlainText: string): string {
  const line = poemPlainText
    .split("\n")
    .find((l) => l.trim().length > 0)
    ?.trim();
  return (line ?? "شعر").slice(0, 120);
}

export { derivePoemTitle };
