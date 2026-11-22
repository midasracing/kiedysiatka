import { test, expect } from '@playwright/test';

async function openLeague(page) {
  await page.goto('/#favorites');
  await page.getByRole('tab', { name: /Rozgrywki/ }).click();
  await page.locator('.vh-picker-row').filter({ hasText: 'TAURON Liga Mężczyzn' }).click();
  await page.locator('.vh-league-stack .vh-league-main').filter({ hasText: 'TAURON Liga Mężczyzn' }).click();
  await expect(page.getByRole('heading', { name: 'TAURON Liga Mężczyzn' })).toBeVisible();
}

test('Liquid Dive opens from the actual Tabela tab without stretching standings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await openLeague(page);
  const trigger = page.getByRole('tab', { name: 'Tabela' });
  const origin = await trigger.boundingBox();
  const sourceFont = await trigger.evaluate(node => getComputedStyle(node).fontFamily);
  expect(origin).not.toBeNull();
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toBeVisible();
  const coords = await dialog.evaluate(node => {
    const css = getComputedStyle(node);
    return {
      x: Number.parseFloat(css.getPropertyValue('--vh-liquid-x')),
      y: Number.parseFloat(css.getPropertyValue('--vh-liquid-y')),
    };
  });
  expect(coords.x).toBeCloseTo(origin.x + origin.width / 2, 0);
  expect(coords.y).toBeCloseTo(origin.y + origin.height / 2, 0);

  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  await expect(dialog.locator('.vh-standings-fullscreen__liquid')).toHaveCount(0);
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('transform', 'none');
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('clip-path', 'none');
  const title = dialog.locator('.vh-standings-fullscreen__section-title');
  await expect(title).toHaveText('Tabela');
  const font = await title.evaluate(node => getComputedStyle(node).fontFamily);
  expect(font).toBe(sourceFont);

  await dialog.getByRole('button', { name: 'Wstecz' }).click();
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'exit');
  await expect(dialog).toHaveCount(0, { timeout: 3000 });
  await expect(page.getByRole('tab', { name: 'Mecze' })).toHaveAttribute('aria-selected', 'true');
  await expect(trigger).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('Liquid Dive never distorts the full-width standings or overflows titles at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openLeague(page);
  await page.getByRole('tab', { name: 'Tabela' }).click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  await page.evaluate(() => document.fonts.ready);
  const geometry = await dialog.evaluate(root => {
    const warp = root.querySelector('.vh-standings-warp').getBoundingClientRect();
    const heading = root.querySelector('.vh-standings-fullscreen__identity h2').getBoundingClientRect();
    const holder = root.querySelector('.vh-standings-fullscreen__identity').getBoundingClientRect();
    return {
      warpWidth: warp.width, warpHeight: warp.height, vw: innerWidth, vh: innerHeight,
      titleLeft: heading.left, titleRight: heading.right,
      holderLeft: holder.left, holderRight: holder.right,
    };
  });
  expect(geometry.warpWidth).toBeGreaterThanOrEqual(geometry.vw - 1);
  expect(Math.abs(geometry.warpHeight - geometry.vh)).toBeLessThanOrEqual(2);
  expect(geometry.titleLeft).toBeGreaterThanOrEqual(geometry.holderLeft - 1);
  expect(geometry.titleRight).toBeLessThanOrEqual(geometry.holderRight + 2);
});

test('Liquid Dive respects reduced motion and preserves the teams tab on return', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openLeague(page);
  await page.getByRole('tab', { name: 'Drużyny' }).click();
  await page.getByRole('tab', { name: 'Tabela' }).click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active');
  await expect(dialog.locator('.vh-standings-fullscreen__liquid')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Wstecz' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Drużyny' })).toHaveAttribute('aria-selected', 'true');
  expect(await page.locator('#root').evaluate(node => node.inert)).toBe(false);
});


test('ink expands as a black background beneath the content; the surfaced Tabela is a button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLeague(page);
  const original = page.getByRole('tab', { name: 'Tabela' });
  await original.click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toBeVisible();

  const structure = await dialog.evaluate(root => {
    const ink = root.querySelector('.vh-standings-fullscreen__liquid');
    const content = root.querySelector('.vh-standings-fullscreen__surface');
    return {
      inkColor: ink && getComputedStyle(ink).backgroundColor,
      contentColor: content && getComputedStyle(content).backgroundColor,
      inkLayer: ink && Number(getComputedStyle(ink).zIndex),
      contentLayer: content && Number(getComputedStyle(content).zIndex),
      inkAnimation: ink?.getAnimations().map(a => a.animationName) || [],
      contentAnimation: content?.getAnimations().map(a => a.animationName) || [],
    };
  });
  expect(structure.inkColor).toBe('rgb(0, 0, 0)');
  expect(structure.contentColor).toBe('rgba(0, 0, 0, 0)');
  expect(structure.inkLayer).toBeLessThan(structure.contentLayer);
  expect(structure.inkAnimation).toContain('vh-liquid-wipe-in');
  expect(structure.contentAnimation).toContain('vh-liquid-wipe-in');

  const surfaced = dialog.getByRole('button', { name: 'Zamknij tabelę' });
  await expect(surfaced).toHaveText('Tabela');
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  await surfaced.click();
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'exit');
  await expect(dialog).toHaveCount(0, { timeout: 3000 });
  await expect(original).toBeVisible();
});
