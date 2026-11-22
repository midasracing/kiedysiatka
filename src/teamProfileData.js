import { feedDateKey, isFinished, isLive } from './data.js';
import { sameName } from './nameUtils.js';

// Profiles only use matches from their own league. Sponsor names and teams
// from other competitions must never be silently merged into the record.
export function teamMatchHistory(matches, leagueId, teamName) {
  return (matches || []).filter(match =>
    match.leagueId === leagueId &&
    (sameName(match.home, teamName) || sameName(match.away, teamName)));
}

const orderKey = match => feedDateKey(match.date) + 'T' + String(match.time || '00:00');
const ascending = (a, b) => orderKey(a).localeCompare(orderKey(b));

export function teamProfileSummary(matches, leagueId, teamName, todayKey) {
  const all = teamMatchHistory(matches, leagueId, teamName);
  const completed = all.filter(match =>
    isFinished(match) &&
    match.home_sets != null && match.away_sets != null &&
    Number.isFinite(Number(match.home_sets)) &&
    Number.isFinite(Number(match.away_sets)) &&
    Number(match.home_sets) !== Number(match.away_sets));

  const wins = completed.filter(match => {
    const home = sameName(match.home, teamName);
    return home ? Number(match.home_sets) > Number(match.away_sets)
      : Number(match.away_sets) > Number(match.home_sets);
  }).length;

  const upcoming = all.filter(match =>
    !isFinished(match) && (isLive(match) || (
      match.status !== 'finished' && feedDateKey(match.date) >= todayKey
    ))).sort(ascending);

  return {
    played: completed.length,
    won: wins,
    lost: completed.length - wins,
    upcoming,
    recent: completed.slice().sort((a, b) => ascending(b, a)),
  };
}

// Position and points come exclusively from the official standings source.
export function teamStanding(rows, teamName) {
  if (!Array.isArray(rows)) return null;
  const index = rows.findIndex(row => row?.team && sameName(row.team, teamName));
  if (index < 0) return null;
  const row = rows[index];
  return { position: row.rank ?? index + 1, points: row.points ?? null };
}

// Keep match scores from the selected team's perspective (including away games).
export function teamOpponentPreview(match, teamName) {
  if (!match) return null;
  const home = sameName(match.home, teamName);
  const away = sameName(match.away, teamName);
  if (!home && !away) return null;
  const own = home ? match.home_sets : match.away_sets;
  const rival = home ? match.away_sets : match.home_sets;
  const final = isFinished(match) && own != null && rival != null
    && Number.isFinite(Number(own)) && Number.isFinite(Number(rival))
    && Number(own) !== Number(rival);
  return {
    opponent: home ? match.away : match.home,
    opponentLogo: home ? match.away_logo : match.home_logo,
    ourSets: final ? Number(own) : null,
    theirSets: final ? Number(rival) : null,
    won: final ? Number(own) > Number(rival) : null,
  };
}

export function sortedRoster(players) {
  return (Array.isArray(players) ? players : []).slice().sort((a, b) => {
    const aNumber = Number(a.number);
    const bNumber = Number(b.number);
    const x = a.number != null && Number.isFinite(aNumber) ? aNumber : Infinity;
    const y = b.number != null && Number.isFinite(bNumber) ? bNumber : Infinity;
    return x - y || String(a.full_name || a.name || '').localeCompare(
      String(b.full_name || b.name || ''), 'pl');
  });
}
