import { test, expect } from '@playwright/test';

test('league selector opens league details with a reversible split transition', async ({ page }) => {
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('/#competitions');
  await expect(page.getByRole('heading', { name: 'Rozgrywki' })).toBeVisible();
  await expect(page.locator('[data-route="competitions"] .vh-competitions-topfade')).toBeVisible();
  await expect(page.locator('#ios-matches .vh-floating-head')).toHaveCount(0);
  await expect(page.getByText('Przesuń palcem i wybierz ligę.')).toHaveCount(0);
  const picker = page.getByRole('listbox', { name: /Wybierz ligę/ });
  await expect(picker).toBeVisible();
  const frame = await picker.evaluate(node => ({
    height: node.getBoundingClientRect().height,
    viewport: window.innerHeight,
    top: node.getBoundingClientRect().top,
  }));
  expect(frame.height).toBeGreaterThanOrEqual(frame.viewport - 2);
  expect(frame.top).toBeLessThanOrEqual(2);
  await expect(picker.locator('canvas')).toHaveCount(0);
  await expect(picker).toHaveCSS('overflow-y', 'auto');
  await expect(picker.getByRole('option').first()).toHaveCSS('color', 'rgb(252, 0, 1)');
  await expect(picker.getByRole('option')).toHaveCount(6);
  await expect(picker.locator('.vh-league-picker__line')).toHaveCount(12);
  const first = picker.getByRole('option', { name: 'TAURON Liga Mężczyzn' });
  await expect(first.locator('.vh-league-picker__line').first()).toHaveText('TAURON Liga');
  await expect(first.locator('.vh-league-picker__line').last()).toHaveText('Mężczyzn');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => first.evaluate(element => {
    const option = element.getBoundingClientRect();
    const viewport = element.parentElement.getBoundingClientRect();
    return Math.abs((option.top + option.height / 2) - (viewport.top + viewport.height / 2));
  })).toBeLessThan(2);
  await expect(page.getByRole('tablist', { name: 'Region rozgrywek' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Dostępne ligi' })).toHaveCount(0);
  await expect(page.locator('[data-route="competitions"] .vh-league-stack')).toHaveCount(0);
  await picker.focus();
  const scroller = picker;
  await scroller.evaluate(node => {
    // A real swipe/wheel cancels any programmatic centering in progress.
    node.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    node.scrollTop = 4 * 116;
  });
  await expect(picker.getByRole('option', { name: 'SuperLega Credem Banca' }))
    .toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(picker.getByRole('option', { name: 'SV.League Men' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(picker.getByRole('option', { name: 'TAURON Liga Mężczyzn' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'TAURON Liga Mężczyzn' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Widok rozgrywek' })).toBeVisible();
  await expect(page.locator('.vh-league-split')).toHaveCount(0, { timeout: 5000 });
  await page.getByRole('button', { name: 'Wstecz' }).click();
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('option', { name: 'TAURON Liga Mężczyzn' }))
    .toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.vh-league-split')).toHaveCount(0, { timeout: 5000 });
  expect(failures).toEqual([]);
});

test('renders React navigation and shared match design', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^(Dzisiaj|Najbliższe mecze)$/ })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await nav.getByRole('button', { name: 'Kalendarz' }).click();
  await expect(page.locator('.vh-calendar-month')).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Wybierz dzień' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Wszystkie ligi' })).toBeVisible();
  await nav.getByRole('button', { name: 'Rozgrywki' }).click();
  await expect(page.getByRole('heading', { name: 'Rozgrywki' })).toBeVisible();
  await expect(page.locator('.vh-tab-panel:not([hidden])').getByRole('listbox', { name: /Wybierz ligę/ })).toBeVisible();
});

test('home starts with match list, without the marked intro and hero banner', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('img', { name: 'Kiedy Siatka?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Szukaj', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /^(Dzisiaj|Najbliższe mecze)$/ })).toBeVisible();
  await expect(page.locator('.vh-hero')).toHaveCount(0);
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Volley Hub', exact: true })).toHaveCount(0);
  await expect(page.getByText('Twoje centrum siatkówki. Wszystko, co ważne, w jednym miejscu.')).toHaveCount(0);
  await expect(page.locator('[data-route="home"]').getByRole('button', { name: 'Pełny terminarz' })).toHaveCount(0);
  const logoBox = await page.locator('.vh-brand-signature').boundingBox();
  const titleBox = await page.locator('.vh-home-heading').boundingBox();
  expect(logoBox.x + logoBox.width + 16).toBeLessThanOrEqual(titleBox.x);
  expect(Math.abs(logoBox.y + logoBox.height - titleBox.y - titleBox.height)).toBeLessThan(4);

});

