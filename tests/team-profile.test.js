import test from 'node:test';
import assert from 'node:assert/strict';
import { teamMatchHistory, teamProfileSummary, sortedRoster } from '../src/teamProfileData.js';

const fixture = [
  { leagueId: 'men', home: 'Klub A', away: 'Klub B', date: '17.11.2026', time: '18:00', status: 'finished', home_sets: 3, away_sets: 1 },
  { leagueId: 'men', home: 'Klub C', away: 'Klub A', date: '18.11.2026', time: '20:00', status: 'finished', home_sets: 3, away_sets: 0 },
  { leagueId: 'men', home: 'Klub A', away: 'Klub D', date: '19.11.2026', time: '20:00', status: 'finished', home_sets: 3, away_sets: 2 },
  { leagueId: 'men', home: 'Klub A', away: 'Klub E', date: '20.11.2026', time: '20:00', status: 'scheduled' },
  { leagueId: 'men', home: 'Klub B', away: 'Klub A', date: '26.11.2026', time: '19:00', status: 'scheduled' },
  { leagueId: 'men', home: 'Klub C', away: 'Klub A', date: '24.11.2026', time: '16:00', status: 'live' },
  { leagueId: 'first', home: 'Klub A', away: 'Klub B', date: '18.11.2026', time: '16:00', status: 'finished', home_sets: 0, away_sets: 3 },
  { leagueId: 'men', home: 'Klub A', away: 'Klub B', date: '10.11.2026', time: '20:00', status: 'finished' },
  { leagueId: 'men', home: 'Niepowiązany', away: 'Klub B', date: '23.11.2026', time: '18:00', status: 'finished', home_sets: 3, away_sets: 0 },
];

test('profile filters matches to the correct team and league', () => {
  const history = teamMatchHistory(fixture, 'men', 'KLUB A');
  assert.equal(history.length, 7);
  assert.ok(history.every(match => match.leagueId === 'men'));
});

test('profile counts only finished matches with real set scores', () => {
  const summary = teamProfileSummary(fixture, 'men', 'Klub A', '2026-11-22');
  assert.deepEqual([summary.played, summary.won, summary.lost], [3, 2, 1]);
  assert.deepEqual(summary.recent.map(match => match.date), [
    '19.11.2026', '18.11.2026', '17.11.2026',
  ]);
  assert.deepEqual(summary.upcoming.map(match => match.date), [
    '24.11.2026', '26.11.2026',
  ]);
});

test('profile isolates 1. Liga from Tauron match outcomes', () => {
  const first = teamProfileSummary(fixture, 'first', 'Klub A', '2026-11-22');
  assert.deepEqual([first.played, first.won, first.lost], [1, 0, 1]);
  assert.equal(first.upcoming.length, 0);
});

test('roster respects official shirt numbers and leaves source intact', () => {
  const roster = [{ number: 12, full_name: 'Gracz C' },
    { number: 2, full_name: 'Gracz B' }, { number: null, full_name: 'Gracz D' },
    { number: 1, full_name: 'Gracz A' }];
  const sorted = sortedRoster(roster);
  assert.deepEqual(sorted.map(player => player.full_name), ['Gracz A','Gracz B','Gracz C','Gracz D']);
  assert.equal(roster[0].number, 12);
  assert.deepEqual(sortedRoster(null), []);
});
