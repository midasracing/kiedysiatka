// A stalled league must not hold all other results behind Promise.all forever.
// Use an explicit controller for browsers without AbortSignal.timeout/any.
export async function fetchText(path, signal, timeoutMs = 15000) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(
    new DOMException('Przekroczono czas pobierania danych ligi', 'TimeoutError')
  ), timeoutMs);
  try {
    const response = await fetch(path, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.text();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
