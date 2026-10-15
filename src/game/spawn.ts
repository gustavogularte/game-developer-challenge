import {
  chaserConfig,
  createChaser,
  createShooter,
  enemyConfig,
  shooterConfig,
  type EnemyState,
} from "./enemy";
import type { ArenaBounds, PlayerState } from "./player";
import { isCirclePathBlocked, type IslandCollider } from "./islandGeometry";

interface SpawnState {
  elapsedSeconds: number;
  firstSpawnPending: boolean;
}

export const spawnConfig = {
  intervalSeconds: 3,
  firstSpawnDelaySeconds: 1,
  maxActiveEnemies: 8,
  arenaMargin: 96,
  minimumPlayerDistance: 500,
  maximumPlayerDistance: 1100,
  minimumEnemyGap: 80,
  maxPositionAttempts: 20,
  chaserProbability: 0.5,
  standardShooterProbability: 0.55,
  healerShooterProbability: 0.3,
};

const largestEnemyRadius = Math.max(chaserConfig.radius, shooterConfig.radius);

export function createSpawnState(): SpawnState {
  return {
    elapsedSeconds: 0,
    firstSpawnPending: true,
  };
}

function findSpawnPosition(
  player: PlayerState,
  enemies: readonly EnemyState[],
  bounds: ArenaBounds,
  islandColliders: readonly IslandCollider[],
  random: () => number,
): { x: number; y: number } | undefined {
  const margin = spawnConfig.arenaMargin;
  const minX = Math.max(margin, player.x - spawnConfig.maximumPlayerDistance);
  const minY = Math.max(margin, player.y - spawnConfig.maximumPlayerDistance);
  const maxX = Math.min(bounds.width - margin, player.x + spawnConfig.maximumPlayerDistance);
  const maxY = Math.min(bounds.height - margin, player.y + spawnConfig.maximumPlayerDistance);
  const availableWidth = maxX - minX;
  const availableHeight = maxY - minY;

  if (availableWidth <= 0 || availableHeight <= 0) {
    return undefined;
  }

  for (let attempt = 0; attempt < spawnConfig.maxPositionAttempts; attempt++) {
    const x = minX + random() * availableWidth;
    const y = minY + random() * availableHeight;

    const playerDistance = Math.hypot(x - player.x, y - player.y);

    if (playerDistance < spawnConfig.minimumPlayerDistance ||
        playerDistance > spawnConfig.maximumPlayerDistance) {
      continue;
    }

    const position = { x, y };

    const overlapsIsland = isCirclePathBlocked(
      position,
      position,
      enemyConfig.islandCollisionRadius,
      islandColliders,
    );

    if (overlapsIsland) continue;

    const isNearEnemy = enemies.some((enemy) => {
      if (enemy.health <= 0) return false;

      const distance = Math.hypot(x - enemy.x, y - enemy.y);

      const minimumDistance =
        enemy.radius + largestEnemyRadius + spawnConfig.minimumEnemyGap;

      return distance < minimumDistance;
    });

    if (!isNearEnemy) return { x, y };
  }

  return undefined;
}

export function updateEnemySpawning(
  state: SpawnState,
  player: PlayerState,
  enemies: readonly EnemyState[],
  deltaSeconds: number,
  bounds: ArenaBounds,
  islandColliders: readonly IslandCollider[],
  random: () => number = Math.random,
  intervalSeconds: number = spawnConfig.intervalSeconds,
): EnemyState[] {
  if (
    player.health <= 0 ||
    !Number.isFinite(intervalSeconds) ||
    intervalSeconds <= 0
  )
    return [];

  state.elapsedSeconds += Math.max(0, deltaSeconds);

  const nextDelay = state.firstSpawnPending
    ? spawnConfig.firstSpawnDelaySeconds
    : intervalSeconds;
  if (state.elapsedSeconds < nextDelay) return [];
  const scheduledSpawns =
    1 + Math.floor((state.elapsedSeconds - nextDelay) / intervalSeconds);
  state.elapsedSeconds -= nextDelay + (scheduledSpawns - 1) * intervalSeconds;

  const spawnedEnemies: EnemyState[] = [];
  const activeEnemies = enemies.filter((enemy) => enemy.health > 0);

  for (let index = 0; index < scheduledSpawns; index++) {
    if (
      activeEnemies.length + spawnedEnemies.length >=
      spawnConfig.maxActiveEnemies
    ) {
      if (state.firstSpawnPending)
        state.elapsedSeconds = spawnConfig.firstSpawnDelaySeconds;
      break;
    }

    const position = findSpawnPosition(
      player,
      [...activeEnemies, ...spawnedEnemies],
      bounds,
      islandColliders,
      random,
    );

    if (!position) {
      if (state.firstSpawnPending) {
        // Retry the first safe spawn next frame instead of waiting a full interval.
        state.elapsedSeconds = spawnConfig.firstSpawnDelaySeconds;
        break;
      }
      continue;
    }

    const enemy =
      random() < spawnConfig.chaserProbability
        ? createChaser(position.x, position.y)
        : createShooter(position.x, position.y, chooseShooterVariant(random()));

    spawnedEnemies.push(enemy);
    state.firstSpawnPending = false;
  }

  return spawnedEnemies;
}

function chooseShooterVariant(roll: number) {
  if (roll < spawnConfig.standardShooterProbability) return "standard";
  if (
    roll <
    spawnConfig.standardShooterProbability +
      spawnConfig.healerShooterProbability
  )
    return "healer";
  return "speed";
}