test('favorites show only saved teams and leagues and allow removal', async ({ page }) => {
  await page.goto('/#favorites');
  await page.evaluate(() => localStorage.setItem('vh-favs', JSON.stringify({
    teams: ['Przykładowa drużyna'],
    leagues: ['TAURON Liga Mężczyzn'],
  })));
  await page.reload();

  const screen = page.locator('[data-route="favorites"] .vh-favorites-screen');
  const tabs = screen.getByRole('tablist', { name: 'Rodzaj ulubionych' });
  await expect(tabs.getByRole('tab', { name: /Drużyny\s+1/ })).toHaveAttribute('aria-selected', 'true');
  const teamsPanel = screen.getByRole('tabpanel', { name: 'Polubione drużyny' });
  await expect(teamsPanel.getByText('Przykładowa drużyna')).toBeVisible();
  await expect(teamsPanel.locator('.vh-team-tile')).toHaveCount(1);
  await expect(screen.locator('.vh-search-input, .vh-picker-list, .vh-empty, .vh-section-heading')).toHaveCount(0);

  await tabs.getByRole('tab', { name: /Rozgrywki\s+1/ }).click();
  await expect(tabs.getByRole('tab', { name: /Rozgrywki\s+1/ })).toHaveAttribute('aria-selected', 'true');
  const leaguesPanel = screen.getByRole('tabpanel', { name: 'Polubione rozgrywki' });
  await expect(leaguesPanel.getByText('TAURON Liga Mężczyzn')).toBeVisible();
  await expect(leaguesPanel.locator('.vh-league-tile')).toHaveCount(1);
  await expect(screen.getByRole('tabpanel', { name: 'Polubione drużyny' })).toHaveCount(0);

  await leaguesPanel.getByRole('button', { name: 'Usuń z ulubionych: TAURON Liga Mężczyzn' }).click();
  await expect(tabs.getByRole('tab', { name: /Rozgrywki\s+0/ })).toBeVisible();
  await expect(screen.locator('.vh-league-tile')).toHaveCount(0);
  await tabs.getByRole('tab', { name: /Drużyny\s+1/ }).click();
  await screen.getByRole('button', { name: 'Usuń z ulubionych: Przykładowa drużyna' }).click();
  await expect(tabs.getByRole('tab', { name: /Drużyny\s+0/ })).toBeVisible();
  await expect(screen.locator('.vh-team-grid, .vh-empty, .vh-picker-list')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vh-favs'))))
    .toEqual({ teams: [], leagues: [] });
  await page.reload();
  await expect(tabs.getByRole('tab', { name: /Drużyny\s+0/ })).toBeVisible();
});

test('saved favorite league opens its details from Ulubione', async ({ page }) => {
  await page.goto('/#favorites');
  await page.evaluate(() => localStorage.setItem('vh-favs', JSON.stringify({
    teams: [],
    leagues: ['TAURON Liga Mężczyzn'],
  })));
  await page.reload();
  await page.getByRole('tablist', { name: 'Rodzaj ulubionych' })
    .getByRole('tab', { name: /Rozgrywki/ }).click();
  await page.getByRole('tabpanel', { name: 'Polubione rozgrywki' })
    .locator('.vh-league-main').click();
  await expect(page.locator('#main-content')).toHaveAttribute('data-page', 'competitions');
  await expect(page.locator('[data-route="competitions"]')
    .getByRole('heading', { name: 'TAURON Liga Mężczyzn' })).toBeVisible();
});

test('Kiedy Siatka SVG loads without an animated or hidden logo', async ({ page }) => {
  await page.goto('/');
  const logo = page.getByRole('img', { name: 'Kiedy Siatka?' });
  await expect(logo).toBeVisible();
  await expect(page.locator('.vh-brand-signature img')).toHaveCount(1);
  const vector = await page.evaluate(async () => {
    const img = document.querySelector('.vh-brand-signature img');
    const res = await fetch(img.currentSrc, { cache: 'no-store' });
    return await res.text();
  });
  expect(vector).toContain('viewBox="0 0 1180 655"');
  expect((vector.match(/<path /g) || []).length).toBe(15);
  expect(vector).not.toContain('<image ');
  expect(vector).not.toContain('<text ');
  await expect.poll(() => logo.evaluate(img => img.naturalWidth)).toBe(1180);
  await expect.poll(() => logo.evaluate(img => img.naturalHeight)).toBe(655);
  await expect(page.locator('.vh-brand-tech, .vh-brand-tech-fallback, .tech-text, .vh-rive-layer, .vh-wordmark-icon')).toHaveCount(0);
  await expect(page.locator('.vh-brand-signature canvas')).toHaveCount(0);
  await expect(page.locator('.vh-floating-head img')).toHaveCount(1);
});

test('Kiedy Siatka wordmark stays static in reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const logo = page.getByRole('img', { name: 'Kiedy Siatka?' });
  await expect(logo).toBeVisible();
  expect(await logo.evaluate(img => getComputedStyle(img).animationName)).toBe('none');
  await expect(page.locator('.vh-brand-signature canvas')).toHaveCount(0);
});

