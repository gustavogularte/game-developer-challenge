import type { PlayerState } from './player';
export const rewardConfig = {
  boostDurationSeconds: 5,
  projectileSpeedMultiplier: 1.5,
  healAmount: 25,
  pickupRadius: 48,
  pickupLifetimeSeconds: 20,
};
export interface HealthPickup {
  x: number;
  y: number;
  remainingSeconds: number;
}
export function collectHealthPickups(
  pickups: HealthPickup[],
  player: PlayerState,
  deltaSeconds: number,
): void {
  if (player.health <= 0) return;
  for (let index = pickups.length - 1; index >= 0; index--) {
    const pickup = pickups[index];
    pickup.remainingSeconds -= deltaSeconds;
    const canCollect =
      player.health < player.maxHealth &&
      Math.hypot(player.x - pickup.x, player.y - pickup.y) <=
        rewardConfig.pickupRadius;
    if (canCollect)
      player.health = Math.min(
        player.maxHealth,
        player.health + rewardConfig.healAmount,
      );
    if (canCollect || pickup.remainingSeconds <= 0) pickups.splice(index, 1);
  }
}
