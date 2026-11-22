import { test, expect } from '@playwright/test';

test('a provisional unstyled picker layout cannot erase the selected league', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.id = 'provisional-picker-layout';
      style.textContent = '.vh-league-picker__scroll { height:112px !important; bottom:auto !important; padding:0 !important } .vh-league-picker__option { display:none !important }';
      document.head.append(style);
    }, { once: true });
  });
  await page.goto('/#competitions');
  const picker = page.getByRole('listbox', { name: /Wybierz ligę/ });
  await expect(picker).toBeVisible();
  // Let the provisional resize and its queued frame run before CSS settles.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.locator('#provisional-picker-layout').evaluate(style => style.remove());
  const first = picker.getByRole('option', { name: 'TAURON Liga Mężczyzn', exact: true });
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => picker.evaluate(node => node.scrollTop)).toBe(0);

  // The initial option is now the first league. Also exercise a nonzero
  // selection so a clamped provisional offset cannot silently reset it.
  await picker.press('ArrowDown');
  await picker.press('ArrowDown');
  const selected = picker.getByRole('option', { name: 'II Liga Mężczyzn', exact: true });
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => picker.evaluate(node => node.scrollTop)).toBe(232);
  await page.evaluate(async () => {
    const style = document.createElement('style');
    style.textContent = '.vh-league-picker__scroll { height:112px !important; bottom:auto !important; padding:0 !important } .vh-league-picker__option { display:none !important }';
    document.head.append(style);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    style.remove();
  });
  await expect.poll(() => picker.evaluate(node => node.scrollTop)).toBe(232);
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => selected.evaluate(option => {
    const host = option.closest('.vh-league-picker__scroll').getBoundingClientRect();
    const row = option.getBoundingClientRect();
    return Math.abs(row.top + row.height / 2 - host.top - host.height / 2);
  })).toBeLessThan(2);
  await selected.click();
  await expect(page.getByRole('heading', { name: 'II Liga Mężczyzn', exact: true })).toBeVisible();
});

test('a fast failing logo keeps its initials and a new logo can load after refresh', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let logo = '/audit-logo-failed.svg';
  await page.route('**/data/*.json', route => route.fulfill({ json:
    route.request().url().includes('/tauron.json')
      ? { teams: [{ name: 'Audit Team', logo }], matches: [] }
      : { teams: [], matches: [], groups: [] }
  }));
  await page.route('**/audit-logo-failed.svg', route => route.fulfill({ status: 404, body: '' }));
  await page.route('**/audit-logo-ok.svg', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>'
  }));
  await page.goto('/#favorites');
  const row = page.locator('.vh-picker-row').filter({ hasText: 'Audit Team' });
  await row.scrollIntoViewIfNeeded();
  await expect(row.locator('.team-mark')).toHaveText('AT');
  await expect(row.locator('img')).toHaveCount(0);
  logo = '/audit-logo-ok.svg';
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(row.locator('img')).toHaveAttribute('src', logo);
  await expect.poll(() => row.locator('img').evaluate(image => image.naturalWidth)).toBe(40);
  await expect(row.locator('.team-mark')).toHaveCount(0);
});

test('resizing the viewport preserves the selected league and its centered position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto('/#competitions');
  const picker = page.getByRole('listbox', { name: /Wybierz ligę/ });
  const selected = picker.getByRole('option', { name: 'TAURON Liga Mężczyzn', exact: true });
  const centerDistance = () => selected.evaluate(option => {
    const host = option.closest('.vh-league-picker__scroll').getBoundingClientRect();
    const row = option.getBoundingClientRect();
    return Math.abs(row.top + row.height / 2 - host.top - host.height / 2);
  });
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await expect.poll(centerDistance).toBeLessThan(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(centerDistance).toBeLessThan(2);
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await selected.click();
  await expect(page.getByRole('heading', { name: 'TAURON Liga Mężczyzn', exact: true })).toBeVisible();
});

test('picker scroll moves red text smoothly without rescaling each frame', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#competitions');
  const picker = page.getByRole('listbox', { name: /Wybierz ligę/ });
  await expect(picker).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const readAt = offset => picker.evaluate(async (scroller, next) => {
    // Disable native snapping only while measuring intermediate positions.
    scroller.style.scrollSnapType = 'none';
    scroller.scrollTop = next;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const transform = scroller.querySelector('.vh-league-picker__label').style.transform;
    const scale = transform.match(/scaleX\(([^)]+)\)/);
    const x = transform.match(/translate3d\(([^p]+)px/);
    return { scale: Number(scale?.[1]), x: Number(x?.[1]) };
  }, offset);
  await expect.poll(async () => (await readAt(0)).x).toBeGreaterThan(50);
  const a = await readAt(0);
  const b = await readAt(53.25);
  const c = await readAt(82.6);
  expect(a.scale).toBe(b.scale);
  expect(b.scale).toBe(c.scale);
  expect(a.x).toBeGreaterThan(b.x);
  expect(b.x).toBeGreaterThan(c.x);
  expect(b.x % 1).not.toBe(0);
});
