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
  await expect(split.locator('.vh-league-split__gradient')).toHaveCSS('background-image', /linear-gradient/);
  await expect(split.locator('[data-league-row="2"]').first()).toHaveText('II Liga');
  await expect(split.locator('[data-league-row="2"]').last()).toHaveText('Mężczyzn');
  const openFrames = await split.locator('[data-league-row="2"]').first().evaluate(el =>
    el.getAnimations().flatMap(animation =>
      animation.effect?.getKeyframes().map(frame => ({
        offset: frame.offset,
        transform: frame.transform,
        filter: frame.filter,
      })) || []
    ));
  expect(openFrames.map(frame => frame.offset)).toEqual([0, .09, .17, .55, .61, 1]);
  expect(openFrames[1].filter).toBe('brightness(1.36)');
  expect(openFrames[3].transform).toBe(openFrames[4].transform);
  expect(openFrames[3].transform).not.toBe(openFrames[0].transform);
  // Enlarged text must keep natural glyph proportions: scaleX = scaleY.
  for (const frame of [openFrames[3], openFrames[4], openFrames[5]]) {
    const [x, y] = frame.transform.match(/scale\\(([^,]+),\\s*([^)]*)\\)/)?.slice(1).map(Number) || [];
    expect(x).toBeGreaterThan(0);
    expect(x).toBeCloseTo(y, 6);
  }
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
  const fade = closing.locator('.vh-league-split__gradient');
  await expect(fade).toHaveCSS('background-image', /linear-gradient/);
  const keyframeOpacities = await fade.evaluate(el =>
    el.getAnimations().flatMap(animation =>
      animation.effect?.getKeyframes().map(frame => Number(frame.opacity)) || []
    ));
  expect(keyframeOpacities.length).toBeGreaterThanOrEqual(4);
  expect(keyframeOpacities[0]).toBe(0);
  expect(keyframeOpacities.at(-1)).toBe(1);
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
