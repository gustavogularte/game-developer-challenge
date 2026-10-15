import { test, expect } from '@playwright/test';
import { collisionConfig, getShipIslandRadius } from '../src/game/collision';
import {
  isCirclePathBlocked,
  type IslandCollider,
} from '../src/game/islandGeometry';
import {
  createChaser,
  createShooter,
  updateChaser,
  updateShooter,
  enemyConfig,
} from '../src/game/enemy';
import { createSpawnState, updateEnemySpawning } from '../src/game/spawn';
const bounds = { width: 2400, height: 1350 };
const playerAt = (x = 1200, y = 675) => ({
  x,
  y,
  rotation: 0,
  speed: 0,
  health: 100,
  maxHealth: 100,
});
const shoreline: IslandCollider[] = [
  {
    points: [
      { x: 500, y: 300 },
      { x: 900, y: 300 },
      { x: 900, y: 900 },
      { x: 500, y: 900 },
    ],
  },
];
test('shore clearance adds a configurable water margin to the hull radius', () => {
  expect(getShipIslandRadius()).toBe(
    collisionConfig.shipHullRadius + collisionConfig.shoreClearance,
  );
  const point = { x: 430, y: 600 };
  expect(
    isCirclePathBlocked(
      point,
      point,
      collisionConfig.shipHullRadius,
      shoreline,
    ),
  ).toBe(false);
  expect(
    isCirclePathBlocked(point, point, getShipIslandRadius(), shoreline),
  ).toBe(true);
});
test('enemies keep moving when a stopped player is outside their shore clearance', () => {
  const player = playerAt(434.5, 600);
  expect(isCirclePathBlocked(player, player, 65.47, shoreline)).toBe(false);
  expect(
    isCirclePathBlocked(
      player,
      player,
      enemyConfig.islandCollisionRadius,
      shoreline,
    ),
  ).toBe(true);
  const enemies = [
    createChaser(200, 200),
    createChaser(1200, 600),
    createShooter(200, 1000),
  ];
  const initial = enemies.map((enemy) => ({ x: enemy.x, y: enemy.y }));
  for (let frame = 0; frame < 20; frame++)
    for (const enemy of enemies) {
      const previous = { x: enemy.x, y: enemy.y };
      if (enemy.kind === 'chaser')
        updateChaser(enemy, player, 0.1, 32, shoreline);
      else updateShooter(enemy, player, 0.1, shoreline);
      expect(
        isCirclePathBlocked(
          previous,
          enemy,
          enemyConfig.islandCollisionRadius,
          shoreline,
        ),
      ).toBe(false);
    }
  enemies.forEach((enemy, index) =>
    expect(
      Math.hypot(enemy.x - initial[index].x, enemy.y - initial[index].y),
    ).toBeGreaterThan(20),
  );
  expect(player.speed).toBe(0);
});
test('shooter can fire at a shoreline target using projectile rather than hull clearance', () => {
  const player = playerAt(434.5, 600),
    enemy = createShooter(200, 600);
  enemy.rotation = Math.PI / 2;
  expect(updateShooter(enemy, player, 0, shoreline)).toBe(true);
});
test('first spawn takes one second; later spawns use the selected interval', () => {
  const state = createSpawnState(),
    player = playerAt();
  const update = (seconds: number) =>
    updateEnemySpawning(state, player, [], seconds, bounds, [], () => 0.2, 10);
  expect(update(0.5)).toHaveLength(0);
  expect(update(0.5)).toHaveLength(1);
  expect(update(9)).toHaveLength(0);
  expect(update(1)).toHaveLength(1);
  expect(update(10)).toHaveLength(1);
  expect(
    updateEnemySpawning(
      createSpawnState(),
      player,
      [],
      0.5,
      bounds,
      [],
      () => 0.2,
      1,
    ),
  ).toHaveLength(0);
});
test('first spawn retries next frame if no safe position was found', () => {
  const state = createSpawnState(),
    player = playerAt();
  expect(
    updateEnemySpawning(state, player, [], 1, bounds, [], () => 0.5, 10),
  ).toHaveLength(0);
  expect(
    updateEnemySpawning(state, player, [], 0, bounds, [], () => 0.2, 10),
  ).toHaveLength(1);
});
test('spawn scheduling carries time across a long frame without changing the first delay', () => {
  const state = createSpawnState(),
    player = playerAt();
  let seed = 123;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  expect(
    updateEnemySpawning(state, player, [], 8, bounds, [], random, 3),
  ).toHaveLength(3);
  expect(
    updateEnemySpawning(state, player, [], 2, bounds, [], random, 3),
  ).toHaveLength(1);
});
