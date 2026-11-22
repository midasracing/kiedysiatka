import { test, expect } from '@playwright/test';

async function openLeagueThroughFavorites(page) {
  await page.goto('/#favorites');
  await page.getByRole('tab', { name: /Rozgrywki/ }).click();
  await page.locator('.vh-picker-row').filter({ hasText: 'TAURON Liga Mężczyzn' }).click();
  await page.locator('.vh-league-stack .vh-league-main').filter({ hasText: 'TAURON Liga Mężczyzn' }).click();
  await expect(page.getByRole('heading', { name: 'TAURON Liga Mężczyzn' })).toBeVisible();
}

test('standings open full-screen with a top gradient and return to the league', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLeagueThroughFavorites(page);
  await page.getByRole('tab', { name: 'Tabela' }).click();

  const dialog = page.getByRole('dialog', { name: /Tabela ligowa.*TAURON Liga Mężczyzn/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Wstecz' })).toBeVisible();
  await expect(dialog.locator('.vh-standings-fullscreen__fade')).toBeVisible();
  await expect(dialog.locator('.vh-standings-warp__canvas')).toBeVisible();

  const dimensions = await dialog.evaluate(element => {
    const surface = element.querySelector('.vh-standings-warp').getBoundingClientRect();
    const viewport = window.innerHeight;
    return { width: surface.width, height: surface.height, innerWidth: window.innerWidth, viewport };
  });
  expect(dimensions.width).toBeGreaterThanOrEqual(dimensions.innerWidth - 1);
  expect(Math.abs(dimensions.height - dimensions.viewport)).toBeLessThanOrEqual(2);
  expect(await page.locator('#root').evaluate(root => root.inert)).toBe(true);

  await dialog.getByRole('button', { name: 'Wstecz' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Mecze' })).toHaveAttribute('aria-selected', 'true');
  expect(await page.locator('#root').evaluate(root => root.inert)).toBe(false);
  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible();
});

test('Escape closes fullscreen standings and restores previous teams tab', async ({ page }) => {
  await openLeagueThroughFavorites(page);
  await page.getByRole('tab', { name: 'Drużyny' }).click();
  await page.getByRole('tab', { name: 'Tabela' }).click();
  await expect(page.getByRole('dialog', { name: /Tabela ligowa/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /Tabela ligowa/ })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Drużyny' })).toHaveAttribute('aria-selected', 'true');
});
