import { test, expect, type Page } from '@playwright/test';
async function openGame(page: Page) {
  // Exercise the CSS fallback deterministically instead of asking CI to rotate a display.
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
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText('Loading the sea…')).toBeHidden();
}
for (const portrait of [false, true]) {
  test(`slide steering keeps forward active and supports a second finger firing (${portrait ? 'portrait fallback' : 'landscape'})`, async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Touch device only');
    await page.setViewportSize(
      portrait ? { width: 412, height: 915 } : { width: 915, height: 412 },
    );
    await openGame(page);
    await expect(page.locator('.game-frame')).toHaveCSS('touch-action', 'none');
    const forwardIcon = page
      .getByRole('button', { name: 'Move forward', exact: true })
      .locator('img');
    await expect(forwardIcon).toHaveJSProperty('draggable', false);
    await expect(forwardIcon).toHaveCSS('pointer-events', 'none');
    const scrollBefore = await page.evaluate(() => ({
      x: window.scrollX,
      y: window.scrollY,
    }));
    const pad = page.locator('.touch-movement');
    const rect = await page
      .getByRole('button', { name: 'Move forward', exact: true })
      .boundingBox();
    if (!rect) throw new Error('Missing steering pad');
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const client = await page.context().newCDPSession(page);
    const finger = {
      id: 1,
      x: center.x,
      y: center.y,
      radiusX: 3,
      radiusY: 3,
      force: 1,
    };
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [finger],
    });
    await page.waitForTimeout(650);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...finger, x: finger.x + 3, y: finger.y + 3 }],
    });
    await expect(pad).toHaveAttribute('data-forward', 'true');
    await expect(pad).toHaveAttribute('data-left', 'false');
    await expect(pad).toHaveAttribute('data-right', 'false');
    expect(
      await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })),
    ).toEqual(scrollBefore);
    const turnRect = await page
      .getByRole('button', { name: 'Turn right', exact: true })
      .boundingBox();
    if (!turnRect) throw new Error('Missing turn button');
    const moved = {
      ...finger,
      x: turnRect.x + turnRect.width / 2,
      y: turnRect.y + turnRect.height / 2,
    };
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [moved],
    });
    await expect(pad).toHaveAttribute('data-forward', 'true');
    await expect(pad).toHaveAttribute('data-right', 'true');
    const fire = page.getByRole('button', { name: 'Fire front', exact: true }),
      fireRect = await fire.boundingBox();
    if (!fireRect) throw new Error('Missing fire button');
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        moved,
        {
          id: 2,
          x: fireRect.x + fireRect.width / 2,
          y: fireRect.y + fireRect.height / 2,
          radiusX: 3,
          radiusY: 3,
          force: 1,
        },
      ],
    });
    await expect(fire).toHaveAttribute('aria-pressed', 'true');
    await expect(pad).toHaveAttribute('data-right', 'true');
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(fire).toHaveAttribute('aria-pressed', 'false');
    await expect(pad).toHaveAttribute('data-forward', 'false');
    await expect(pad).toHaveAttribute('data-right', 'false');
    await page.getByRole('button', { name: 'Pause game' }).click();
    await expect(
      page.getByRole('heading', { name: 'PAUSE', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'MAIN MENU', exact: true }),
    ).toBeInViewport();
  });
}
test('rotated game resizes Pixi to its logical landscape container', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch device only');
  await page.setViewportSize({ width: 412, height: 915 });
  await openGame(page);
  expect(
    await page
      .locator('.game-canvas')
      .evaluate((el) => ({ width: el.clientWidth, height: el.clientHeight })),
  ).toEqual({ width: 915, height: 412 });
  const canvas = page.locator('canvas');
  await expect
    .poll(() =>
      canvas.evaluate((el) => ({
        width: parseFloat(el.style.width),
        height: parseFloat(el.style.height),
      })),
    )
    .toEqual({ width: 915, height: 412 });
  await page.setViewportSize({ width: 915, height: 412 });
  await expect
    .poll(() =>
      canvas.evaluate((el) => ({
        width: parseFloat(el.style.width),
        height: parseFloat(el.style.height),
      })),
    )
    .toEqual({ width: 915, height: 412 });
  await page.setViewportSize({ width: 780, height: 360 });
  await expect
    .poll(() =>
      canvas.evaluate((el) => ({
        width: parseFloat(el.style.width),
        height: parseFloat(el.style.height),
      })),
    )
    .toEqual({ width: 780, height: 360 });
  expect(await canvas.count()).toBe(1);
});
