import { test, expect } from '@playwright/test';

async function openLeague(page, leagueName, isSecondOption) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#competitions');
  if (isSecondOption) {
    const picker = page.getByRole('listbox', { name: /Wybierz ligę/ });
    await picker.focus();
    await picker.press('ArrowDown');
  }
  const option = page.getByRole('option', { name: leagueName, exact: true });
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await option.click();
  await expect(page.getByRole('heading', { name: leagueName, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Drużyny', exact: true }).click();
}

for (const [leagueName, secondOption] of [
  ['TAURON Liga Mężczyzn', false],
  ['TAURON 1. Liga Mężczyzn', true],
]) {
  test(`team profile opens from Rozgrywki → Drużyny in ${leagueName}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await openLeague(page, leagueName, secondOption);
    const grid = page.locator('[data-route="competitions"] .vh-club-wall');
    await expect(grid).toBeVisible();
    const tile = grid.locator('.vh-club-wall__row.is-openable').first();
    await expect(tile).toBeVisible();
    const teamName = (await tile.locator('.vh-club-wall__name').textContent()).trim();
    const name = tile.locator('.vh-club-wall__name');
    const crest = tile.locator('.vh-club-wall__crest');
    await expect(name).toHaveCSS('color', 'rgb(245, 242, 237)');
    await expect(crest).toBeVisible();
    // In the editorial wall the crest is always left of the white team name.
    const crestBox = await crest.boundingBox();
    const nameBox = await name.boundingBox();
    expect(crestBox.x + crestBox.width).toBeLessThanOrEqual(nameBox.x);
    // One continuous matte stripe carries every crest; no individual glow.
    const matte = await grid.evaluate(el => getComputedStyle(el, '::before').backgroundColor);
    expect(matte).toBe('rgb(146, 144, 139)');
    const glow = await crest.evaluate(el => getComputedStyle(el, '::before').backgroundImage);
    expect(glow).toBe('none');
    await expect(grid.locator('.vh-team-tile')).toHaveCount(0);
    await expect(tile.getByText('Profil', { exact: true })).toHaveCount(0);
    const star = tile.getByRole('button', { name: 'Dodaj do ulubionych: ' + teamName });
    await star.click();
    await expect(tile.getByRole('button', { name: 'Usuń z ulubionych: ' + teamName }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.vh-team-profile')).toHaveCount(0);
    await tile.getByRole('button', { name: 'Otwórz profil drużyny: ' + teamName }).click();

    const profile = page.locator('[data-route="competitions"] .vh-team-profile');
    await expect(profile).toBeVisible();
    await expect(profile.getByRole('heading', { name: teamName, exact: true })).toBeVisible();
    await expect(profile.locator('.vh-team-snapshot')).toBeVisible();
    await expect(profile.getByText('Pozycja', { exact: true })).toBeVisible();
    await expect(profile.getByText('Punkty', { exact: true })).toBeVisible();
    await expect(profile.getByRole('heading', { name: 'Skład drużyny' })).toBeVisible();
    const players = profile.locator('.vh-profile-player');
    expect(await players.count()).toBeGreaterThan(0);
    await expect(profile.locator('.vh-team-snapshot__metric')).toHaveCount(2);
    await expect(profile.locator('.vh-team-snapshot__fixture')).toHaveCount(2);

    const removeFavorite = profile.getByRole('button', { name: 'Usuń z ulubionych: ' + teamName });
    await removeFavorite.click();
    await expect(profile.getByRole('button', { name: 'Dodaj do ulubionych: ' + teamName }))
      .toHaveAttribute('aria-pressed', 'false');

    await profile.getByRole('button', { name: 'Wstecz', exact: true }).click();
    await expect(profile).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Drużyny', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(grid.getByRole('button', { name: 'Otwórz profil drużyny: ' + teamName })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('other leagues do not expose unfinished team detail pages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#competitions');
  const picker = page.getByRole('listbox', { name: /Wybierz ligę/ });
  await picker.focus();
  await picker.press('ArrowDown');
  await picker.press('ArrowDown');
  await page.getByRole('option', { name: 'II Liga Mężczyzn', exact: true }).click();
  await page.getByRole('tab', { name: 'Drużyny', exact: true }).click();
  await expect(page.locator('[data-route="competitions"] .vh-club-wall')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Otwórz profil drużyny:/ })).toHaveCount(0);
});

test('team overview and roster reflect official feed values, not mock numbers', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/data/tauron.json', async route => {
    await route.fulfill({ json: {
      league: 'men',
      teams: [
        { id: '100', name: 'Klub Testowy', logo: '', players: [
          { id: '14', full_name: 'Jan Testowy', number: 14, position: 'Libero',
            height_cm: 186, weight_kg: 78, spike_reach_cm: 323,
            source_url: 'https://www.tauronliga.pl/players/id/14/tour/53.html' },
          { id: '4', full_name: 'Kacper Próba', number: 4, position: 'Przyjmujący' }
        ] },
        { id: '101', name: 'Rywal', players: [] },
      ],
      table: [{ team: 'Klub Testowy', rank: 7, points: 13 }],
      matches: [
        { id: 1, home: 'Klub Testowy', away: 'Rywal', date: '17.11.2026', time: '19:00',
          status: 'finished', home_sets: 3, away_sets: 1 },
        { id: 2, home: 'Rywal', away: 'Klub Testowy', date: '18.11.2026', time: '19:00',
          status: 'finished', home_sets: 3, away_sets: 2 },
        { id: 3, home: 'Klub Testowy', away: 'Rywal', date: '28.11.2026', time: '17:00',
          status: 'scheduled' },
      ],
    }});
  });
  await page.goto('/#competitions');
  await page.getByRole('option', { name: 'TAURON Liga Mężczyzn', exact: true }).click();
  await page.getByRole('tab', { name: 'Drużyny', exact: true }).click();
  await page.getByRole('button', { name: 'Otwórz profil drużyny: Klub Testowy' }).click();

  const profile = page.locator('.vh-team-profile');
  await expect(profile.getByRole('heading', { name: 'Klub Testowy' })).toBeVisible();
  await expect(profile.locator('.vh-team-snapshot__metric').nth(0)).toContainText('7');
  await expect(profile.locator('.vh-team-snapshot__metric').nth(1)).toContainText('13');
  await expect(profile.locator('.vh-team-snapshot__fixture').nth(0)).toContainText('2');
  await expect(profile.locator('.vh-team-snapshot__fixture').nth(0)).toContainText('3');
  await expect(profile.locator('.vh-team-snapshot__fixture').nth(0)).toContainText('P');
  await expect(profile.locator('.vh-team-snapshot__fixture').nth(1)).toContainText('Rywal');
  await expect(profile.locator('.vh-team-snapshot__fixture').nth(1)).toContainText('17:00');
  await expect(profile.locator('.vh-profile-player')).toHaveCount(2);
  await expect(profile.locator('.vh-profile-position')).toHaveCount(2);
  await expect(profile.locator('.vh-profile-position').first().getByRole('heading', { name: 'Przyjmujący' })).toBeVisible();
  await expect(profile.locator('.vh-profile-position').last().getByRole('heading', { name: 'Libero' })).toBeVisible();
  const jan = profile.locator('.vh-profile-player').filter({ hasText: 'Jan Testowy' });
  await expect(jan.locator('.vh-profile-player__stat')).toHaveCount(3);
  await expect(jan).toContainText('Zasięg ataku');
  await expect(jan).toContainText('323');
  await expect(jan).toContainText('Waga');
  await expect(jan).toContainText('78');
  await expect(jan).not.toContainText('Zasięg bloku');
  await expect(jan.getByRole('link', { name: 'Otwórz oficjalny profil zawodnika: Jan Testowy' }))
    .toHaveAttribute('href', 'https://www.tauronliga.pl/players/id/14/tour/53.html');
  // Players with no reported weight have no placeholder or invented value.
  const kacper = profile.locator('.vh-profile-player').filter({ hasText: 'Kacper Próba' });
  await expect(kacper).toContainText('Przyjmujący');
  await expect(kacper).not.toContainText('Waga');
  // Only the concise previous/next fixture preview remains in the overview.
  await expect(profile.getByRole('heading', { name: 'Najbliższe mecze' })).toHaveCount(0);
  await expect(profile.getByRole('heading', { name: 'Ostatnie wyniki' })).toHaveCount(0);
  await expect(profile.locator('.vh-team-snapshot__fixture')).toHaveCount(2);
});
