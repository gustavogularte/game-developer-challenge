import { test, expect } from '@playwright/test';
import {
  createCombatState,
  updateCombat,
  projectileConfig,
} from '../src/game/combat';
import { createPlayerInput } from '../src/game/input';
import { createChaser, createShooter } from '../src/game/enemy';
import { rewardConfig, collectHealthPickups } from '../src/game/rewards';
import { createSpawnState, updateEnemySpawning } from '../src/game/spawn';
import { createMatchState, advanceMatch } from '../src/game/match';
import { isGameSettings } from '../src/game/settings';
const bounds = { width: 2400, height: 1350 };
const player = () => ({
  x: 1200,
  y: 675,
  rotation: 0,
  speed: 0,
  health: 100,
  maxHealth: 100,
});
test('fast projectiles retain damage and range; boost expires after five active seconds', () => {
  const combat = createCombatState();
  const ship = player();
  const input = createPlayerInput();
  input.fireFront = true;
  combat.speedBoostSeconds = rewardConfig.boostDurationSeconds;
  updateCombat(combat, ship, input, 0, bounds, [], []);
  expect(
    Math.hypot(
      combat.projectiles[0].velocityX,
      combat.projectiles[0].velocityY,
    ),
  ).toBe(projectileConfig.speed * rewardConfig.projectileSpeedMultiplier);
  expect(combat.projectiles[0].damage).toBe(projectileConfig.damage);
  expect(combat.projectiles[0].remainingRange).toBe(projectileConfig.range);
  input.fireFront = false;
  for (let i = 0; i < 50; i++)
    updateCombat(combat, ship, input, 0.1, bounds, [], []);
  updateCombat(combat, ship, input, 0.001, bounds, [], []);
  expect(combat.speedBoostSeconds).toBe(0);
  input.fireFront = true;
  updateCombat(combat, ship, input, 0, bounds, [], []);
  expect(Math.abs(combat.projectiles[0].velocityY)).toBe(
    projectileConfig.speed,
  );
});
test('each shooter variant gives exactly one point and its own reward', () => {
  for (const [variant, reward] of [
    ['standard', 'none'],
    ['healer', 'heal'],
    ['speed', 'speed'],
  ] as const) {
    const combat = createCombatState(),
      ship = player(),
      enemy = createShooter(ship.x, ship.y - 100, variant);
    enemy.health = 20;
    combat.projectiles.push({
      owner: 'player',
      x: enemy.x,
      y: enemy.y,
      velocityX: 0,
      velocityY: 0,
      remainingSeconds: 1,
      remainingRange: 100,
      damage: 20,
    });
    updateCombat(combat, ship, createPlayerInput(), 0, bounds, [enemy], []);
    expect(combat.events).toContainEqual(
      expect.objectContaining({ type: 'enemyDestroyed', points: 1, reward }),
    );
    expect(combat.projectiles.filter((p) => p.owner === 'player')).toHaveLength(
      0,
    );
    updateCombat(combat, ship, createPlayerInput(), 0, bounds, [enemy], []);
    expect(combat.events.some((e) => e.type === 'enemyDestroyed')).toBe(false);
  }
});
test('chaser collision damages once and awards zero points', () => {
  const combat = createCombatState(),
    ship = player(),
    enemy = createChaser(ship.x + 60, ship.y);
  updateCombat(combat, ship, createPlayerInput(), 0, bounds, [enemy], []);
  expect(ship.health).toBe(80);
  expect(enemy.health).toBe(0);
  expect(combat.events).toContainEqual(
    expect.objectContaining({
      type: 'enemyDestroyed',
      points: 0,
      reward: 'none',
    }),
  );
  updateCombat(combat, ship, createPlayerInput(), 0.1, bounds, [enemy], []);
  expect(ship.health).toBe(80);
});
test('wood heals without exceeding maximum and is consumed once', () => {
  const ship = player();
  ship.health = 90;
  const pickups = [{ x: ship.x, y: ship.y, remainingSeconds: 20 }];
  collectHealthPickups(pickups, ship, 0.1);
  expect(ship.health).toBe(100);
  expect(pickups).toHaveLength(0);
});
test('random shooter weights keep special rarer than healer and standard', () => {
  const ship = player();
  for (const [roll, variant] of [
    [0.1, 'standard'],
    [0.6, 'healer'],
    [0.8, 'healer'],
    [0.9, 'speed'],
    [0.99, 'speed'],
  ] as const) {
    const values = [0.01, 0.01, 0.9, roll];
    let index = 0;
    const enemies = updateEnemySpawning(
      createSpawnState(),
      ship,
      [],
      3,
      bounds,
      [],
      () => values[index++],
    );
    expect(enemies[0]).toMatchObject({ kind: 'shooter', variant });
  }
});
test('settings enforce supported durations and positive bounded spawn interval', () => {
  for (const duration of [60, 120, 180])
    expect(
      isGameSettings({ durationSeconds: duration, spawnIntervalSeconds: 3 }),
    ).toBe(true);
  for (const duration of [0, 90, 240])
    expect(
      isGameSettings({ durationSeconds: duration, spawnIntervalSeconds: 3 }),
    ).toBe(false);
  for (const interval of [0, 1.5, 11])
    expect(
      isGameSettings({ durationSeconds: 120, spawnIntervalSeconds: interval }),
    ).toBe(false);
});
test('match freezes after time or death, with death taking precedence', () => {
  const match = createMatchState(60);
  advanceMatch(match, 60, 100, 7);
  expect(match.result).toEqual({
    score: 7,
    playedSeconds: 60,
    reason: 'timeUp',
  });
  advanceMatch(match, 10, 0, 99);
  expect(match.result?.score).toBe(7);
  const death = createMatchState(60);
  advanceMatch(death, 60, 0, 2);
  expect(death.result?.reason).toBe('playerDefeated');
});
