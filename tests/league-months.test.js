import test from 'node:test';
import assert from 'node:assert/strict';
import { leagueMatchMonth, leagueMonthKeys, filterLeagueMatchesByMonth, leagueMonthLabel } from '../src/leagueMonths.js';

const schedule = [
  { date: '28.03.2027', name: 'mar-1' },
  { date: '07.11.2026', name: 'nov' },
  { date: '01.03.2027', name: 'mar-2' },
  { date: '29.10.2026', name: 'oct' },
  { date: 'missing', name: 'unknown' },
];

test('months are unique, ordered newest first, and omit invalid dates', () => {
  assert.deepEqual(leagueMonthKeys(schedule), ['2027-03', '2026-11', '2026-10']);
  assert.equal(leagueMatchMonth(schedule[0]), '2027-03');
  assert.equal(leagueMatchMonth(schedule[4]), null);
});

test('selecting a month filters matches without changing their order', () => {
  assert.deepEqual(filterLeagueMatchesByMonth(schedule, '2027-03').map(item => item.name), ['mar-1', 'mar-2']);
  assert.equal(filterLeagueMatchesByMonth(schedule, 'all'), schedule);
  assert.deepEqual(filterLeagueMatchesByMonth(schedule, '2027-01'), []);
});

test('Polish month names include the year across seasons', () => {
  assert.equal(leagueMonthLabel('2027-03'), 'Marzec 2027');
  assert.equal(leagueMonthLabel('2026-11'), 'Listopad 2026');
});
