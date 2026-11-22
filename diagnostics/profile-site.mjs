import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const label = process.argv[2] || 'local';
if (!/^[a-z0-9_-]+$/i.test(label)) throw new Error('Use a simple report label');
const url = process.argv[3] || 'http://127.0.0.1:5182';
const output = new URL('./artifacts/performance/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    isMobile: true, hasTouch: true, serviceWorkers: 'block',
  });
  // Make font/image network conditions identical between measurements.
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin
    ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame;
    window.__frames = {};
    window.requestAnimationFrame = callback => original(time => {
      const start = performance.now();
      try { return callback(time); }
      finally {
        const key = callback.name || 'anonymous';
        const item = window.__frames[key] ||= { count: 0, total: 0, max: 0, samples: [] };
        const elapsed = performance.now() - start;
        item.count++;
        item.total += elapsed;
        item.max = Math.max(item.max, elapsed);
        item.samples.push(elapsed);
      }
    });
  });
  await page.goto(url + '/#competitions');
  await page.locator('.vh-league-picker__scroll').waitFor();
  await page.waitForTimeout(3000);

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics'))
    .metrics.map(item => [item.name, item.value]));

  async function sample(name, selector) {
    await page.evaluate(() => { window.__frames = {}; });
    const before = await metrics();
    const intervals = await page.evaluate(async ({ name, selector }) => {
      const host = document.querySelector(selector);
      const gaps = [];
      let previous = null;
      for (let index = 0; index < 120; index++) {
        if (name === 'picker') host.scrollTop = (Math.sin(index / 14) * .5 + .5) * 580;
        else host.dispatchEvent(new WheelEvent('wheel', { deltaY: index < 60 ? 5 : -5, cancelable: true }));
        const time = await new Promise(requestAnimationFrame);
        if (previous !== null) gaps.push(time - previous);
        previous = time;
      }
      return gaps;
    }, { name, selector });
    await page.waitForTimeout(100);
    const after = await metrics();
    const durations = {};
    for (const key of ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount']) {
      durations[key] = after[key] - before[key];
    }
    return { metrics: durations, callbacks: await page.evaluate(() => window.__frames), intervals };
  }

  const picker = await sample('picker', '.vh-league-picker__scroll');
  const option = page.getByRole('option', { name: 'TAURON Liga Mężczyzn', exact: true });
  await option.click();
  await page.waitForTimeout(900);
  await option.click();
  await page.getByRole('heading', { name: 'TAURON Liga Mężczyzn', exact: true }).waitFor();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: new URL(`${label}-league.png`, output).pathname });
  await page.getByRole('tab', { name: 'Tabela', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: new URL(`${label}-table.png`, output).pathname });
  const table = await sample('table', '.vh-standings-warp');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const settled = await page.evaluate(() => ({
    animations: document.getAnimations().filter(animation => animation.playState === 'running').length,
    canvas: document.querySelectorAll('canvas').length,
    bodyPosition: document.body.style.position,
    inert: document.getElementById('root').inert,
  }));
  const report = { label, url, browser: browser.version(), cpuThrottling: 4, picker, table, settled, errors };
  await writeFile(new URL(`${label}.json`, output), JSON.stringify(report, null, 2) + '\n');
  console.log(`${label}: ${new URL(`${label}.json`, output).pathname}`);
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
