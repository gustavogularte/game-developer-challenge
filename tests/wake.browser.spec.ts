import { test, expect } from '@playwright/test';
test('wake appears only during movement, expires and respects its resource cap', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'PLAY', exact: true }),
  ).toBeVisible();
  const result = await page.evaluate(async () => {
    const moduleUrl = '/src/game/createWakeLayer.ts';
    const { createWakeLayer, wakeConfig } = await import(
      /* @vite-ignore */ moduleUrl
    );
    const wake = createWakeLayer();
    const ship = { x: 1200, y: 675, rotation: 0, health: 100 };
    wake.update([ship], 0.1);
    for (let i = 0; i < 20; i++) wake.update([ship], 0.1);
    const stationary = wake.container.children.length;
    ship.y -= 30;
    wake.update([ship], 0.1);
    const moving = wake.container.children.length;
    for (let i = 0; i < 20; i++) wake.update([ship], 0.1);
    const expired = wake.container.children.length;
    for (let i = 0; i < 100; i++) {
      ship.y -= 100;
      wake.update([ship], 0.001);
    }
    const bounded = wake.container.children.length <= wakeConfig.maximumRipples;
    wake.container.destroy({ children: true });
    return { stationary, moving, expired, bounded };
  });
  expect(result.stationary).toBe(0);
  expect(result.moving).toBeGreaterThan(0);
  expect(result.expired).toBe(0);
  expect(result.bounded).toBe(true);
});
