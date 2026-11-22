import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REDLINE_IN_MS, REDLINE_OUT_MS, redlineCoverage,
  redlineIntensity, redlineEase,
} from '../src/redlineWarpMath.js';

test('redline scene has finite, short and asymmetric enter/exit timing', () => {
  assert.equal(REDLINE_IN_MS, 660);
  assert.equal(REDLINE_OUT_MS, 470);
  assert.ok(REDLINE_OUT_MS < REDLINE_IN_MS);
});

test('tunnel is transparent at both endpoints and opaque in its midpoint', () => {
  assert.equal(redlineCoverage(0), 0);
  assert.equal(redlineCoverage(1), 0);
  assert.ok(redlineCoverage(.5) > .94);
  assert.ok(redlineCoverage(.15) < redlineCoverage(.4));
  for (let t = -0.1; t <= 1.1; t += .01) {
    const value = redlineCoverage(t);
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
  }
});

test('perspective stroke energy and easing remain bounded and reversible', () => {
  assert.equal(redlineIntensity(0), 0);
  assert.ok(redlineIntensity(1) < 1e-14);
  assert.ok(redlineIntensity(.5) > .99);
  assert.equal(redlineEase(-1), 0);
  assert.equal(redlineEase(2), 1);
  for (let t = 0; t <= 1; t += .01) {
    assert.ok(redlineIntensity(t) >= 0 && redlineIntensity(t) <= 1);
  }
});
