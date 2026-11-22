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
  const selected = page.getByRole('option', { name: 'II Liga Mężczyzn', exact: true });
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => picker.evaluate(node => node.scrollTop)).toBe(232);
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
