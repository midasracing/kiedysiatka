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
    const grid = page.locator('[data-route="competitions"] .vh-team-grid');
    await expect(grid).toBeVisible();
    const tile = grid.locator('.vh-team-tile.is-openable').first();
    await expect(tile).toBeVisible();
    const teamName = await tile.locator('strong').first().innerText();
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

    const addFavorite = profile.getByRole('button', { name: 'Dodaj do ulubionych: ' + teamName });
    await addFavorite.click();
    await expect(profile.getByRole('button', { name: 'Usuń z ulubionych: ' + teamName }))
      .toHaveAttribute('aria-pressed', 'true');

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
  await expect(page.locator('[data-route="competitions"] .vh-team-tile__open')).toHaveCount(0);
});

test('team overview and roster reflect official feed values, not mock numbers', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/data/tauron.json', async route => {
    await route.fulfill({ json: {
      league: 'men',
      teams: [
        { id: '100', name: 'Klub Testowy', logo: '', players: [
          { id: '14', full_name: 'Jan Testowy', number: 14, position: 'Libero',
            height_cm: 186, weight_kg: 78, spike_reach_cm: 323 },
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
  await expect(profile.locator('.vh-profile-player').first()).toContainText('Kacper Próba');
  await expect(profile).toContainText('Atak 323 cm');
  await expect(profile).toContainText('Waga 78 kg');
  // Players with no reported weight have no placeholder or invented value.
  await expect(profile.locator('.vh-profile-player').first()).not.toContainText('Waga');
  await expect(profile.getByRole('heading', { name: 'Najbliższe mecze' })).toBeVisible();
  await expect(profile.getByRole('heading', { name: 'Ostatnie wyniki' })).toBeVisible();
});
