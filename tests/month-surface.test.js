import test from 'node:test';
import assert from 'node:assert/strict';
import { monthSurfacePath } from '../src/monthSurfaceGeometry.js';

const bounds = { left: 5, right: 116, top: 5, bottom: 48, width: 350, height: 126 };
const commandCount = path => (path.match(/[MLQCZ]/g) || []).length;

test('one continuous closed shape morphs from tab to full-width panel', () => {
  const closed = monthSurfacePath(bounds, 0);
  const open = monthSurfacePath(bounds, 1);
  assert.ok(closed.startsWith('M 19 5 '));
  assert.ok(open.startsWith('M 19 5 '));
  assert.notEqual(closed, open);
  assert.equal(commandCount(closed), commandCount(open));
  assert.ok(closed.endsWith('Z'));
  assert.ok(open.endsWith('Z'));
  assert.ok(open.includes('Q 350'));
  assert.ok(!open.includes('NaN'));
});

test('every animation frame keeps the same SVG topology and valid coordinates', () => {
  const count = commandCount(monthSurfacePath(bounds, 0));
  for (let step = 0; step <= 20; step++) {
    const d = monthSurfacePath(bounds, step / 20);
    assert.equal(commandCount(d), count);
    assert.ok(!/NaN|Infinity|undefined/.test(d));
  }
});
