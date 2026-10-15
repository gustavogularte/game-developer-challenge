import * as PIXI from 'pixi.js';
export const wakeConfig = {
  minimumTravel: 10,
  sternOffset: 50,
  lifetimeSeconds: 1.25,
  maximumRipples: 220,
  maximumEmissionsPerFrame: 16,
  halfWidth: 20,
  trailLength: 16,
  color: 0xe4fbff,
  opacity: 0.62,
  driftSpeed: 8,
};
interface WakeShip {
  x: number;
  y: number;
  rotation: number;
  health: number;
}
interface WakeTrack {
  x: number;
  y: number;
  pendingDistance: number;
}
interface Ripple {
  graphic: PIXI.Graphics;
  age: number;
  rotation: number;
}
export function createWakeLayer() {
  const container = new PIXI.Container();
  container.eventMode = 'none';
  const tracks = new Map<WakeShip, WakeTrack>();
  const ripples: Ripple[] = [];
  function emit(x: number, y: number, rotation: number) {
    if (ripples.length >= wakeConfig.maximumRipples) return;
    const width = wakeConfig.halfWidth,
      length = wakeConfig.trailLength;
    const graphic = new PIXI.Graphics()
      .moveTo(-width, length)
      .quadraticCurveTo(-width * 0.5, length * 0.2, 0, 0)
      .quadraticCurveTo(width * 0.5, length * 0.2, width, length)
      .stroke({ color: wakeConfig.color, width: 2.5 })
      .ellipse(-7, 6, 3, 1.5)
      .ellipse(7, 6, 3, 1.5)
      .fill({ color: wakeConfig.color, alpha: 0.55 });
    graphic.position.set(
      x - Math.sin(rotation) * wakeConfig.sternOffset,
      y + Math.cos(rotation) * wakeConfig.sternOffset,
    );
    graphic.rotation = rotation;
    graphic.alpha = wakeConfig.opacity;
    container.addChild(graphic);
    ripples.push({ graphic, age: 0, rotation });
  }
  function update(ships: readonly WakeShip[], deltaSeconds: number) {
    const active = new Set(ships);
    for (const ship of tracks.keys())
      if (!active.has(ship)) tracks.delete(ship);
    for (const ship of ships) {
      const previous = tracks.get(ship);
      if (!previous) {
        tracks.set(ship, { x: ship.x, y: ship.y, pendingDistance: 0 });
        continue;
      }
      const dx = ship.x - previous.x,
        dy = ship.y - previous.y;
      const travel = Math.hypot(dx, dy);
      if (ship.health > 0 && travel > 0 && deltaSeconds > 0) {
        let along = wakeConfig.minimumTravel - previous.pendingDistance;
        let emitted = 0;
        while (
          along <= travel &&
          emitted < wakeConfig.maximumEmissionsPerFrame
        ) {
          emit(
            previous.x + (dx / travel) * along,
            previous.y + (dy / travel) * along,
            ship.rotation,
          );
          along += wakeConfig.minimumTravel;
          emitted++;
        }
        previous.pendingDistance =
          (previous.pendingDistance + travel) % wakeConfig.minimumTravel;
      }
      previous.x = ship.x;
      previous.y = ship.y;
    }
    for (let index = ripples.length - 1; index >= 0; index--) {
      const ripple = ripples[index];
      ripple.age += Math.max(0, deltaSeconds);
      const progress = Math.min(1, ripple.age / wakeConfig.lifetimeSeconds);
      ripple.graphic.alpha = Math.pow(1 - progress, 1.4) * wakeConfig.opacity;
      ripple.graphic.scale.set(1 + progress * 0.9, 1 + progress * 0.45);
      ripple.graphic.x -=
        Math.sin(ripple.rotation) * wakeConfig.driftSpeed * deltaSeconds;
      ripple.graphic.y +=
        Math.cos(ripple.rotation) * wakeConfig.driftSpeed * deltaSeconds;
      if (progress >= 1) {
        ripple.graphic.destroy();
        ripples.splice(index, 1);
      }
    }
  }
  return { container, update };
}
