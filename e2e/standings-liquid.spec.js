import { test, expect } from '@playwright/test';
import { pauseClockAt } from './helpers/clock.js';

async function openLeague(page) {
  await page.goto('/#competitions');
  await page.getByRole('option', { name: 'TAURON Liga Mężczyzn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'TAURON Liga Mężczyzn' })).toBeVisible();
}

test('Tabela carries the whole league selector upwards, without a separate corner button', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  if (browserName === 'chromium') {
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openLeague(page);
  // Freeze only after the league-opening curtain has completed, so the swipe
  // animation is still in its entry phase while WebKit reads its keyframes.
  await pauseClockAt(page, new Date('2026-11-04T12:00:00Z'));
  const sourceTabs = page.locator('.vh-competition-detail .vh-league-view-tabs');
  const trigger = sourceTabs.getByRole('tab', { name: 'Tabela' });
  const otherSelected = sourceTabs.getByRole('tab', { name: 'Mecze' });
  const sourceMenuTop = await sourceTabs.locator('.vh-segmented').evaluate(node => node.getBoundingClientRect().top);
  const selectedStyles = await otherSelected.evaluate(node => {
    const style = getComputedStyle(node);
    return { background: style.backgroundColor, color: style.color, radius: style.borderRadius };
  });
  const triggerFont = await trigger.evaluate(node => getComputedStyle(node).fontFamily);
  const pausedSheet = await page.addStyleTag({ content:
    '.vh-standings-fullscreen__surface { animation-play-state: paused !important; }'
  });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'prepare');
  await expect(dialog.locator('.vh-standings-fullscreen__surface')).toHaveCSS('animation-name', 'none');
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('opacity', '0');
  await page.clock.runFor(16);
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'prepare');
  const hasPaintedRows = await dialog.locator('canvas').evaluate(canvas => {
    const context = canvas.getContext('2d');
    const pixels = context.getImageData(0, Math.floor(canvas.height / 2) - 80, canvas.width, 160).data;
    return pixels.some((red, index) => index % 4 === 0 && red > 180 && pixels[index + 1] < 80 && pixels[index + 2] < 80);
  });
  expect(hasPaintedRows).toBe(true);
  await page.clock.runFor(32);

  // Clicking Tabela still selects the source capsule. Its visual duplicate
  // rides with the solid surface instead of leaving a second, stationary menu.
  await expect(trigger).toHaveAttribute('aria-selected', 'true');
  await expect(trigger).toHaveClass(/selected/);
  await expect(trigger).toHaveCSS('background-color', selectedStyles.background);
  await expect(trigger).toHaveCSS('color', selectedStyles.color);
  await expect(trigger).toHaveCSS('border-radius', selectedStyles.radius);

  await expect(dialog).toHaveAttribute('data-liquid-phase', 'enter');
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('animation-name', 'vh-table-content-in');
  // The table now interpolates for 80% of the swipe rather than snapping in
  // during its final third. No canvas blur or position changes are required.
  const tableFadeFrames = await dialog.locator('.vh-standings-warp').evaluate(el =>
    el.getAnimations().flatMap(anim => anim.effect?.getKeyframes?.() || [])
      .filter(frame => frame.opacity != null)
      .map(frame => ({ offset: frame.offset, opacity: Number(frame.opacity) }))
  );
  expect(tableFadeFrames).toContainEqual({ offset: 0.2, opacity: 0 });
  expect(tableFadeFrames).toContainEqual({ offset: 1, opacity: 1 });
  await expect(dialog.locator('.vh-standings-fullscreen__flying-pill')).toHaveCount(0);
  await expect(dialog.locator('.vh-standings-fullscreen__section-title')).toHaveCount(0);
  const scene = await dialog.evaluate(root => {
    const sheet = root.querySelector('.vh-standings-fullscreen__surface');
    const menu = root.querySelector('.vh-standings-fullscreen__travel-menu');
    const header = root.querySelector('.vh-standings-fullscreen__header');
    return {
      panelColor: getComputedStyle(sheet).backgroundColor,
      canvasInside: sheet.contains(root.querySelector('.vh-standings-warp__canvas')),
      sheetAnimation: getComputedStyle(sheet).animationName,
      frameValues: sheet.getAnimations().flatMap(animation =>
        animation.effect?.getKeyframes?.() || []).map(frame => frame.transform).filter(Boolean),
      noClip: getComputedStyle(sheet).clipPath,
      menuAnimation: getComputedStyle(menu).animationName,
      headerAnimation: getComputedStyle(header).animationName,
      menuFont: getComputedStyle(menu.querySelector('button')).fontFamily,
      menuTop: menu.getBoundingClientRect().top,
      originOffset: getComputedStyle(root).getPropertyValue('--vh-sheet-origin-offset').trim(),
      dialogZ: Number(getComputedStyle(root).zIndex),
    };
  });
  expect(scene.panelColor).toBe('rgb(0, 0, 0)');
  expect(scene.canvasInside).toBe(true);
  expect(scene.sheetAnimation).toBe('vh-standings-slide-up');
  expect(scene.frameValues).toHaveLength(2);
  expect(scene.frameValues[0]).not.toBe(scene.frameValues[1]);
  expect(scene.originOffset).toContain('calc(');
  expect(Math.abs(scene.menuTop - sourceMenuTop)).toBeLessThan(2);
  expect(scene.noClip).toBe('none');
  expect(scene.menuAnimation).toBe('vh-travel-menu-in');
  expect(scene.headerAnimation).toBe('vh-slide-header-in');
  expect(scene.menuFont).toBe(triggerFont);
  expect(scene.dialogZ).toBeGreaterThan(100);

  await page.clock.runFor(750);
  // A delayed compositor must not be snapped to its destination by a timer.
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'enter');
  await pausedSheet.evaluate(node => node.remove());
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('opacity', '1');
  const settled = await dialog.locator('.vh-standings-fullscreen__surface').boundingBox();
  expect(Math.abs(settled.y)).toBeLessThan(1);
  expect(Math.abs(settled.height - 844)).toBeLessThan(2);
  await expect(dialog.getByRole('button', { name: 'Zamknij tabelę' })).toHaveCount(0);
  const raisedMenu = dialog.getByRole('tablist', { name: 'Widok rozgrywek' });
  await expect(raisedMenu).toBeVisible();
  await expect(raisedMenu.getByRole('tab', { name: 'Tabela' })).toHaveAttribute('aria-selected', 'true');
  const menuBounds = await raisedMenu.boundingBox();
  expect(menuBounds.y).toBeGreaterThanOrEqual(0);
  expect(menuBounds.y).toBeLessThan(80);
  await expect(dialog.getByRole('button', { name: 'Wstecz' })).toHaveCount(0);
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('transform', 'none');
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('clip-path', 'none');
  expect(errors).toEqual([]);
});

