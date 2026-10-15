import { test, expect } from '@playwright/test';

test('damage shakes the hull and crew shrink and disappear after two active seconds', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const shipModule = '/src/game/createShipView.ts';
    const crewModule = '/src/game/createCrewLayer.ts';
    const { createShipView } = await import(shipModule);
    const { createCrewLayer, crewEffectConfig } = await import(crewModule);
    const path = '/assets/png/default/ships/ship_';
    const ship = await createShipView({
      green: path + '2.png',
      amber: path + '8.png',
      red: path + '14.png',
      dead: path + '20.png',
    });
    ship.update({ health: 100, maxHealth: 100 }, 0);
    ship.update({ health: 80, maxHealth: 100 }, 0.01);
    const shakes =
      Math.hypot(ship.container.pivot.x, ship.container.pivot.y) > 0;
    ship.update({ health: 80, maxHealth: 100 }, 0.2);
    const settles =
      ship.container.pivot.x === 0 && ship.container.pivot.y === 0;
    ship.update({ health: 90, maxHealth: 100 }, 0.01);
    const noShakeOnHealing =
      ship.container.pivot.x === 0 && ship.container.pivot.y === 0;
    const crew = await createCrewLayer();
    crew.spawn(500, 500);
    const threeCrew = crew.container.children.length === 3;
    const first = crew.container.children[0];
    const x = first.x,
      y = first.y;
    crew.update(0.3);
    const gentleMovement =
      Math.hypot(first.x - x, first.y - y) > 0 &&
      Math.hypot(first.x - x, first.y - y) < 6;
    crew.update(1.4);
    const beforeShrink =
      Math.abs(first.scale.x - crewEffectConfig.initialScale) < 0.001;
    crew.update(0.2);
    const shrinking =
      first.scale.x > 0 && first.scale.x < crewEffectConfig.initialScale;
    crew.update(0.11);
    const gone = crew.container.children.length === 0 && first.destroyed;
    ship.container.destroy({ children: true });
    crew.container.destroy({ children: true });
    return {
      shakes,
      settles,
      noShakeOnHealing,
      threeCrew,
      gentleMovement,
      beforeShrink,
      shrinking,
      gone,
    };
  });
  expect(Object.values(result)).toEqual(Array(8).fill(true));
});

test('sailing starts once during movement and stops on pause', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Keyboard movement checked on desktop');
  await page.addInitScript(() => {
    const logs: { loop: boolean; volume: number; stopped: boolean }[] = [];
    Object.assign(window, { sailingTestLogs: logs });
    const original = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const node = original.call(this);
      const connect = node.connect.bind(node),
        start = node.start.bind(node),
        stop = node.stop.bind(node);
      let destination: AudioNode | undefined;
      let entry: (typeof logs)[number] | undefined;
      node.connect = ((target: AudioNode) => {
        destination = target;
        return connect(target);
      }) as typeof node.connect;
      node.start = ((...args: Parameters<typeof node.start>) => {
        entry = {
          loop: node.loop,
          volume: destination instanceof GainNode ? destination.gain.value : -1,
          stopped: false,
        };
        logs.push(entry);
        start(...args);
      }) as typeof node.start;
      node.stop = ((...args: Parameters<typeof node.stop>) => {
        if (entry) entry.stopped = true;
        stop(...args);
      }) as typeof node.stop;
      return node;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.getByText('Loading the sea…')).toBeHidden();
  const sailing = () =>
    page.evaluate(() =>
      (
        window as unknown as {
          sailingTestLogs: {
            loop: boolean;
            volume: number;
            stopped: boolean;
          }[];
        }
      ).sailingTestLogs.filter(
        (entry) => entry.loop && Math.abs(entry.volume - 0.025) < 0.0001,
      ),
    );
  await page.keyboard.down('w');
  await expect
    .poll(
      async () => (await sailing()).filter((entry) => !entry.stopped).length,
    )
    .toBe(1);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.keyboard.up('w');
  await expect
    .poll(async () => (await sailing()).every((entry) => entry.stopped))
    .toBe(true);
});