test('favorites has no logo and its heading matches Rozgrywki typography', async ({ page }) => {
  for (const width of [320, 375, 430, 768]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto('/#competitions');
    const competition = page.locator('.vh-competitions-topfade h1');
    await expect(competition).toBeVisible();
    const typography = await competition.evaluate(el => {
      const css = getComputedStyle(el);
      return { family: css.fontFamily, size: css.fontSize, weight: css.fontWeight, lineHeight: css.lineHeight };
    });

    await page.goto('/#favorites');
    await expect(page.locator('#ios-matches .vh-floating-head, #ios-matches .vh-brand-signature')).toHaveCount(0);
    const favorites = page.locator('[data-route="favorites"]');
    const heading = favorites.getByRole('heading', { name: 'Ulubione', exact: true });
    await expect(heading).toBeVisible();
    const style = await heading.evaluate(el => {
      const css = getComputedStyle(el);
      return { family: css.fontFamily, size: css.fontSize, weight: css.fontWeight, lineHeight: css.lineHeight };
    });
    expect(style).toEqual(typography);
    const tabs = favorites.getByRole('tablist', { name: 'Rodzaj ulubionych' });
    await expect(tabs).toBeVisible();
    const positions = await page.evaluate(() => ({
      headingBottom: document.querySelector('[data-route="favorites"] .vh-favorites-heading').getBoundingClientRect().bottom,
      tabsTop: document.querySelector('[data-route="favorites"] .vh-favorites-tabs').getBoundingClientRect().top,
    }));
    expect(positions.tabsTop).toBeGreaterThan(positions.headingBottom);
    await expect(favorites.getByText('Twoje drużyny i ligi. Zawsze pod ręką.')).toHaveCount(0);
    await expect(favorites.locator('.vh-favorites-screen').locator('input, .vh-empty, .vh-picker-list, .vh-team-grid, .vh-league-stack')).toHaveCount(0);
  }
});

test('old Rive wordmark assets are no longer used', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.vh-rive-layer')).toHaveCount(0);
  await expect(page.locator('.vh-wordmark-icon')).toHaveCount(0);
});


