import {
  chaserConfig,
  createChaser,
  createShooter,
  shooterConfig,
  type EnemyState,
} from './enemy';
import type { ArenaBounds, PlayerState } from './player';

interface SpawnState {
  elapsedSeconds: number;
}

export const spawnConfig = {
  intervalSeconds: 3,
  maxActiveEnemies: 8,
  arenaMargin: 96,
  minimumPlayerDistance: 500,
  minimumEnemyGap: 80,
  maxPositionAttempts: 20,
  chaserProbability: 0.5,
};

const largestEnemyRadius = Math.max(chaserConfig.radius, shooterConfig.radius);

export function createSpawnState(): SpawnState {
  return {
    elapsedSeconds: 0,
  };
}

function findSpawnPosition(
  player: PlayerState,
  enemies: readonly EnemyState[],
  bounds: ArenaBounds,
  random: () => number,
): { x: number; y: number } | undefined {
  const margin = spawnConfig.arenaMargin;
  const availableWidth = bounds.width - margin * 2;
  const availableHeight = bounds.height - margin * 2;

  if (availableWidth <= 0 || availableHeight <= 0) {
    return undefined;
  }

  for (let attempt = 0; attempt < spawnConfig.maxPositionAttempts; attempt++) {
    const x = margin + random() * availableWidth;
    const y = margin + random() * availableHeight;

    const playerDistance = Math.hypot(x - player.x, y - player.y);

    if (playerDistance < spawnConfig.minimumPlayerDistance) {
      continue;
    }

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
  random: () => number = Math.random,
): EnemyState[] {
  if (player.health <= 0) return [];

  state.elapsedSeconds += deltaSeconds;

  const scheduledSpawns = Math.floor(
    state.elapsedSeconds / spawnConfig.intervalSeconds,
  );

  state.elapsedSeconds %= spawnConfig.intervalSeconds;

  const spawnedEnemies: EnemyState[] = [];
  const activeEnemies = enemies.filter((enemy) => enemy.health > 0);

  for (let index = 0; index < scheduledSpawns; index++) {
    if (
      activeEnemies.length + spawnedEnemies.length >=
      spawnConfig.maxActiveEnemies
    ) {
      break;
    }

    const position = findSpawnPosition(
      player,
      [...activeEnemies, ...spawnedEnemies],
      bounds,
      random,
    );

    if (!position) continue;

    const enemy =
      random() < spawnConfig.chaserProbability
        ? createChaser(position.x, position.y)
        : createShooter(position.x, position.y);

    spawnedEnemies.push(enemy);
  }

  return spawnedEnemies;
}
