const TELEGRAM_SAFE_TEXT_LIMIT = 4000;

/**
 * Splits plain text on line boundaries while remaining safely below Telegram's
 * 4096-character message limit. Sensitive text is never logged or transformed.
 */
export function splitTelegramText(
  text: string,
  limit = TELEGRAM_SAFE_TEXT_LIMIT,
): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > limit) {
    const preferredBoundary = remaining.lastIndexOf('\n', limit);
    const boundary =
      preferredBoundary >= Math.floor(limit / 2)
        ? preferredBoundary + 1
        : limit;
    chunks.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary);
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
