import { test, expect } from '@playwright/test';
import { createIslands } from '../src/game/islands';
import {
  createIslandColliders,
  isCirclePathBlocked,
} from '../src/game/islandGeometry';
import { createChaser, updateChaser } from '../src/game/enemy';
import { prepareNavigation } from '../src/game/navigation';
import { getShipIslandRadius } from '../src/game/collision';

test('eight enemies navigate the expanded world without entering islands', async () => {
  const colliders = createIslandColliders(createIslands());
  const player = {
    x: 4100,
    y: 900,
    rotation: 0,
    speed: 0,
    health: 100,
    maxHealth: 100,
  };
  const enemies = Array.from({ length: 8 }, (_, index) =>
    createChaser(950 + index * 40, 850),
  );
  await prepareNavigation(colliders, getShipIslandRadius());
  const frames: number[] = [];
  for (let frame = 0; frame < 360; frame++) {
    player.y = 900 + frame * 0.5;
    const started = performance.now();
    for (const enemy of enemies)
      updateChaser(enemy, player, 1 / 60, 32, colliders);
    frames.push(performance.now() - started);
  }
  for (const enemy of enemies)
    expect(
      isCirclePathBlocked(enemy, enemy, getShipIslandRadius(), colliders),
    ).toBe(false);
  const ordered = [...frames].sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      navigationMs: {
        total: frames.reduce((a, b) => a + b, 0),
        max: ordered.at(-1),
        p95: ordered[Math.floor(ordered.length * 0.95)],
      },
    }),
  );
});
