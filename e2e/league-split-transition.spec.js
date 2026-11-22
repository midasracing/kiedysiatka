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
  await expect(split.locator('.vh-league-split__curtain')).toHaveCount(2);
  const curtainFrames = await split.evaluate(node => {
    const top = node.querySelector('.vh-league-split__curtain--top');
    const bottom = node.querySelector('.vh-league-split__curtain--bottom');
    const veil = node.querySelector('.vh-league-split__veil');
    return {
      top: top.getAnimations()[0].effect.getKeyframes(),
      bottom: bottom.getAnimations()[0].effect.getKeyframes(),
      veil: veil.getAnimations()[0].effect.getKeyframes(),
    };
  });
  expect(curtainFrames.top.map(f => f.offset)).toEqual([0, .61, 1]);
  expect(curtainFrames.top[0].transform).toBe(curtainFrames.top[1].transform);
  expect(curtainFrames.bottom[0].transform).toBe(curtainFrames.bottom[1].transform);
  expect(curtainFrames.top[2].transform).toContain('-102%');
  expect(curtainFrames.bottom[2].transform).toContain('102%');
  expect(curtainFrames.veil[1].opacity).toBe('1');
  expect(curtainFrames.veil[2].opacity).toBe('0');
  await expect(page.locator('.vh-competition-detail')).toHaveCSS('opacity', '1');
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
    const [x, y] = frame.transform.match(/scale\(([^,]+),\s*([^)]*)\)/)?.slice(1).map(Number) || [];
    expect(x).toBeGreaterThan(0);
    expect(x).toBeCloseTo(y, 6);
  }
  await expect(split.locator('[data-league-row="0"]')).toHaveCount(2);
  await expect(split.locator('[data-league-row="5"]')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'II Liga Mężczyzn' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Mecze' })).toBeVisible();

  await expect(split).toHaveCount(0, { timeout: 5000 });
  await page.getByRole('button', { name: 'Wstecz' }).click();
  const closing = page.locator('.vh-league-split[data-phase="close"]');
  await expect(closing).toBeVisible();
  // The complete league list is already in the returning curtain; it must
  // not appear only when the selected name animation finally ends.
  await expect(closing).toHaveAttribute('data-names', '6');
  await expect(closing.locator('.vh-league-split__line')).toHaveCount(12);
  await expect(closing.locator('.vh-league-split__curtain')).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Wstecz' }).click();
  await expect(page.getByRole('listbox', { name: /Wybierz ligę/ })).toBeVisible();
  await expect(page.locator('.vh-league-split')).toHaveCount(0);
});

test('league gradient stays pinned to the very top while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#competitions');
  await page.getByRole('option', { name: 'II Liga Mężczyzn' }).click();
  await expect(page.locator('.vh-league-split')).toHaveCount(0, { timeout: 5000 });
  const fade = page.locator('.vh-competition-fixed-fade');
  await expect(fade).toBeVisible();
  await expect(fade).toHaveCSS('position', 'fixed');
  await expect(fade).toHaveCSS('pointer-events', 'none');
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(async () => fade.evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(0);
  await expect(fade).toHaveCSS('background-image', /linear-gradient/);
  await expect(page.getByRole('button', { name: 'Wstecz' })).toHaveCount(1);
});

test('league month chips use the existing filter style and restrict match dates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#competitions');
  await page.getByRole('option', { name: 'II Liga Mężczyzn' }).click();
  await expect(page.locator('.vh-league-split')).toHaveCount(0, { timeout: 5000 });
  const months = page.getByRole('group', { name: 'Miesiąc spotkań' });
  await expect(months).toBeVisible({ timeout: 10000 });
  // The filter is a single narrow ribbon connected to the selected Mecze tab.
  const tabs = page.locator('.vh-league-tabs-with-months');
  await expect(tabs.locator('.vh-month-flow__neck')).toHaveCount(1);
  await expect(months).toHaveCSS('overflow-x', 'auto');
  await expect(months).toHaveCSS('border-top-color', 'rgb(252, 0, 1)');
  await expect(months.locator('.vh-month-flow__option').first()).toHaveCSS('border-radius', '9px');
  const all = months.getByRole('button', { name: 'Wszystkie' });
  await expect(all).toHaveAttribute('aria-pressed', 'true');

  const target = months.locator('button[data-month]').first();
  const month = await target.getAttribute('data-month');
  expect(month).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  await target.click();
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  await expect(target).toHaveClass(/chosen/);
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  const dates = page.locator('.vh-match-date-heading');
  await expect(dates.first()).toBeVisible();
  for (const date of await dates.all()) {
    expect((await date.getAttribute('data-match-date')).slice(0, 7)).toBe(month);
  }
  await all.click();
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('tab', { name: 'Drużyny' }).click();
  await expect(months).toHaveCount(0);
  await page.getByRole('tab', { name: 'Mecze' }).click();
  await expect(months).toBeVisible();
});
