import test from 'node:test';
import assert from 'node:assert/strict';
import { leagueTimeline } from '../src/leagueTimeline.js';

const match = (leagueId, date, time, status, group) => ({ leagueId, date, time, status, group });

test('league timeline combines scheduled, live, finished and missing results, newest first', () => {
  const input = [
    match('men', '21.11.2026', '20:00', 'finished'),
    match('men', '22.11.2026', '18:00', 'live'),
    match('men', '23.11.2026', '17:00', 'scheduled'),
    match('first', '24.11.2026', '19:00', 'finished'),
    match('men', '22.11.2026', '16:00', 'scheduled'),
    match('men', '20.11.2026', '10:00', 'scheduled'),
  ];
  const result = leagueTimeline(input, 'men');
  assert.deepEqual(result.map(m => [m.date, m.time]), [
    ['23.11.2026', '17:00'],
    ['22.11.2026', '18:00'],
    ['22.11.2026', '16:00'],
    ['21.11.2026', '20:00'],
    ['20.11.2026', '10:00'],
  ]);
  assert.equal(input[0].date, '21.11.2026');
  assert.equal(input[0].status, 'finished');
});

test('league timeline filters groups and preserves all statuses', () => {
  const input = [
    match('second', '19.11.2026', '18:00', 'finished', 'Grupa 1'),
    match('second', '20.11.2026', '16:00', 'live', 'Grupa 2'),
    match('second', '23.11.2026', '15:00', 'scheduled', 'Grupa 1'),
  ];
  assert.deepEqual(leagueTimeline(input, 'second', 'Grupa 1').map(m => m.date), [
    '23.11.2026', '19.11.2026',
  ]);
  assert.equal(leagueTimeline(input, 'second').length, 3);
  assert.deepEqual(leagueTimeline(input, null), []);
});
