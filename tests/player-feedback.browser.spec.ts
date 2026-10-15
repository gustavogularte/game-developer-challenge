import { test, expect } from '@playwright/test';

test('menu keeps footer actions on one row without control instructions', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.controls-help')).toHaveCount(0);
  for (const width of [320, 412, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const ranking = await page
      .getByRole('button', { name: 'RANKING', exact: true })
      .boundingBox();
    const history = await page
      .getByRole('button', { name: 'MATCH HISTORY', exact: true })
      .boundingBox();
    expect(ranking).not.toBeNull();
    expect(history).not.toBeNull();
    expect(Math.abs(ranking!.y - history!.y)).toBeLessThan(1);
    expect(ranking!.x + ranking!.width).toBeLessThanOrEqual(history!.x);
    expect(history!.x + history!.width).toBeLessThanOrEqual(width);
  }
});

test('healing flashes green and boost glow lasts only while active', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const viewModule = '/src/game/createShipView.ts';
    const feedbackModule = '/src/game/createPlayerFeedback.ts';
    const { createShipView } = await import(viewModule);
    const { createPlayerFeedback, playerFeedbackConfig } = await import(
      feedbackModule
    );
    const path = '/assets/png/default/ships/ship_';
    const view = await createShipView({
      green: path + '2.png',
      amber: path + '8.png',
      red: path + '14.png',
      dead: path + '20.png',
    });
    const feedback = createPlayerFeedback(view.sprite);
    view.container.addChildAt(feedback.container, 0);
    const health = { health: 50, maxHealth: 100 };
    feedback.flashHealing();
    feedback.update(health, 0, 0.05);
    const green =
      view.sprite.tint === playerFeedbackConfig.healColor &&
      feedback.container.visible;
    feedback.update(health, 0, 0.2);
    const blinkOff = view.sprite.tint === 0xffffff;
    feedback.update(health, 0, 1.2);
    const healEnded =
      !feedback.container.visible && view.sprite.tint === 0xffffff;
    feedback.update(health, 5, 0.1);
    const boosted =
      view.sprite.tint === playerFeedbackConfig.boostShipTint &&
      feedback.container.visible;
    feedback.update(health, 0, 0.1);
    const boostEnded =
      !feedback.container.visible && view.sprite.tint === 0xffffff;
    feedback.update({ health: 0, maxHealth: 100 }, 5, 0.1);
    const dead = !feedback.container.visible;
    view.container.destroy({ children: true });
    return { green, blinkOff, healEnded, boosted, boostEnded, dead };
  });
  expect(result).toEqual({
    green: true,
    blinkOff: true,
    healEnded: true,
    boosted: true,
    boostEnded: true,
    dead: true,
  });
});
