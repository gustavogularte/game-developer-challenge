import * as PIXI from 'pixi.js';
const wakeConfig = {
  minimumTravel: 20,
  sternOffset: 48,
  lifetimeSeconds: 0.65,
  maximumRipples: 160,
  width: 15,
  height: 4,
  color: 0xb5eff2,
  opacity: 0.25,
};
interface WakeShip {
  x: number;
  y: number;
  rotation: number;
  health: number;
}
export function createWakeLayer() {
  const container = new PIXI.Container();
  const previous = new Map<WakeShip, { x: number; y: number }>();
  const ripples: { graphic: PIXI.Graphics; age: number }[] = [];
  function update(ships: readonly WakeShip[], deltaSeconds: number) {
    const active = new Set(ships);
    for (const ship of previous.keys())
      if (!active.has(ship)) previous.delete(ship);
    for (const ship of ships) {
      const last = previous.get(ship);
      if (!last) {
        previous.set(ship, { x: ship.x, y: ship.y });
        continue;
      }
      if (
        ship.health <= 0 ||
        Math.hypot(ship.x - last.x, ship.y - last.y) < wakeConfig.minimumTravel
      )
        continue;
      previous.set(ship, { x: ship.x, y: ship.y });
      if (ripples.length >= wakeConfig.maximumRipples) continue;
      const graphic = new PIXI.Graphics()
        .ellipse(0, 0, wakeConfig.width, wakeConfig.height)
        .stroke({ color: wakeConfig.color, width: 2 });
      graphic.position.set(
        ship.x - Math.sin(ship.rotation) * wakeConfig.sternOffset,
        ship.y + Math.cos(ship.rotation) * wakeConfig.sternOffset,
      );
      graphic.rotation = ship.rotation;
      container.addChild(graphic);
      ripples.push({ graphic, age: 0 });
    }
    for (let index = ripples.length - 1; index >= 0; index--) {
      const ripple = ripples[index];
      ripple.age += deltaSeconds;
      const progress = ripple.age / wakeConfig.lifetimeSeconds;
      ripple.graphic.alpha = Math.max(0, 1 - progress) * wakeConfig.opacity;
      ripple.graphic.scale.set(1 + progress);
      if (progress >= 1) {
        ripple.graphic.destroy();
        ripples.splice(index, 1);
      }
    }
  }
  return { container, update };
}
