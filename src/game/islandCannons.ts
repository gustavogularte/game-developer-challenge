import type { IslandDefinition } from "./islands";
import type { CombatState } from "./combat";
import type { PlayerState } from "./player";

export interface IslandCannonState {
  x: number;
  y: number;
  rotation: number;
  cooldownSeconds: number;
}

export const islandCannonConfig = {
  cooldownSeconds: 2.2,
  activationDistance: 950,
  projectileSpeed: 290,
  projectileRange: 850,
  projectileDamage: 10,
  shoreInset: 18,
  muzzleDistance: 44,
  initialDelaySeconds: 1,
};

// Rotation uses the ship convention: zero points north, PI/2 points east.
export function createIslandCannons(
  islands: readonly IslandDefinition[],
): IslandCannonState[] {
  const placements = [
    { islandId: "forest-fort-island", directionX: 1, directionY: 0 },
    { islandId: "eastern-watch", directionX: -1, directionY: 0 },
    { islandId: "southern-palm-shore", directionX: 0, directionY: -1 },
  ];
  return placements.flatMap(({ islandId, directionX, directionY }) => {
    const island = islands.find((item) => item.id === islandId);
    if (!island || !island.outline.length) return [];
    // An outermost coastal point lets the muzzle clear the island collider.
    const shore = island.outline.reduce((best, point) =>
      point.x * directionX + point.y * directionY >
      best.x * directionX + best.y * directionY ? point : best,
    );
    return [{
      x: island.x + shore.x - directionX * islandCannonConfig.shoreInset,
      y: island.y + shore.y - directionY * islandCannonConfig.shoreInset,
      rotation: Math.atan2(directionX, -directionY),
      cooldownSeconds: islandCannonConfig.initialDelaySeconds,
    }];
  });
}

export function updateIslandCannons(
  cannons: readonly IslandCannonState[],
  combat: CombatState,
  player: PlayerState,
  deltaSeconds: number,
): void {
  if (player.health <= 0) return;
  for (const cannon of cannons) {
    cannon.cooldownSeconds = Math.max(0, cannon.cooldownSeconds - deltaSeconds);
    if (cannon.cooldownSeconds > 0 ||
        Math.hypot(player.x - cannon.x, player.y - cannon.y) >
          islandCannonConfig.activationDistance) continue;
    const directionX = Math.sin(cannon.rotation);
    const directionY = -Math.cos(cannon.rotation);
    combat.projectiles.push({
      owner: "enemy",
      x: cannon.x + directionX * islandCannonConfig.muzzleDistance,
      y: cannon.y + directionY * islandCannonConfig.muzzleDistance,
      velocityX: directionX * islandCannonConfig.projectileSpeed,
      velocityY: directionY * islandCannonConfig.projectileSpeed,
      remainingRange: islandCannonConfig.projectileRange,
      remainingSeconds: islandCannonConfig.projectileRange /
        islandCannonConfig.projectileSpeed,
      damage: islandCannonConfig.projectileDamage,
    });
    combat.events.push({ type: "enemyShotFired" });
    cannon.cooldownSeconds = islandCannonConfig.cooldownSeconds;
  }
}
