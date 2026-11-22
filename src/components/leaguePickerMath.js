// Pixel geometry for the native-scrolling selector. The top/bottom scroll
// spacers center the first and last options without distorting their text.
export const PICKER_ROW_HEIGHT = 116;

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
