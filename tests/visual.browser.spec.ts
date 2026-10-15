import { test, expect } from '@playwright/test';
test('panels use loaded assets and keep actions visible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'OPTIONS', exact: true }).click();
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((img) => img.decode().catch(() => {})),
    );
  });
  await page.waitForTimeout(500);
  await expect(
    page.getByRole('button', { name: 'MAIN MENU', exact: true }),
  ).toBeInViewport();
  await page.getByRole('button', { name: 'MAIN MENU', exact: true }).click();
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading the sea…')).toBeHidden();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(
    page.getByRole('button', { name: 'MAIN MENU', exact: true }),
  ).toBeInViewport();
});

test.beforeEach(async ({ page, isMobile }) => {
  if (!isMobile) return;
  await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      configurable: true,
      value: undefined,
    });
    if (screen.orientation)
      Object.defineProperty(screen.orientation, 'lock', {
        configurable: true,
        value: undefined,
      });
  });
});