test('single opaque red lens without leftover legacy glass layers', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await expect(nav.locator('.vh-nav-lens .glass-surface')).toHaveCount(0);
  await expect(nav.locator('.vh-nav-lens .fluid-glass')).toHaveCount(0);
  await expect(page.locator('.glass-surface')).toHaveCount(0);
  await expect(page.locator('.fluid-glass')).toHaveCount(0);
  for (const name of ['Główna', 'Kalendarz', 'Rozgrywki', 'Ulubione']) {
    await expect(nav.getByRole('button', { name })).toBeVisible();
  }
  await nav.getByRole('button', { name: 'Ulubione' }).click();
  await expect(nav.locator('.vh-nav-lens .glass-surface')).toHaveCount(0);
});

test('rapid switches keep one live screen and menu in sync, without cloning page lists', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  for (const [name, route] of [
    ['Kalendarz','matches'], ['Ulubione','favorites'], ['Rozgrywki','competitions'], ['Główna','home']
  ]) {
    await nav.getByRole('button', { name }).evaluate(button => button.click());
    await expect(nav.locator('.vh-nav-items')).toHaveAttribute('data-active', route);
    await expect(page.locator('#main-content')).toHaveAttribute('data-page', route);
    await expect(page.locator('.vh-page')).toHaveCount(1);
    await expect(page.locator('.vh-page-exit')).toHaveCount(0);
  }
});

test('switching tabs renders the page immediately without delayed transitions', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await nav.getByRole('button', { name: 'Kalendarz' }).click();
  await expect(page.locator('#main-content').locator('.vh-calendar-month')).toBeVisible();
  await expect(page.locator('#main-content')).toHaveCSS('animation-name', 'none');
  await expect(nav.getByRole('button', { name: 'Kalendarz' })).toHaveAttribute('aria-current', 'page');
  const label = nav.locator('.vh-nav-item.active > span');
  await expect(label).toHaveCSS('display', 'block');
  await expect.poll(() => label.evaluate(el => parseFloat(getComputedStyle(el).maxWidth))).toBeGreaterThan(0);
  await expect(page.locator('.vh-page-exit')).toHaveCount(0, { timeout: 3000 });
  await nav.getByRole('button', { name: 'Ulubione' }).click();
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Ulubione' })).toBeVisible();
  await expect(page.locator('.vh-route-stage')).toHaveClass(/is-forward/);
  await nav.getByRole('button', { name: 'Główna' }).click();
  await expect(page.getByRole('heading', { name: /^(Dzisiaj|Najbliższe mecze)$/ })).toBeVisible();
  await expect(page.locator('.vh-route-stage')).toHaveClass(/is-backward/);
  await expect(nav.locator('.vh-nav-item.active')).toHaveCount(1);
});

test('reduced motion skips page exit transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Główna nawigacja' })
    .getByRole('button', { name: 'Rozgrywki' }).click();
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Rozgrywki' })).toBeVisible();
  await expect(page.locator('.vh-page-exit')).toHaveCount(0);
  await expect(page.locator('.vh-page-enter')).toHaveCount(0);
  expect(await page.locator('#main-content').evaluate(el => el.getAnimations().length)).toBe(0);
});

test('quick tab changes keep navigation and content synchronized', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await nav.getByRole('button', { name: 'Kalendarz' }).click();
  await nav.getByRole('button', { name: 'Rozgrywki' }).click();
  await nav.getByRole('button', { name: 'Ulubione' }).click();
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Ulubione' })).toBeVisible();
  await expect(nav.locator('.vh-nav-item.active')).toHaveCount(1);
  await expect(page.locator('.vh-page-exit')).toHaveCount(0, { timeout: 3000 });
  await page.goBack();
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Rozgrywki' })).toBeVisible();
});

