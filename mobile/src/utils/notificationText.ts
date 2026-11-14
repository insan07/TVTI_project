/** Remove emoji sequences while preserving numbers, punctuation and local scripts. */
export function notificationText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/(?:\p{Regional_Indicator}+|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\p{Emoji_Modifier})*(?:\u200D\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\p{Emoji_Modifier})*)*(?:[\u{E0020}-\u{E007F}]+)?|\p{Emoji_Modifier})/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
