import test from 'node:test';
import assert from 'node:assert/strict';
import { PICKER_ROW_HEIGHT, leagueNameLines, pickerIndexFromScroll, pickerScrollForIndex, pickerIndentForDistance, pickerFixedScale } from '../src/components/leaguePickerMath.js';

test('native picker scroll positions each of six leagues in the centre', () => {
  for (let i = 0; i < 6; i++) {
    assert.equal(pickerScrollForIndex(i), i * PICKER_ROW_HEIGHT);
    assert.equal(pickerIndexFromScroll(pickerScrollForIndex(i), 6), i);
  }
});
test('picker index is clamped to valid options during momentum overscroll', () => {
  assert.equal(pickerIndexFromScroll(-1000, 6), 0);
  assert.equal(pickerIndexFromScroll(9999, 6), 5);
  assert.equal(pickerIndexFromScroll(0, 0), -1);
  assert.equal(pickerIndexFromScroll(2.6 * PICKER_ROW_HEIGHT, 6), 3);
});

test('supported league names are complete and divided into exactly two lines', () => {
  const cases = [
    ['men', 'TAURON Liga Mężczyzn', ['TAURON Liga', 'Mężczyzn']],
    ['first', 'TAURON 1. Liga Mężczyzn', ['TAURON 1. Liga', 'Mężczyzn']],
    ['second', 'II Liga Mężczyzn', ['II Liga', 'Mężczyzn']],
    ['pomorska', 'Pomorska III Liga Męska', ['Pomorska III', 'Liga Męska']],
    ['italy', 'SuperLega Credem Banca', ['SuperLega', 'Credem Banca']],
    ['japan', 'SV.League Men', ['SV.League', 'Men']],
  ];
  for (const [id, name, expected] of cases) {
    const lines = leagueNameLines({ id, name });
    assert.deepEqual(lines, expected);
    assert.equal(lines.join(' '), name);
  }
});

test('indent is continuous without integer pixel quantization', () => {
  assert.equal(pickerIndentForDistance(0), 54);
  assert.equal(pickerIndentForDistance(58), pickerIndentForDistance(-58));
  assert.ok(pickerIndentForDistance(0.25) < 54);
  assert.ok(pickerIndentForDistance(0.25) > pickerIndentForDistance(1));
  assert.ok(pickerIndentForDistance(116) < pickerIndentForDistance(58));
});

test('text scale is fixed by the available viewport width', () => {
  assert.equal(pickerFixedScale(0, 390), 1);
  assert.equal(pickerFixedScale(100, 390), 1);
  assert.equal(pickerFixedScale(400, 390), (390 - 48 - 12 - 54) / 400);
  assert.equal(pickerFixedScale(400, 428), (428 - 52 - 12 - 54) / 400);
});
