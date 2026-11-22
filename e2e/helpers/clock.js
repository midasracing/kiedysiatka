// Installing and pausing in separate protocol calls advances the clock a little.
// Start safely before the target so slow WebKit workers cannot pause in the past.
export async function pauseClockAt(page, time) {
  await page.clock.install({ time: new Date(time.getTime() - 60 * 60 * 1000) });
  await page.clock.pauseAt(time);
}
