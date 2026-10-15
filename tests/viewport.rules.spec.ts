import { test, expect } from '@playwright/test';
import { getCameraTransform } from '../src/game/camera';
import { getSteeringOffset } from '../src/game/touchSteering';
const arena = { width: 2400, height: 1350 };
test('narrower windows keep ship scale rather than shrinking the entire world', () => {
  const target = { x: 1200, y: 675 };
  const wide = getCameraTransform({ width: 1440, height: 900 }, arena, target);
  const narrow = getCameraTransform({ width: 600, height: 900 }, arena, target);
  expect(narrow.scale).toBe(wide.scale);
  expect(target.x * narrow.scale + narrow.x).toBe(300);
  expect(target.y * narrow.scale + narrow.y).toBe(450);
});
test('camera follows and clamps at every arena boundary', () => {
  const viewport = { width: 915, height: 412 };
  for (const target of [
    { x: 0, y: 0 },
    { x: 2400, y: 1350 },
    { x: 1200, y: 675 },
  ]) {
    const camera = getCameraTransform(viewport, arena, target);
    expect(camera.scale).toBeGreaterThanOrEqual(0.45);
    expect(camera.x).toBeLessThanOrEqual(0);
    expect(camera.y).toBeLessThanOrEqual(0);
    expect(camera.x + arena.width * camera.scale).toBeGreaterThanOrEqual(
      viewport.width,
    );
    expect(camera.y + arena.height * camera.scale).toBeGreaterThanOrEqual(
      viewport.height,
    );
  }
});
test('steering translates physical pointer axes in the rotated landscape fallback', () => {
  const rect = { left: 100, top: 200, width: 96, height: 132 };
  const right = getSteeringOffset(148, 300, rect, true);
  expect(right.turnRight).toBe(true);
  expect(right.turnLeft).toBe(false);
  const left = getSteeringOffset(148, 230, rect, true);
  expect(left.turnLeft).toBe(true);
  expect(left.turnRight).toBe(false);
  const center = getSteeringOffset(148, 266, rect, true);
  expect(center.turnLeft).toBe(false);
  expect(center.turnRight).toBe(false);
});
