import { test, expect } from '@playwright/test';

test('Escape resumes simulation and returns from Options without unpausing', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop keyboard interaction');
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.getByText('Loading the sea…')).toBeHidden();
  const timer = page.locator('.game-hud__counter').last().locator('span');
  const pause = page.getByRole('dialog', { name: 'Pause', exact: true });
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  const pausedTime = await timer.textContent();
  await page.waitForTimeout(1100);
  expect(await timer.textContent()).toBe(pausedTime);
  await page.keyboard.press('Escape');
  await expect(pause).toHaveCount(0);
  await expect.poll(() => timer.textContent()).not.toBe(pausedTime);
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  await pause.getByRole('button', { name: 'OPTIONS', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Options', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  const optionsTime = await timer.textContent();
  await page.waitForTimeout(1100);
  expect(await timer.textContent()).toBe(optionsTime);
  // A held Escape key must not resume/reopen repeatedly.
  await page.keyboard.down('Escape');
  await expect(pause).toHaveCount(0);
  await page.keyboard.down('Escape');
  await expect(pause).toHaveCount(0);
  await page.keyboard.up('Escape');
  await expect.poll(() => timer.textContent()).not.toBe(optionsTime);
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  await pause.getByRole('button', { name: 'RESUME', exact: true }).click();
  await expect(pause).toHaveCount(0);
});