test('liquid lens moves with one interruptible spring, not a CSS lens transition', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  const lens = nav.locator('.vh-nav-lens');
  const track = nav.locator('.vh-nav-items');
  await expect(track).toHaveClass(/is-ready/);
  await expect(lens).toBeVisible();

  const computed = await nav.evaluate(root => ({
    lensTransition: getComputedStyle(root.querySelector('.vh-nav-lens')).transitionDuration,
    tabTransition: getComputedStyle(root.querySelector('.vh-nav-item')).transitionDuration,
    trackProperties: getComputedStyle(root.querySelector('.vh-nav-items')).transitionProperty
  }));
  expect(computed.lensTransition).toBe('0s');
  // The button never animates layout/color; only its small glyph and the
  // red lens use compositor transforms, avoiding content flashes.
  expect(computed.tabTransition).toBe('0s');
  expect(computed.trackProperties).not.toContain('grid-template-columns');

  const left = async () => lens.evaluate(el =>
    new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
  const initial = await left();
  await nav.getByRole('button', { name: 'Rozgrywki' }).click();
  await expect(track).toHaveAttribute('data-active', 'competitions');
  await lens.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.ready)));
  await page.waitForTimeout(60);
  const inFlight = await left();
  expect(inFlight).toBeGreaterThan(initial);

  // Dispatch immediately: Playwright's standard click waits for moving
  // elements to become stable, which would skip the interruption case.
  await nav.getByRole('button', { name: 'Kalendarz' }).evaluate(el => el.click());
  await expect(track).toHaveAttribute('data-active', 'matches');
  await page.waitForTimeout(850);
  const settled = await left();
  const target = await nav.getByRole('button', { name: 'Kalendarz' }).evaluate(el =>
    el.getBoundingClientRect().left - el.parentElement.getBoundingClientRect().left);
  expect(Math.abs(settled - target)).toBeLessThan(0.6);
  await expect(page.locator('#main-content').locator('.vh-calendar-month')).toBeVisible();
});

test('reduced motion snaps the liquid lens immediately to its selected tab', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  const targetButton = nav.getByRole('button', { name: 'Ulubione' });
  await targetButton.click();
  const difference = await nav.evaluate(root => {
    const lens = root.querySelector('.vh-nav-lens');
    const selected = root.querySelector('.vh-nav-item.active');
    return Math.abs(lens.getBoundingClientRect().left - selected.getBoundingClientRect().left);
  });
  expect(difference).toBeLessThan(0.6);
});

test('buttons remain separated throughout the transition at 320px and 375px',async({page})=>{
  for(const width of [320,375]){
    await page.setViewportSize({width,height:760});
    await page.goto('/');
    const nav=page.getByRole('navigation',{name:'Główna nawigacja'});
    for(const name of ['Kalendarz','Rozgrywki','Ulubione','Główna']){
      await nav.getByRole('button',{name}).click();
      for(const pause of [60,100,130,260]){
        await page.waitForTimeout(pause);
        const positions=await nav.locator('.vh-nav-item').evaluateAll(items=>items.map(item=>{
          const rect=item.getBoundingClientRect();
          return {left:rect.left,right:rect.right};
        }));
        for(let i=1;i<positions.length;i++){
          expect(positions[i].left+1).toBeGreaterThanOrEqual(positions[i-1].right);
        }
      }
    }
  }
});

test('menu remains aligned and readable at narrow mobile widths', async ({ page }) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
    for (const name of ['Kalendarz', 'Rozgrywki', 'Ulubione', 'Główna']) {
      await nav.getByRole('button', { name }).click();
      await expect(nav.getByRole('button', { name })).toHaveAttribute('aria-current', 'page');
      const rects = await nav.evaluate(element => {
        const active = element.querySelector('.vh-nav-item.active').getBoundingClientRect();
        const host = element.getBoundingClientRect();
        return { left: active.left, right: active.right, hostLeft: host.left, hostRight: host.right };
      });
      expect(rects.left).toBeGreaterThanOrEqual(rects.hostLeft - 1);
      expect(rects.right).toBeLessThanOrEqual(rects.hostRight + 1);
    }
  }
});

test('floating nav is a persistent portal, separate from route content', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await expect(nav).toBeVisible();
  expect(await nav.evaluate(el => el.parentElement === document.body)).toBe(true);
  for (const target of ['Kalendarz', 'Rozgrywki', 'Ulubione', 'Główna']) {
    await nav.getByRole('button', { name: target }).click();
    await expect(nav.getByRole('button', { name: target })).toHaveAttribute('aria-current', 'page');
    await expect(nav).toBeVisible();
    expect(await nav.evaluate(el => el.parentElement === document.body)).toBe(true);
  }
});

