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


test('one slow black portal reveals the table and the same selected Tabela pill resurfaces', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLeague(page);
  const original = page.locator('.vh-competition-detail .vh-table-tab');
  const originBox = await original.boundingBox();
  await original.click();
  const dialog = page.getByRole('dialog', { name: /Tabela ligowa/ });
  await expect(dialog).toBeVisible();

  // The black backdrop AND its table are a single clipping element.
  // An independent liquid mask or delayed opacity curtain caused the old jump.
  const scene = await dialog.evaluate(root => {
    const surface = root.querySelector('.vh-standings-fullscreen__surface');
    const css = getComputedStyle(surface);
    const flying = root.querySelector('.vh-standings-fullscreen__flying-pill');
    return {
      background: css.backgroundColor,
      inkLayers: root.querySelectorAll('.vh-standings-fullscreen__liquid').length,
      tableInsidePortal: surface.contains(root.querySelector('.vh-standings-warp')),
      headingInsidePortal: surface.contains(root.querySelector('.vh-standings-fullscreen__identity h2')),
      circleKeyframes: Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(rule =>
            rule.name === 'vh-liquid-open' && rule.cssText.includes('circle('));
        } catch { return false; }
      }),
      hasFlight: !!flying,
      radius: parseFloat(getComputedStyle(root).getPropertyValue('--vh-liquid-radius')),
    };
  });
  expect(scene.background).toBe('rgb(0, 0, 0)');
  expect(scene.inkLayers).toBe(0);
  expect(scene.tableInsidePortal).toBe(true);
  expect(scene.headingInsidePortal).toBe(true);
  expect(scene.circleKeyframes).toBe(true);
  expect(scene.radius).toBeGreaterThan(400);

  await expect(dialog).toHaveAttribute('data-liquid-phase', 'active', { timeout: 5000 });
  // The original selected pill has really been lifted out: no empty white
  // button remains inside the old segmented control during the transition.
  await expect(original).toHaveCSS('opacity', '0');
  await expect(dialog.locator('.vh-standings-fullscreen__flying-pill')).toHaveCount(0);
  const surfaced = dialog.getByRole('button', { name: 'Zamknij tabelę' });
  const design = await surfaced.evaluate(node => {
    const css = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    return {
      background: css.backgroundColor, color: css.color,
      borderRadius: css.borderRadius, fontSize: css.fontSize,
      x: box.left, y: box.top, width: box.width, height: box.height,
    };
  });
  const sourceStyle = await original.evaluate(node => {
    const css = getComputedStyle(node);
    return { background: css.backgroundColor, color: css.color,
      borderRadius: css.borderRadius, fontSize: css.fontSize };
  });
  expect(design.background).toBe(sourceStyle.background);
  expect(design.color).toBe(sourceStyle.color);
  expect(design.borderRadius).toBe(sourceStyle.borderRadius);
  expect(design.fontSize).toBe(sourceStyle.fontSize);
  expect(Math.abs(design.width - originBox.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(design.height - originBox.height)).toBeLessThanOrEqual(1);
  expect(design.x).toBeGreaterThan(originBox.x);
  expect(design.y).toBeLessThan(originBox.y);

  await surfaced.click();
  await expect(dialog).toHaveAttribute('data-liquid-phase', 'exit');
  await expect(dialog).toHaveCount(0, { timeout: 3500 });
  await expect(original).toBeVisible();
});
