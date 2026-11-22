import { test, expect } from '@playwright/test';

test('standings open full-screen with a top gradient and return to the league', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#competitions');
  await page.getByRole('button', { name: /01 TAURON Liga Mężczyzn/ }).click();
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

test('Escape closes fullscreen standings and restores previous results tab', async ({ page }) => {
  await page.goto('/#competitions');
  await page.getByRole('button', { name: /01 TAURON Liga Mężczyzn/ }).click();
  await page.getByRole('tab', { name: 'Wyniki' }).click();
  await page.getByRole('tab', { name: 'Tabela' }).click();
  await expect(page.getByRole('dialog', { name: /Tabela ligowa/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /Tabela ligowa/ })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Wyniki' })).toHaveAttribute('aria-selected', 'true');
});
