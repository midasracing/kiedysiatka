import { feedDateKey, isFinished } from './data.js';

// The ONLY source of the displayed round number is each match's own round.
// Never invent a round from dates, sequential weeks or match_number.
export function matchRoundNumber(match) {
  const value = match?.round;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const raw = String(value).trim();
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const number = Number(raw);
  return Number.isSafeInteger(number) ? number : null;
}

function ordinal(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const time = Date.parse(key + 'T12:00:00Z');
  return Number.isFinite(time) ? time / 86400000 : null;
}

function chronological(a, b) {
  return feedDateKey(a.date).localeCompare(feedDateKey(b.date)) ||
    String(a.time || '').localeCompare(String(b.time || ''), 'pl') ||
    String(a.match_number || a.id || '').localeCompare(String(b.match_number || b.id || ''), 'pl', { numeric: true });
}

export function matchHasResult(match) {
  if (!isFinished(match)) return false;
  if (match.home_sets == null || match.away_sets == null) return false;
  const home = Number(match.home_sets);
  const away = Number(match.away_sets);
  return Number.isFinite(home) && Number.isFinite(away) && (home > 0 || away > 0);
}

// Build rounds from feed metadata; dates order matches WITHIN each round.
export function leagueRounds(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return { rounds: [], reliable: false };
  const buckets = new Map();
  let labeled = 0;
  const allDates = [];
  for (const match of matches) {
    const number = matchRoundNumber(match);
    const day = ordinal(feedDateKey(match.date));
    if (day != null) allDates.push(day);
    if (number === null) continue;
    labeled++;
    if (!buckets.has(number)) buckets.set(number, []);
    buckets.get(number).push(match);
  }
  const rounds = [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([number, list]) => {
    const matchesSorted = [...list].sort(chronological);
    const dates = matchesSorted.map(match => ordinal(feedDateKey(match.date))).filter(x => x != null).sort((a, b) => a - b);
    return {
      number,
      matches: matchesSorted,
      complete: matchesSorted.length > 0 && matchesSorted.every(matchHasResult),
      middleDay: dates.length ? dates[Math.floor((dates.length - 1) / 2)] : null,
    };
  });

  // VolleyStation currently labels hundreds of II Liga fixtures as round 1
  // ("Runda"). That is not meaningful matchweek data; never present it as
  // a fabricated Kolejka 1 covering half a season.
  const span = allDates.length ? Math.max(...allDates) - Math.min(...allDates) : 0;
  const implausiblyFlat = rounds.length === 1 && matches.length > 20 && span > 28;
  const reliable = labeled === matches.length && rounds.length > 0 && !implausiblyFlat;
  return { rounds: reliable ? rounds : [], reliable };
}

// If a round has all real results, advance naturally to the next live or
// upcoming matchweek. Compare median actual dates (rather than assuming
// round numbers imply dates), so rescheduled matches do not trap us in round 1.
export function recommendedRoundNumber(rounds, todayKey) {
  if (!rounds.length) return null;
  const pending = rounds.filter(round => !round.complete);
  if (!pending.length) return rounds[rounds.length - 1].number;
  const today = ordinal(todayKey);
  if (today === null) return pending[0].number;
  const ranked = [...pending].sort((a, b) => {
    const distance = x => x.middleDay == null ? Infinity : Math.abs(x.middleDay - today);
    return distance(a) - distance(b) ||
      // Near-ties prefer the currently pending earlier numbered round.
      a.number - b.number;
  });
  return ranked[0].number;
}

export function matchesForRound(matches, rounds, number) {
  if (!rounds.length) return [...matches].sort(chronological);
  return rounds.find(round => round.number === number)?.matches || [];
}
