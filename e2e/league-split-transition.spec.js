import { test, expect } from '@playwright/test';

test('touching the centred league splits two full-width lines and reverse restores the selector', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#competitions');
  const option = page.getByRole('option', { name: 'II Liga Mężczyzn' });
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await option.click();

  const split = page.locator('.vh-league-split');
  await expect(split).toBeVisible();
  await expect(split).toHaveAttribute('data-names', '6');
  await expect(split.locator('.vh-league-split__line')).toHaveCount(12);
  await expect(split.locator('[data-league-row="2"]').first()).toHaveText('II Liga');
  await expect(split.locator('[data-league-row="2"]').last()).toHaveText('Mężczyzn');
  await expect(split.locator('[data-league-row="0"]')).toHaveCount(2);
  await expect(split.locator('[data-league-row="5"]')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'II Liga Mężczyzn' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Mecze' })).toBeVisible();

  await expect(split).toHaveCount(0, { timeout: 5000 });
  await page.getByRole('button', { name: 'Wszystkie rozgrywki' }).click();
  const closing = page.locator('.vh-league-split[data-phase="close"]');
  await expect(closing).toBeVisible();
  // The complete league list is already in the returning curtain; it must
  // not appear only when the selected name animation finally ends.
  await expect(closing).toHaveAttribute('data-names', '6');
  await expect(closing.locator('.vh-league-split__line')).toHaveCount(12);
  await expect(closing.locator('.vh-league-split__heading')).toHaveText('Rozgrywki');
  await expect(page.locator('.vh-league-split')).toHaveCount(0, { timeout: 5000 });
  await expect(page.getByRole('listbox', { name: /Wybierz ligę/ })).toBeVisible();
  await expect(page.getByRole('option', { name: 'II Liga Mężczyzn' }))
    .toHaveAttribute('aria-selected', 'true');
});

test('reduced motion opens and closes a league immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#competitions');
  await page.getByRole('option', { name: 'II Liga Mężczyzn' }).click();
  await expect(page.getByRole('heading', { name: 'II Liga Mężczyzn' })).toBeVisible();
  await expect(page.locator('.vh-league-split')).toHaveCount(0);
  await page.getByRole('button', { name: 'Wszystkie rozgrywki' }).click();
  await expect(page.getByRole('listbox', { name: /Wybierz ligę/ })).toBeVisible();
  await expect(page.locator('.vh-league-split')).toHaveCount(0);
});
