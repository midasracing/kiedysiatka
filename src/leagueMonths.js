import { feedDateKey } from './data.js';

// Feed dates are DD.MM.YYYY; month keys remain stable regardless of time zone.
const VALID_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_FORMATTER = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' });

export function leagueMatchMonth(match) {
  const date = feedDateKey(match?.date);
  const key = date.slice(0, 7);
  return VALID_MONTH.test(key) ? key : null;
}

export function leagueMonthKeys(matches) {
  return [...new Set(matches.map(leagueMatchMonth).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
}

export function filterLeagueMatchesByMonth(matches, month) {
  if (month === 'all') return matches;
  return matches.filter(match => leagueMatchMonth(match) === month);
}

export function leagueMonthLabel(month) {
  if (!VALID_MONTH.test(month)) return month;
  const [year, number] = month.split('-').map(Number);
  const label = MONTH_FORMATTER.format(new Date(year, number - 1, 1, 12));
  return label.charAt(0).toLocaleUpperCase('pl-PL') + label.slice(1);
}
