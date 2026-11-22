import { test, expect } from '@playwright/test';
import { pauseClockAt } from './helpers/clock.js';

async function openLeague(page) {
  await page.goto('/#favorites');
  await page.getByRole('tab', { name: /Rozgrywki/ }).click();
  await page.locator('.vh-picker-row').filter({ hasText: 'TAURON Liga Mężczyzn' }).click();
  await page.locator('.vh-league-stack .vh-league-main').filter({ hasText: 'TAURON Liga Mężczyzn' }).click();
  await expect(page.getByRole('heading', { name: 'TAURON Liga Mężczyzn' })).toBeVisible();
}

test('Tabela slides up as a full black sheet, without pill morph or moving corner button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openLeague(page);
  // Freeze only after the league-opening curtain has completed, so the swipe
  // animation is still in its entry phase while WebKit reads its keyframes.
  await pauseClockAt(page, new Date('2026-11-04T12:00:00Z'));
  const trigger = page.getByRole('tab', { name: 'Tabela' });
  const triggerFont = await trigger.evaluate(node => getComputedStyle(node).fontFamily);
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'enter');
  await expect(dialog.locator('.vh-standings-fullscreen__flying-pill')).toHaveCount(0);
  const scene = await dialog.evaluate(root => {
    const sheet = root.querySelector('.vh-standings-fullscreen__surface');
    const button = root.querySelector('.vh-standings-fullscreen__section-title');
    const header = root.querySelector('.vh-standings-fullscreen__header');
    return {
      panelColor: getComputedStyle(sheet).backgroundColor,
      canvasInside: sheet.contains(root.querySelector('.vh-standings-warp__canvas')),
      sheetAnimation: getComputedStyle(sheet).animationName,
      frameValues: sheet.getAnimations().flatMap(animation =>
        animation.effect?.getKeyframes?.() || []).map(frame => frame.transform).filter(Boolean),
      noClip: getComputedStyle(sheet).clipPath,
      buttonAnimation: getComputedStyle(button).animationName,
      headerAnimation: getComputedStyle(header).animationName,
      buttonFont: getComputedStyle(button).fontFamily,
      dialogZ: Number(getComputedStyle(root).zIndex),
    };
  });
  expect(scene.panelColor).toBe('rgb(0, 0, 0)');
  expect(scene.canvasInside).toBe(true);
  expect(scene.sheetAnimation).toBe('vh-standings-slide-up');
  expect(scene.frameValues).toHaveLength(2);
  expect(scene.frameValues[0]).toContain('100%');
  expect(scene.frameValues[1]).not.toContain('100%');
  expect(scene.noClip).toBe('none');
  expect(scene.buttonAnimation).toBe('none');
  expect(scene.headerAnimation).toBe('vh-slide-header-in');
  expect(scene.buttonFont).toBe(triggerFont);
  expect(scene.dialogZ).toBeGreaterThan(100);

  await page.clock.runFor(750);
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  await expect(dialog.getByRole('button', { name: 'Zamknij tabelę' })).toBeVisible();
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('transform', 'none');
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('clip-path', 'none');
  expect(errors).toEqual([]);
});

test('Wstecz slides the whole sheet down and restores the league and dock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLeague(page);
  await page.getByRole('tab', { name: 'Tabela' }).click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  // Keep the exit keyframes available to inspect on slow mobile engines.
  await pauseClockAt(page, new Date('2026-11-04T14:00:00Z'));
  await dialog.getByRole('button', { name: 'Wstecz' }).click();
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'exit');
  const exit = await dialog.evaluate(root => {
    const sheet = root.querySelector('.vh-standings-fullscreen__surface');
    const header = root.querySelector('.vh-standings-fullscreen__header');
    return {
      name: getComputedStyle(sheet).animationName,
      duration: getComputedStyle(sheet).animationDuration,
      values: sheet.getAnimations().flatMap(animation =>
        animation.effect?.getKeyframes?.() || []).map(frame => frame.transform).filter(Boolean),
      header: getComputedStyle(header).animationName,
      flyers: root.querySelectorAll('.vh-standings-fullscreen__flying-pill').length,
    };
  });
  expect(exit.name).toBe('vh-standings-slide-down');
  expect(exit.duration).toBe('0.54s');
  expect(exit.values).toHaveLength(2);
  expect(exit.values[0]).not.toContain('100%');
  expect(exit.values[1]).toContain('100%');
  expect(exit.header).toBe('vh-slide-header-out');
  expect(exit.flyers).toBe(0);
  await page.clock.runFor(650);
  await expect(dialog).toHaveCount(0, { timeout: 3500 });
  await expect(page.getByRole('tab', { name: 'Mecze' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Tabela' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible();
  await expect(page.locator('#root')).not.toHaveJSProperty('inert', true);
});

test('league title stays in one position and only changes red to white', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLeague(page);
  await page.evaluate(() => document.fonts.ready);
  const source = page.locator('.vh-competition-heading h1');
  const before = await source.boundingBox();
  const font = await source.evaluate(node => getComputedStyle(node).fontSize);
  await page.getByRole('tab', { name: 'Tabela' }).click();

  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  const title = dialog.locator('.vh-standings-fullscreen__identity h2');
  await expect(title).toHaveCount(1);
  await expect(source).toHaveCSS('visibility', 'hidden');
  const after = await title.boundingBox();
  expect(Math.abs(after.x - before.x)).toBeLessThan(2);
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  expect(Math.abs(after.width - before.width)).toBeLessThan(3);
  await expect(title).toHaveCSS('font-size', font);
  await expect(title).toHaveCSS('animation-name', 'vh-slide-title-in');
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  await expect(title).toHaveCSS('color', 'rgb(255, 255, 255)');
  await dialog.getByRole('button', { name: 'Wstecz' }).click();
  await expect(title).toHaveCSS('animation-name', 'vh-slide-title-out');
  await expect(dialog).toHaveCount(0, { timeout: 3500 });
  await expect(source).toHaveCSS('visibility', 'visible');
  await expect(source).toHaveCSS('color', 'rgb(252, 0, 1)');
});

test('table viewport stays full size at 320px; swipe does not rescale rows', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openLeague(page);
  await page.getByRole('tab', { name: 'Tabela' }).click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  await page.evaluate(() => document.fonts.ready);
  const bounds = await dialog.evaluate(root => {
    const warp = root.querySelector('.vh-standings-warp').getBoundingClientRect();
    const heading = root.querySelector('.vh-standings-fullscreen__identity h2').getBoundingClientRect();
    return { width: warp.width, height: warp.height,
      viewportW: innerWidth, viewportH: innerHeight,
      headingLeft: heading.left, headingRight: heading.right };
  });
  expect(bounds.width).toBeGreaterThanOrEqual(bounds.viewportW - 1);
  expect(Math.abs(bounds.height - bounds.viewportH)).toBeLessThan(3);
  expect(bounds.headingLeft).toBeGreaterThanOrEqual(-1);
  expect(bounds.headingRight).toBeLessThanOrEqual(bounds.viewportW + 2);
});

test('reduced motion and previous Teams selection return instantly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openLeague(page);
  await page.getByRole('tab', { name: 'Drużyny' }).click();
  await page.getByRole('tab', { name: 'Tabela' }).click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active');
  await expect(dialog.locator('.vh-standings-fullscreen__surface')).toHaveCSS('animation-name', 'none');
  await dialog.getByRole('button', { name: 'Wstecz' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Drużyny' })).toHaveAttribute('aria-selected', 'true');
  expect(await page.locator('#root').evaluate(node => node.inert)).toBe(false);
});
