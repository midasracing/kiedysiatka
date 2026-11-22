import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchRoundNumber, leagueRounds, matchHasResult,
  recommendedRoundNumber, matchesForRound,
} from '../src/leagueRounds.js';

const match = (round, date, status = 'scheduled', home_sets = 0, away_sets = 0) =>
  ({ round, date, status, home_sets, away_sets, home: 'A', away: 'B' });

test('round numbers come only from match metadata, never dates or match number', () => {
  assert.equal(matchRoundNumber({ round: 6, date: '01.01.2027' }), 6);
  assert.equal(matchRoundNumber({ round: '12' }), 12);
  assert.equal(matchRoundNumber({ date: '01.01.2027', match_number: '006' }), null);
  assert.equal(matchRoundNumber({ round: 'Runda', term_number: 4 }), null);
});

test('all matches in a round sort from earliest to latest, without dropping any', () => {
  const fixtures = [
    match(3, '08.11.2026'), match(2, '01.11.2026'),
    match(3, '03.11.2026'), match(3, '06.11.2026'),
    match(2, '30.10.2026'),
  ];
  const { rounds, reliable } = leagueRounds(fixtures);
  assert.equal(reliable, true);
  assert.deepEqual(rounds.map(x => x.number), [2, 3]);
  assert.deepEqual(rounds[1].matches.map(x => x.date), [
    '03.11.2026', '06.11.2026', '08.11.2026',
  ]);
  assert.equal(matchesForRound(fixtures, rounds, 3).length, 3);
});

test('default advances once every result in a round is finished', () => {
  const source = [
    match(5, '18.11.2026', 'finished', 3, 1),
    match(5, '20.11.2026', 'finished', 3, 2),
    match(6, '26.11.2026'),
    match(6, '27.11.2026'),
    match(7, '03.12.2026'),
  ];
  const all = leagueRounds(source);
  assert.equal(all.rounds[0].complete, true);
  assert.equal(recommendedRoundNumber(all.rounds, '2026-11-22'), 6);
  source[2] = match(6, '26.11.2026', 'finished', 3, 0);
  source[3] = match(6, '27.11.2026', 'finished', 3, 1);
  assert.equal(recommendedRoundNumber(leagueRounds(source).rounds, '2026-11-28'), 7);
});

test('rescheduled fixture does not send the selector to a long-past round', () => {
  const source = [
    match(1, '10.09.2026', 'finished', 3, 0),
    match(1, '10.02.2027'),
    match(10, '20.11.2026'),
    match(10, '22.11.2026'),
    match(11, '29.11.2026'),
    match(11, '30.11.2026'),
  ];
  assert.equal(recommendedRoundNumber(leagueRounds(source).rounds, '2026-11-22'), 10);
});

test('do not mislabel the invalid all-round-one II Liga feed', () => {
  const source = Array.from({ length: 32 }, (_, i) => match(1, `01.${i < 16 ? '10' : '12'}.2026`));
  const { reliable, rounds } = leagueRounds(source);
  assert.equal(reliable, false);
  assert.equal(rounds.length, 0);
  assert.equal(matchesForRound(source, rounds, null).length, 32);
});

test('scheduled 0:0 is never treated as a result, even when postponed', () => {
  assert.equal(matchHasResult(match(1, '20.11.2026', 'scheduled', 0, 0)), false);
  assert.equal(matchHasResult(match(1, '20.11.2026', 'finished', 3, 1)), true);
  assert.equal(matchHasResult({ round: 1, status: 'finished' }), false);
});
