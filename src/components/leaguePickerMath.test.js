import test from 'node:test';
import assert from 'node:assert/strict';
import { PICKER_ROW_HEIGHT, pickerBounds, pickerIndexForOffset, pickerOffsetForIndex } from './leaguePickerMath.js';

test('first and last leagues can align exactly with the lens centre', () => {
  for (const height of [360, 480, 710]) {
    const bounds = pickerBounds(6, height);
    assert.equal(bounds.min, pickerOffsetForIndex(0, height));
    assert.equal(bounds.max, pickerOffsetForIndex(5, height));
    assert.equal(pickerIndexForOffset(bounds.min, height, 6), 0);
    assert.equal(pickerIndexForOffset(bounds.max, height, 6), 5);
  }
});
test('active row follows the scroll and stays inside valid options', () => {
  const height = 520;
  assert.equal(pickerIndexForOffset(pickerOffsetForIndex(2, height), height, 6), 2);
  assert.equal(pickerIndexForOffset(pickerOffsetForIndex(2, height) + PICKER_ROW_HEIGHT * 0.6, height, 6), 3);
  assert.equal(pickerIndexForOffset(-9999, height, 6), 0);
  assert.equal(pickerIndexForOffset(9999, height, 6), 5);
  assert.equal(pickerIndexForOffset(0, height, 0), -1);
});
