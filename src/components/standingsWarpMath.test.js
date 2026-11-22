import test from 'node:test';
import assert from 'node:assert/strict';
import { STANDINGS_ROW_HEIGHT, STANDINGS_TOP_INSET, standingsScrollBounds, standingsWarpScale, standingsWarpSourceY } from './standingsWarpMath.js';

test('first and last league row can each be centered, regardless of viewport height', () => {
  for (const height of [380, 420, 620, 680]) {
    for (const count of [1, 2, 6, 12, 16]) {
      const { min, max } = standingsScrollBounds(count, height);
      const center = index => STANDINGS_TOP_INSET + index * STANDINGS_ROW_HEIGHT + STANDINGS_ROW_HEIGHT / 2;
      assert.equal(center(0) - min, height / 2);
      assert.equal(center(count - 1) - max, height / 2);
      assert.equal(standingsWarpSourceY(height / 2, height), height / 2);
      assert.ok(min <= max);
    }
  }
});

test('centre remains legible and the lens expands both ends beyond the screen', () => {
  const h = 620;
  assert.equal(standingsWarpScale(h / 2, h), 1);
  assert.equal(standingsWarpScale(0, h), 3.25);
  assert.equal(standingsWarpScale(h, h), 3.25);
  assert.equal(standingsWarpScale(h / 2 - 10, h), 1);
  assert.equal(standingsWarpScale(h / 2 + 10, h), 1);
  assert.ok(standingsWarpScale(100, h) > 1);
  assert.ok(standingsWarpScale(100, h) < 3.25);
});

test('vertical depth is symmetric, continuous and monotonic at every screen size', () => {
  for (const h of [380, 420, 620, 680]) {
    assert.equal(standingsWarpSourceY(h / 2, h), h / 2);
    assert.ok(standingsWarpSourceY(0, h) < 0);
    assert.ok(standingsWarpSourceY(h, h) > h);
    let previous = -Infinity;
    for (let y = 0; y <= h; y += 1) {
      const sourceY = standingsWarpSourceY(y, h);
      assert.ok(sourceY > previous);
      assert.ok(Math.abs(sourceY + standingsWarpSourceY(h-y, h) - h) < 1e-9);
      previous = sourceY;
    }
  }
});
