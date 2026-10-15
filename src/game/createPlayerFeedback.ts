import * as PIXI from 'pixi.js';
import type { HealthState } from './health';
export const playerFeedbackConfig = {
  healDurationSeconds: 1.2,
  healFlashes: 3,
  healColor: 0x42ff79,
  boostColor: 0xffd83d,
  boostShipTint: 0xfff0b0,
  auraWidth: 45,
  auraHeight: 68,
  pulseFrequency: 2,
};
/** One reusable glow per player; no filters or per-frame display-object creation. */
export function createPlayerFeedback(ship: PIXI.Sprite) {
  const container = new PIXI.Container();
  container.eventMode = 'none';
  const aura = new PIXI.Graphics()
    .ellipse(
      0,
      0,
      playerFeedbackConfig.auraWidth,
      playerFeedbackConfig.auraHeight,
    )
    .fill({ color: 0xffffff, alpha: 0.15 })
    .stroke({ color: 0xffffff, alpha: 0.65, width: 2 });
  const outerGlow = new PIXI.Sprite(ship.texture),
    innerGlow = new PIXI.Sprite(ship.texture);
  outerGlow.anchor.set(0.5);
  innerGlow.anchor.set(0.5);
  outerGlow.scale.set(1.14);
  innerGlow.scale.set(1.06);
  container.addChild(aura, outerGlow, innerGlow);
  container.visible = false;
  let healRemaining = 0,
    elapsedSeconds = 0;
  function flashHealing(): void {
    healRemaining = playerFeedbackConfig.healDurationSeconds;
  }
  function update(
    health: HealthState,
    boostSeconds: number,
    deltaSeconds: number,
  ): void {
    elapsedSeconds += Math.max(0, deltaSeconds);
    healRemaining = Math.max(0, healRemaining - Math.max(0, deltaSeconds));
    if (health.health <= 0) {
      healRemaining = 0;
      container.visible = false;
      ship.tint = 0xffffff;
      return;
    }
    const healing = healRemaining > 0;
    const active = healing || boostSeconds > 0;
    container.visible = active;
    if (!active) {
      ship.tint = 0xffffff;
      return;
    }
    const progress =
      (playerFeedbackConfig.healDurationSeconds - healRemaining) /
      playerFeedbackConfig.healDurationSeconds;
    const greenFlash =
      healing &&
      Math.floor(progress * playerFeedbackConfig.healFlashes * 2) % 2 === 0;
    const pulse =
      0.5 +
      Math.sin(
        elapsedSeconds * Math.PI * 2 * playerFeedbackConfig.pulseFrequency,
      ) *
        0.5;
    const color = healing
      ? playerFeedbackConfig.healColor
      : playerFeedbackConfig.boostColor;
    ship.tint = greenFlash
      ? playerFeedbackConfig.healColor
      : boostSeconds > 0
        ? playerFeedbackConfig.boostShipTint
        : 0xffffff;
    aura.tint = color;
    aura.alpha = healing ? (greenFlash ? 0.8 : 0.15) : 0.25 + pulse * 0.1;
    aura.scale.set(1 + pulse * 0.04);
    for (const glow of [outerGlow, innerGlow]) {
      glow.texture = ship.texture;
      glow.tint = color;
    }
    outerGlow.alpha = healing ? (greenFlash ? 0.3 : 0.05) : 0.1 + pulse * 0.04;
    innerGlow.alpha = healing ? (greenFlash ? 0.4 : 0.08) : 0.17 + pulse * 0.05;
  }
  return { container, flashHealing, update };
}
