import { collisionConfig } from '../src/game/collision';
import { test, expect } from '@playwright/test';
import {
  createChaser,
  createShooter,
  updateChaser,
  updateShooter,
  enemyConfig,
} from '../src/game/enemy';
import { createIslands } from '../src/game/islands';
import {
  createIslandColliders,
  isCirclePathBlocked,
} from '../src/game/islandGeometry';
const colliders = createIslandColliders(createIslands());
const playerAt = (x: number, y: number) => ({
  x,
  y,
  rotation: 0,
  speed: 0,
  health: 100,
  maxHealth: 100,
});
const routes = [
  {
    name: 'forest island',
    start: { x: 140, y: 400 },
    goal: { x: 1000, y: 400 },
  },
  {
    name: 'rocky island',
    start: { x: 1430, y: 900 },
    goal: { x: 2310, y: 900 },
  },
];
for (const route of routes) {
  test(`chaser goes around ${route.name} without crossing terrain`, () => {
    const enemy = createChaser(route.start.x, route.start.y),
      player = playerAt(route.goal.x, route.goal.y);
    expect(
      isCirclePathBlocked(
        enemy,
        player,
        enemyConfig.islandCollisionRadius,
        colliders,
      ),
    ).toBe(true);
    let impacted = false;
    for (let frame = 0; frame < 360 && !impacted; frame++) {
      const previous = { x: enemy.x, y: enemy.y };
      impacted = updateChaser(enemy, player, 0.1, 32, colliders);
      expect(
        isCirclePathBlocked(
          previous,
          enemy,
          enemyConfig.islandCollisionRadius,
          colliders,
        ),
      ).toBe(false);
    }
    expect(impacted).toBe(true);
    expect(player.health).toBe(80);
  });
  test(`shooter goes around ${route.name} and fires only with a clear course`, () => {
    const enemy = createShooter(route.start.x, route.start.y),
      player = playerAt(route.goal.x, route.goal.y);
    let fired = false;
    for (let frame = 0; frame < 360 && !fired; frame++) {
      const previous = { x: enemy.x, y: enemy.y };
      fired = updateShooter(enemy, player, 0.1, colliders);
      expect(
        isCirclePathBlocked(
          previous,
          enemy,
          enemyConfig.islandCollisionRadius,
          colliders,
        ),
      ).toBe(false);
    }
    expect(fired).toBe(true);
    expect(
      isCirclePathBlocked(
        enemy,
        player,
        collisionConfig.projectileRadius,
        colliders,
      ),
    ).toBe(false);
    expect(
      Math.hypot(enemy.x - player.x, enemy.y - player.y),
    ).toBeLessThanOrEqual(420);
  });
}