test('no legacy WebGL or glass layers remain under the dock', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.fluid-glass__canvas')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toHaveCount(1);
  await expect(page.locator('.vh-nav-lens .glass-surface')).toHaveCount(0);
});

test('single red lens with no extra CSS pill overlay', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await expect(nav).toBeVisible();
  const active = nav.locator('.vh-nav-item.active');
  await expect(active).toHaveCount(1);
  const css = await active.evaluate(el => {
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, image: style.backgroundImage, shadow: style.boxShadow };
  });
  expect(css.background).toBe('rgba(0, 0, 0, 0)');
  expect(css.image).toBe('none');
  expect(css.shadow).toBe('none');
  await nav.getByRole('button', { name: 'Kalendarz' }).click();
  await expect(nav.locator('.vh-nav-item.active')).toHaveCount(1);
  await expect(nav.getByRole('button', { name: 'Kalendarz' })).toHaveAttribute('aria-current', 'page');
});

test('mobile navigation, date strip and saved favorites survive the cleanup', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await nav.getByRole('button', { name: 'Kalendarz' }).click();
  await expect(page.getByRole('tablist', { name: 'Wybierz dzień' })).toBeVisible();
  await nav.getByRole('button', { name: 'Rozgrywki' }).click();
  await expect(page.getByRole('listbox', { name: /Wybierz ligę/ })).toBeVisible();
  await nav.getByRole('button', { name: 'Ulubione' }).click();
  const favorites = page.locator('[data-route="favorites"]');
  await expect(favorites.getByRole('heading', { name: 'Ulubione' })).toBeVisible();
  const selector = favorites.getByRole('tablist', { name: 'Rodzaj ulubionych' });
  await selector.getByRole('tab', { name: /Rozgrywki/ }).click();
  await expect(selector.getByRole('tab', { name: /Rozgrywki/ })).toHaveAttribute('aria-selected', 'true');
  await expect(favorites.locator('.vh-picker-row, .vh-empty, .vh-search-input, .vh-league-stack')).toHaveCount(0);
});

test('tabs reveal immediately with native motion and no extra icon animations', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  for (const [label, target] of [['Kalendarz','matches'], ['Ulubione','favorites'], ['Główna','home']]) {
    await nav.getByRole('button',{name:label}).evaluate(button=>button.click());
    await expect(page.locator('#main-content')).toHaveAttribute('data-page',target);
    await expect(page.locator('#main-content')).toHaveCSS('animation-name','none');
    await expect(page.locator('.vh-page')).toHaveCount(1);
  }
  // A single short FLIP per icon smooths the flex relayout; no spring,
  // shader, or never-ending animation is attached to the glyphs.
  const motionCount = await nav.locator('.vh-nav-item svg').evaluateAll(icons =>
    icons.flatMap(icon => icon.getAnimations())
      .filter(animation => animation.effect?.getKeyframes?.().some(frame => frame.transform != null)).length);
  expect(motionCount).toBeLessThanOrEqual(4);
});

test('prepared tabs reuse their DOM and keep filters while only one panel is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.vh-tab-panel')).toHaveCount(4);
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await nav.getByRole('button', { name: 'Kalendarz' }).click();
  await page.getByRole('button', { name: 'TAURON 1. Liga', exact: true }).click();
  const strip = page.getByRole('tablist', { name: 'Wybierz dzień' });
  await expect.poll(() => strip.evaluate(el => {
    const selected = el.querySelector('[aria-selected="true"]').getBoundingClientRect();
    const host = el.getBoundingClientRect();
    return Math.abs(selected.left + selected.width / 2 - host.left - host.width / 2);
  })).toBeLessThan(3);
  const panel = await page.locator('[data-route="matches"]').elementHandle();
  const stripHandle = await strip.elementHandle();
  await nav.getByRole('button', { name: 'Ulubione' }).click();
  await expect(page.getByRole('tablist', { name: 'Wybierz dzień' })).toHaveCount(0);
  await nav.getByRole('button', { name: 'Kalendarz' }).click();
  expect(await panel.evaluate(el => el === document.querySelector('[data-route="matches"]'))).toBe(true);
  expect(await stripHandle.evaluate(el => el === document.querySelector('.im-strip'))).toBe(true);
  await expect(page.getByRole('button', { name: 'TAURON 1. Liga', exact: true })).toHaveClass(/chosen/);
  await expect(page.locator('.vh-tab-panel:not([hidden])')).toHaveCount(1);

  // No page/list nodes may be created by a warm route switch. This catches
  // remount regressions without a timing budget that depends on CI hardware.
  const added = await page.evaluate(async () => {
    let count = 0;
    const observer = new MutationObserver(records => {
      for (const record of records) count += record.addedNodes.length;
    });
    observer.observe(document.querySelector('#main-content'), { childList: true, subtree: true });
    for (const label of ['Rozgrywki', 'Ulubione', 'Główna', 'Kalendarz']) {
      document.querySelector(`.vh-nav-item[aria-label="${label}"]`).click();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    observer.disconnect();
    return count;
  });
  expect(added).toBe(0);
});

