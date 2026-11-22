import test from 'node:test';
import assert from 'node:assert/strict';
import { STANDINGS_ROW_HEIGHT, STANDINGS_TOP_INSET, standingsScrollBounds, standingsWarpScale } from './standingsWarpMath.js';

test('first and last league row can each be centered, regardless of viewport height', () => {
  for (const height of [380, 420, 620, 680]) {
    for (const count of [1, 2, 6, 12, 16]) {
      const { min, max } = standingsScrollBounds(count, height);
      const center = index => STANDINGS_TOP_INSET + index * STANDINGS_ROW_HEIGHT + STANDINGS_ROW_HEIGHT / 2;
      assert.equal(center(0) - min, height / 2);
      assert.equal(center(count - 1) - max, height / 2);
      assert.ok(min <= max);
    }
  }
});

test('lens keeps normal width in the middle and strongly widens at both edges', () => {
  const h = 620;
  assert.equal(standingsWarpScale(h / 2, h), 1);
  assert.equal(standingsWarpScale(0, h), 2.9);
  assert.equal(standingsWarpScale(h, h), 2.9);
  assert.ok(standingsWarpScale(100, h) > 1);
  assert.ok(standingsWarpScale(100, h) < 2.9);
});
