import { splitTelegramText } from './telegram-text';

describe('splitTelegramText', () => {
  it('keeps short text in one chunk', () => {
    expect(splitTelegramText('short message')).toEqual(['short message']);
  });

  it('preserves content and keeps every chunk within the limit', () => {
    const text = `Header\n${'a'.repeat(9000)}\nFooter`;
    const chunks = splitTelegramText(text);

    expect(chunks.every((chunk) => chunk.length <= 4000)).toBe(true);
    expect(chunks.join('')).toBe(text);
  });
});
