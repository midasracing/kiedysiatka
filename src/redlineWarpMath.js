export const REDLINE_IN_MS = 660;
export const REDLINE_OUT_MS = 470;

export const redlineClamp = value => Math.min(1, Math.max(0, value));
export const redlineEase = value => {
  const t = redlineClamp(value);
  return t * t * (3 - 2 * t);
};

// The midpoint becomes an opaque, black tunnel. Both ends stay transparent,
// so the underlying match view and finished standings remain visible.
export function redlineCoverage(progress) {
  const p = redlineClamp(progress);
  if (p < .16) return .22 * redlineEase(p / .16);
  if (p < .36) return .22 + .74 * redlineEase((p - .16) / .20);
  if (p < .68) return .96;
  return .96 * (1 - redlineEase((p - .68) / .28));
}

export function redlineIntensity(progress) {
  const p = redlineClamp(progress);
  return Math.pow(Math.sin(Math.PI * p), 1.25);
}
