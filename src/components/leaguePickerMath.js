export const PICKER_ROW_HEIGHT = 112;

export function pickerOffsetForIndex(index, height) {
  return (index + 0.5) * PICKER_ROW_HEIGHT - height / 2;
}

export function pickerBounds(rowCount, height) {
  return {
    min: pickerOffsetForIndex(0, height),
    max: pickerOffsetForIndex(Math.max(0, rowCount - 1), height),
  };
}

export function pickerIndexForOffset(offset, height, rowCount) {
  if (!rowCount) return -1;
  return Math.min(rowCount - 1, Math.max(0, Math.round(
    (offset + height / 2 - PICKER_ROW_HEIGHT / 2) / PICKER_ROW_HEIGHT
  )));
}