test('moving lens uses native transforms with no backdrop filters or filter maps', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await expect(nav.locator('.vh-nav-lens')).toBeVisible();
  const animated = await nav.evaluate(root => new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (root.querySelector('.vh-nav-items').dataset.active !== 'favorites') return;
      observer.disconnect();
      const lens = root.querySelector('.vh-nav-lens');
      const material = lens;
      resolve({
        nativeTransforms: lens.getAnimations().some(animation =>
          animation.effect.getKeyframes().every(frame => typeof frame.transform === 'string')),
        backdrop: getComputedStyle(material).backdropFilter,
        filter: getComputedStyle(material).filter,
        filterNodes: lens.querySelectorAll('svg, canvas, filter').length
      });
    });
    observer.observe(root, { attributes: true, subtree: true });
    root.querySelector('[aria-label="Ulubione"]').click();
  }));
  expect(animated).toEqual({ nativeTransforms: true, backdrop: 'none', filter: 'none', filterNodes: 0 });
});

test('cached inactive tabs stay out of focus, accessibility and document scrolling', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.vh-tab-panel')).toHaveCount(4);
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  // Open the intentionally minimal favorites page before testing cached panels.
  await nav.getByRole('button', { name: 'Ulubione' }).click();
  await expect(page.getByRole('heading', { name: 'Ulubione' })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await nav.getByRole('button', { name: 'Rozgrywki' }).click();
  await expect(page.getByRole('heading', { name: 'Rozgrywki', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ulubione' })).toHaveCount(0);
  // Measure hidden-panel overflow after the intentional 3px route entrance.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(animation => animation.id === 'vh-route-transition')
    .map(animation => animation.finished.catch(() => {}))));
  const metrics = await page.evaluate(() => {
    const active = document.querySelector('.vh-tab-panel:not([hidden])');
    const hidden = [...document.querySelectorAll('.vh-tab-panel[hidden]')];
    const focus = document.activeElement;
    hidden[0].querySelector('button')?.focus();
    return {
      activeInert: active.inert,
      hiddenInert: hidden.every(panel => panel.inert),
      focusPreserved: document.activeElement === focus,
      top: window.scrollY,
      excessHeight: document.documentElement.scrollHeight - Math.max(
        window.innerHeight, document.querySelector('.vh-app').getBoundingClientRect().bottom + window.scrollY
      ),
      cachedLayout: !CSS.supports('content-visibility', 'hidden') || hidden.every(panel =>
        getComputedStyle(panel).display !== 'none' && getComputedStyle(panel).contentVisibility === 'hidden')
    };
  });
  expect(metrics).toMatchObject({ activeInert: false, hiddenInert: true, focusPreserved: true, top: 0, cachedLayout: true });
  expect(metrics.excessHeight).toBeLessThanOrEqual(2);
  // Returning to the cached calendar must still center the selected day.
  await nav.getByRole('button', { name: 'Kalendarz' }).click();
  const strip = page.getByRole('tablist', { name: 'Wybierz dzień' });
  await expect(strip).toBeVisible();
  await expect.poll(() => strip.evaluate(el => {
    const day = el.querySelector('[aria-selected="true"]').getBoundingClientRect();
    const host = el.getBoundingClientRect();
    return Math.abs(day.left + day.width / 2 - host.left - host.width / 2);
  })).toBeLessThan(3);
});


test('fast tab changes keep dock visible without snapshot overlays', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  const host = page.locator('#main-content');
  await expect(page.locator('.vh-route-rive, .vh-type-serpent')).toHaveCount(0);
  for (const [label, route] of [
    ['Kalendarz','matches'], ['Rozgrywki','competitions'],
    ['Ulubione','favorites'], ['Główna','home']
  ]) {
    await nav.getByRole('button', { name: label }).click();
    await expect(host).toHaveAttribute('data-page', route);
    await expect(nav).toBeVisible();
    await expect(nav.locator('.vh-nav-items')).toHaveAttribute('data-active', route);
    await expect(page.locator('.vh-tab-panel:not([hidden])')).toHaveCount(1);
  }
  await expect.poll(() => host.evaluate(el => el.getAnimations().length)).toBe(0);
  await expect(host).toHaveCSS('opacity','1');
  await expect(host).toHaveCSS('transform','none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await nav.getByRole('button', { name:'Kalendarz' }).click();
  expect(await host.evaluate(el => el.getAnimations().length)).toBe(0);
});

test('all two-line league labels fit narrow mobile screens with unchanged font-size', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#competitions');
  const scroller = page.locator('.vh-league-picker__scroll');
  await expect(scroller).toBeVisible();
  const options = scroller.getByRole('option');
  for (let i = 0; i < 6; i += 1) {
    await scroller.evaluate((node, index) => { node.scrollTop = index * 116; }, i);
    const result = await options.nth(i).evaluate(option => {
      const host = option.closest('.vh-league-picker__scroll').getBoundingClientRect();
      const label = option.querySelector('.vh-league-picker__label');
      const bounding = label.getBoundingClientRect();
      return {
        lines: label.querySelectorAll('.vh-league-picker__line').length,
        fontSize: parseFloat(getComputedStyle(label).fontSize),
        fits: bounding.right <= host.right + 1,
        startsInside: bounding.left >= host.left - 1,
      };
    });
    expect(result.lines).toBe(2);
    expect(result.fontSize).toBeGreaterThanOrEqual(33);
    expect(result.fits).toBe(true);
    expect(result.startsInside).toBe(true);
  }
});

