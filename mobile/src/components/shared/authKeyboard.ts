/** Keep the input inside the visible scroll area, with room around its edges. */
export function getAuthInputScrollOffset(
  scrollOffset: number,
  viewportTop: number,
  viewportBottom: number,
  inputTop: number,
  inputHeight: number,
): number {
  const top = viewportTop + 16;
  const bottom = viewportBottom - 24;
  const visibleInputHeight = Math.min(inputHeight, Math.max(0, bottom - top));
  if (inputTop < top) return Math.max(0, scrollOffset + inputTop - top);
  if (inputTop + visibleInputHeight > bottom) {
    return Math.max(0, scrollOffset + inputTop + visibleInputHeight - bottom);
  }
  return scrollOffset;
}
