// Pixel geometry for the native-scrolling selector. The top/bottom scroll
// spacers center the first and last options without distorting their text.
export const PICKER_ROW_HEIGHT = 78;

export function pickerScrollForIndex(index) {
  return Math.max(0, index) * PICKER_ROW_HEIGHT;
}

export function pickerIndexFromScroll(scrollTop, count) {
  if (!count) return -1;
  return Math.max(0, Math.min(count - 1,
    Math.round(scrollTop / PICKER_ROW_HEIGHT)));
}