test('The Mecze tab slides the sheet down and restores the league and dock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLeague(page);
  await page.getByRole('tab', { name: 'Tabela' }).click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  // Keep the exit keyframes available to inspect on slow mobile engines.
  await pauseClockAt(page, new Date('2026-11-04T14:00:00Z'));
  await dialog.getByRole('tab', { name: 'Mecze' }).click();
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'exit');
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('animation-name', 'vh-table-content-out');
  const exitTableFade = await dialog.locator('.vh-standings-warp').evaluate(el =>
    el.getAnimations().flatMap(anim => anim.effect?.getKeyframes?.() || [])
      .filter(frame => frame.opacity != null)
      .map(frame => ({ offset: frame.offset, opacity: Number(frame.opacity) }))
  );
  expect(exitTableFade).toContainEqual({ offset: 0.78, opacity: 0 });
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
  expect(exit.values[1]).not.toBe(exit.values[0]);
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
  await dialog.getByRole('tab', { name: 'Mecze' }).click();
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
  await expect(dialog.locator('.vh-standings-warp')).toHaveCSS('opacity', '1');
  await dialog.getByRole('tab', { name: 'Drużyny' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Drużyny' })).toHaveAttribute('aria-selected', 'true');
  expect(await page.locator('#root').evaluate(node => node.inert)).toBe(false);
});

test('the raised menu replaces the corner button and switches directly to Drużyny', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLeague(page);
  await page.getByRole('tab', { name: 'Tabela' }).click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  await expect(dialog.locator('.vh-standings-fullscreen__section-title')).toHaveCount(0);
  const raisedMenu = dialog.getByRole('tablist', { name: 'Widok rozgrywek' });
  await raisedMenu.getByRole('tab', { name: 'Drużyny' }).click();
  await expect(dialog).toHaveCount(0, { timeout: 3500 });
  await expect(page.getByRole('tab', { name: 'Drużyny' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.vh-competition-detail .vh-league-view-tabs')).toBeVisible();
  await expect(page.locator('#root')).not.toHaveJSProperty('inert', true);
});
