import { shareFeedValue } from '../feedUpdates.js';
import { fetchText } from './fetchText.js';

export function flattenFeed(data, id) {
  if (id !== 'second') return { ...data, matches: Array.isArray(data.matches) ? data.matches : [], teams: Array.isArray(data.teams) ? data.teams : [] };
  const groups = Array.isArray(data.groups) ? data.groups : [];
  return {
    ...data,
    matches: groups.flatMap(group => (group.matches || []).map(match => ({ ...match, group: match.group || group.name }))),
    teams: groups.flatMap(group => group.teams || [])
  };
}
// Requests stay fresh; identical bodies skip parsing and changed bodies retain
// references for unchanged teams and matches. One bounded snapshot per league.
const feedCache = new Map();
export async function fetchLeague(league, signal) {
  const path = (import.meta.env?.BASE_URL ?? './') + 'data/' + league.file;
  const text = await fetchText(path, signal);
  const key = league.id + ':' + path;
  const cached = feedCache.get(key);
  if (cached?.text === text) return cached.data;
  const json = JSON.parse(text);
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('Nieprawidłowy format danych');
  const data = shareFeedValue(cached?.data, flattenFeed(json, league.id));
  feedCache.set(key, { text, data });
  return data;
}
