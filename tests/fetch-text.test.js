import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchText } from '../src/services/fetchText.js';

function stalledFetch(t) {
  t.mock.method(globalThis, 'fetch', async (_path, { signal }) => {
    if (signal.aborted) throw signal.reason;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  });
}
test('a stalled request is aborted after its deadline', async t => {
  stalledFetch(t);
  await assert.rejects(fetchText('/feed', undefined, 5), { name: 'TimeoutError' });
});
test('caller cancellation interrupts the body download and retains its reason', async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (_path, { signal }) => ({
    ok: true,
    text: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
  }));
  const pending = fetchText('/feed', controller.signal);
  await Promise.resolve();
  const reason = new DOMException('hidden', 'AbortError');
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
});
test('an already cancelled request never waits for the deadline', async t => {
  stalledFetch(t);
  const controller = new AbortController();controller.abort();
  await assert.rejects(fetchText('/feed', controller.signal), { name: 'AbortError' });
});
test('a failed or successful request removes its abort listener', async t => {
  for (const ok of [false, true]) {
    const controller = new AbortController();
    const remove = t.mock.method(controller.signal, 'removeEventListener');
    t.mock.method(globalThis, 'fetch', async () => new Response('body', { status: ok ? 200 : 503 }));
    if (ok) assert.equal(await fetchText('/feed', controller.signal), 'body');
    else await assert.rejects(fetchText('/feed', controller.signal), /HTTP 503/);
    assert.equal(remove.mock.callCount(), 1);
  }
});
