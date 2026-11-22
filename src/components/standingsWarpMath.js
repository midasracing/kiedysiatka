// Screen-space lens geometry shared by the renderer and its boundary tests.
export const STANDINGS_ROW_HEIGHT = 68;
export const STANDINGS_TOP_INSET = 7;

export function standingsScrollBounds(rowCount, viewportHeight) {
  // Both the first and last team centres must be reachable, despite the lens.
  // The projection is centred, so screen Y = H/2 stays unchanged.
  const min = STANDINGS_TOP_INSET + STANDINGS_ROW_HEIGHT / 2 - viewportHeight / 2;
  const max = min + Math.max(0, rowCount - 1) * STANDINGS_ROW_HEIGHT;
  return { min, max };
}

// X projection: normal, readable width at the middle; oversized at the edges.
export function standingsWarpScale(screenY, viewportHeight) {
  if (!viewportHeight) return 1;
  const distance = Math.min(1, Math.abs((screenY - viewportHeight / 2) / (viewportHeight / 2)));
  const shoulder = Math.max(0, (distance - 0.07) / 0.93);
  return 1 + 2.25 * Math.pow(shoulder, 1.65);
}

// Inverse Y projection: near the middle motion stays 1:1. At the top/bottom
// more source rows fit in fewer screen pixels, producing curved perspective
// rather than a stack of independently stretched rectangles.
export function standingsWarpSourceY(screenY, viewportHeight) {
  if (!viewportHeight) return screenY;
  const center = viewportHeight / 2;
  const normalized = (screenY - center) / center;
  return center + (screenY - center) * (1 + 0.36 * normalized * normalized);
}
