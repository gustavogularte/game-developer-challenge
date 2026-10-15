import { test, expect } from '@playwright/test';
import { arenaConfig } from '../src/game/arena';
import { createIslands } from '../src/game/islands';
import {
  createIslandColliders,
  isCirclePathBlocked,
} from '../src/game/islandGeometry';
import {
  createIslandCannons,
  islandCannonConfig,
  updateIslandCannons,
} from '../src/game/islandCannons';
import {
  createCombatState,
  updateCombat,
  projectileConfig,
} from '../src/game/combat';
import { createPlayerInput } from '../src/game/input';

const player = (x: number, y: number) => ({
  x,
  y,
  rotation: 0,
  speed: 0,
  health: 100,
  maxHealth: 100,
});

test('larger world keeps the initial player clear and three muzzles outside solid land', () => {
  expect(arenaConfig).toEqual({ width: 4800, height: 2700 });
  const islands = createIslands();
  expect(islands).toHaveLength(10);
  const colliders = createIslandColliders(islands);
  const start = player(arenaConfig.width / 2, arenaConfig.height / 2);
  expect(isCirclePathBlocked(start, start, 76, colliders)).toBe(false);
  const cannons = createIslandCannons(islands);
  expect(cannons).toHaveLength(3);
  for (const cannon of cannons) {
    const muzzle = {
      x:
        cannon.x +
        Math.sin(cannon.rotation) * islandCannonConfig.muzzleDistance,
      y:
        cannon.y -
        Math.cos(cannon.rotation) * islandCannonConfig.muzzleDistance,
    };
    expect(
      isCirclePathBlocked(muzzle, muzzle, projectileConfig.radius, colliders),
    ).toBe(false);
  }
});

test('cannon never aims at player and fires only nearby, alive and after cooldown', () => {
  const cannon = { x: 100, y: 100, rotation: Math.PI / 2, cooldownSeconds: 1 };
  const combat = createCombatState();
  const ship = player(350, 250);
  updateIslandCannons([cannon], combat, ship, 0.5);
  expect(combat.projectiles).toHaveLength(0);
  updateIslandCannons([cannon], combat, ship, 0.5);
  expect(combat.projectiles).toHaveLength(1);
  expect(combat.projectiles[0].velocityX).toBe(
    islandCannonConfig.projectileSpeed,
  );
  expect(combat.projectiles[0].velocityY).toBeCloseTo(0);
  expect(cannon.rotation).toBe(Math.PI / 2);
  ship.x = 4000;
  updateIslandCannons([cannon], combat, ship, 3);
  expect(combat.projectiles).toHaveLength(1);
  ship.x = 350;
  ship.health = 0;
  updateIslandCannons([cannon], combat, ship, 3);
  expect(combat.projectiles).toHaveLength(1);
});

test('cannon projectile damages player once and is stopped by land', () => {
  for (const blocked of [false, true]) {
    const combat = createCombatState();
    const cannon = {
      x: 100,
      y: 200,
      rotation: Math.PI / 2,
      cooldownSeconds: 0,
    };
    const ship = player(400, 200);
    const wall = {
      points: [
        { x: 240, y: 100 },
        { x: 270, y: 100 },
        { x: 270, y: 300 },
        { x: 240, y: 300 },
      ],
    };
    updateCombat(
      combat,
      ship,
      createPlayerInput(),
      0,
      arenaConfig,
      [],
      blocked ? [wall] : [],
      [cannon],
    );
    for (let frame = 0; frame < 70; frame++)
      updateCombat(
        combat,
        ship,
        createPlayerInput(),
        1 / 60,
        arenaConfig,
        [],
        blocked ? [wall] : [],
      );
    expect(ship.health).toBe(blocked ? 100 : 90);
    expect(combat.projectiles).toHaveLength(0);
  }
});
