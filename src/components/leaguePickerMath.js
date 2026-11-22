// Pixel geometry for the native-scrolling selector. The top/bottom scroll
// spacers center the first and last options without distorting their text.
export const PICKER_ROW_HEIGHT = 116;

// Continuously varying, non-rounded indent centered on the viewport marker.
export function pickerIndentForDistance(distance) {
  const ratio = Math.abs(distance) / (PICKER_ROW_HEIGHT * 1.25);
  return 54 * Math.exp(-ratio * ratio);
}

// Calculate text fit ONCE at its maximum indentation, not during scroll.
export function pickerFixedScale(naturalWidth, viewportWidth) {
  if (!naturalWidth) return 1;
  const pad = viewportWidth <= 390 ? 48 : 52;
  const space = Math.max(1, viewportWidth - pad - 12 - 54);
  return Math.min(1, space / naturalWidth);
}

export function pickerScrollForIndex(index) {
  return Math.max(0, index) * PICKER_ROW_HEIGHT;
}

export function pickerIndexFromScroll(scrollTop, count) {
  if (!count) return -1;
  return Math.max(0, Math.min(count - 1,
    Math.round(scrollTop / PICKER_ROW_HEIGHT)));
}

const TWO_LINE_LABELS = {
  men: ['TAURON Liga', 'Mężczyzn'],
  first: ['TAURON 1. Liga', 'Mężczyzn'],
  second: ['II Liga', 'Mężczyzn'],
  pomorska: ['Pomorska III', 'Liga Męska'],
  italy: ['SuperLega', 'Credem Banca'],
  japan: ['SV.League', 'Men'],
};

// Keep every official league name intact while splitting it into two lines.
export function leagueNameLines(league) {
  const preferred = TWO_LINE_LABELS[league.id];
  if (preferred && preferred.join(' ') === league.name) return preferred;
  const words = String(league.name || '').trim().split(/\s+/);
  if (words.length < 2) return [words[0] || '', ''];
  const midpoint = Math.max(1, Math.ceil(words.length / 2));
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
}
