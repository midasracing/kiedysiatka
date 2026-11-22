import { feedDateKey } from './data.js';

// All statuses in one list, latest event first; never mutate the shared feed.
export function leagueTimeline(matches, leagueId, group = 'all') {
  if (!leagueId) return [];
  return matches
    .filter(match => match.leagueId === leagueId && (group === 'all' || match.group === group))
    .sort((a, b) => feedDateKey(b.date).localeCompare(feedDateKey(a.date)) ||
      String(b.time || '').localeCompare(String(a.time || '')));
}
