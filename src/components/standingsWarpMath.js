// Shared math for the canvas and its boundary tests.
export const STANDINGS_ROW_HEIGHT = 68;
export const STANDINGS_TOP_INSET = 7;

export function standingsScrollBounds(rowCount, viewportHeight) {
  const min = STANDINGS_TOP_INSET + STANDINGS_ROW_HEIGHT / 2 - viewportHeight / 2;
  const max = min + Math.max(0, rowCount - 1) * STANDINGS_ROW_HEIGHT;
  return { min, max };
}

export function standingsWarpScale(screenY, viewportHeight) {
  if (!viewportHeight) return 1;
  const distance = Math.min(1, Math.abs((screenY - viewportHeight / 2) / (viewportHeight / 2)));
  return 1 + 1.9 * Math.pow(distance, 1.55);
}