test('opaque dock hides page content and passing lens never overlays white inactive icons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Główna nawigacja' });
  await expect(nav).toHaveCSS('background-color', 'rgb(18, 15, 16)');
  await expect(nav.locator('.glass-surface')).toHaveCount(0);
  const lens = nav.locator('.vh-nav-lens');
  await expect(lens).toHaveCSS('background-color', 'rgb(252, 0, 1)');
  expect(await lens.evaluate(el => getComputedStyle(el).zIndex)).toBe('2');
  expect(await nav.locator('.vh-nav-item:not(.active)').first().evaluate(el => getComputedStyle(el).zIndex)).toBe('1');
  expect(await nav.locator('.vh-nav-item.active').evaluate(el => getComputedStyle(el).zIndex)).toBe('3');
  for (const target of ['Ulubione', 'Główna', 'Kalendarz', 'Rozgrywki', 'Główna']) {
    await nav.getByRole('button', { name: target }).evaluate(button => button.click());
    await expect(nav.locator('.vh-nav-item.active')).toHaveCount(1);
  }
  await page.waitForTimeout(750);
  await expect(nav.getByRole('button', { name: 'Główna' })).toHaveAttribute('aria-current', 'page');
  const misalignment = await nav.evaluate(element => {
    const lensRect = element.querySelector('.vh-nav-lens').getBoundingClientRect();
    const selectedRect = element.querySelector('.vh-nav-item.active').getBoundingClientRect();
    return Math.abs(lensRect.left - selectedRect.left) + Math.abs(lensRect.width - selectedRect.width);
  });
  expect(misalignment).toBeLessThan(2);
});
