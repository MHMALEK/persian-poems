/** Telegram Bot API text limit; stay under to allow HTML tags and entities. */
const TELEGRAM_TEXT_SAFE_MAX = 4000;

function splitMessage(message: string, maxChunkLines: number) {
  const lines = message.split("\n");
  const result: string[] = [];
  let chunk = "";

  for (let i = 0; i < lines.length; i++) {
    chunk += lines[i] + "\n";

    if ((i + 1) % maxChunkLines === 0) {
      result.push(chunk);
      chunk = "";
    }
  }

  if (chunk !== "") {
    result.push(chunk);
  }

  return result;
}

/**
 * Split text so each part is ≤ maxLen characters (Telegram limit is 4096).
 * Prefers breaking on newlines; hard-splits very long lines.
 */
function splitTelegramText(
  text: string,
  maxLen = TELEGRAM_TEXT_SAFE_MAX
): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    if (buf.length > 0) {
      chunks.push(buf);
      buf = "";
    }
  };

  for (const line of text.split("\n")) {
    const candidate = buf.length > 0 ? `${buf}\n${line}` : line;
    if (candidate.length <= maxLen) {
      buf = candidate;
      continue;
    }
    flush();
    if (line.length <= maxLen) {
      buf = line;
    } else {
      for (let i = 0; i < line.length; i += maxLen) {
        chunks.push(line.slice(i, i + maxLen));
      }
    }
  }
  flush();
  return chunks;
}

/** Apply {@link splitTelegramText} to every chunk (e.g. after line-based split). */
function normalizeTelegramChunks(chunks: string[]): string[] {
  return chunks.flatMap((c) => splitTelegramText(c));
}

export {
  normalizeTelegramChunks,
  splitMessage,
  splitTelegramText,
  TELEGRAM_TEXT_SAFE_MAX,
};
