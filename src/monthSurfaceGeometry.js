const rounded = value => Math.round(value * 100) / 100;

// One continuous SVG outline, from the active Mecze pill to the month panel.
// Both states share the same path topology, so there are no CSS seams.
export function monthSurfacePath({ left: l, right: r, top: t, bottom: b, width: w, height: h }, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const panelRight = (r - 14) * (1 - p) + w * p;
  const panelLeft = (l + 14) * (1 - p);
  const panelTop = b + 22 * p;
  const panelBottom = b + (h - b) * p;
  const segments = [
    ['M', l + 14, t],
    ['L', r - 14, t],
    ['Q', r, t, r, t + 14],
    ['L', r, b - 14],
    ['C', r, b - 5 + 13 * p, r - 5 + 17 * p, panelTop, r - 14 + 52 * p, panelTop],
    ['L', panelRight - 18 * p, panelTop],
    ['Q', panelRight, panelTop, panelRight, b + 40 * p],
    ['L', panelRight, panelBottom - 18 * p],
    ['Q', panelRight, panelBottom, panelRight - 18 * p, panelBottom],
    ['L', panelLeft + 18 * p, panelBottom],
    ['Q', panelLeft, panelBottom, panelLeft, panelBottom - 18 * p],
    ['L', panelLeft, b + 15 * p],
    ['C', panelLeft, b + 5 * p, l, b + 5 * p, l, b - 14],
    ['L', l, t + 14],
    ['Q', l, t, l + 14, t],
    ['Z'],
  ];
  return segments.map(segment => segment.map(value =>
    typeof value === 'number' ? rounded(value) : value
  ).join(' ')).join(' ');
}
