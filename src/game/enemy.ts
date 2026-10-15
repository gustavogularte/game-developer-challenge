import { applyDamage, type HealthState } from "./health";
import type { PlayerState } from "./player";
import { isCirclePathBlocked, type IslandCollider } from "./islandGeometry";

interface BaseEnemyState extends HealthState {
  x: number;
  y: number;
  rotation: number;
  radius: number;
  deadElapsedSeconds: number;
}

export interface ChaserState extends BaseEnemyState {
  kind: "chaser";
}

export type ShooterVariant = "standard" | "healer" | "speed";

export interface ShooterState extends BaseEnemyState {
  variant: ShooterVariant;
  kind: "shooter";
  shotCooldownSeconds: number;
}

export type EnemyState = ChaserState | ShooterState;

export const enemyConfig = {
  corpseDurationSeconds: 0.8,
  islandCollisionRadius: 66,
};

export const chaserConfig = {
  maxHealth: 60,
  radius: 32,
  moveSpeed: 110,
  contactDamage: 20,
  contactTolerance: 0.01,
};

export const shooterConfig = {
  maxHealth: 100,
  radius: 32,
  moveSpeed: 100,
  rotationSpeed: Math.PI,
  preferredDistance: 260,
  attackRange: 420,
  attackAlignmentTolerance: 0.15,
  shotCooldownSeconds: 1.4,
  muzzleDistance: 60,
  projectileSpeed: 300,
  projectileRange: 550,
  projectileLifetimeSeconds: 3,
  projectileDamage: 10,
};

export function createChaser(x: number, y: number): ChaserState {
  return {
    kind: "chaser",
    x,
    y,
    rotation: Math.PI,
    radius: chaserConfig.radius,
    health: chaserConfig.maxHealth,
    maxHealth: chaserConfig.maxHealth,
    deadElapsedSeconds: 0,
  };
}

export function createShooter(
  x: number,
  y: number,
  variant: ShooterVariant = "standard",
): ShooterState {
  return {
    kind: "shooter",
    variant,
    x,
    y,
    rotation: Math.PI,
    radius: shooterConfig.radius,
    health: shooterConfig.maxHealth,
    maxHealth: shooterConfig.maxHealth,
    deadElapsedSeconds: 0,
    shotCooldownSeconds: 0,
  };
}

function moveEnemyIfPathIsClear(
  enemy: EnemyState,
  nextPosition: { x: number; y: number },
  islandColliders: readonly IslandCollider[],
): void {
  const blocked = isCirclePathBlocked(
    enemy,
    nextPosition,
    enemyConfig.islandCollisionRadius,
    islandColliders,
  );

  if (blocked) return;

  enemy.x = nextPosition.x;
  enemy.y = nextPosition.y;
}

export function updateChaser(
  enemy: ChaserState,
  player: PlayerState,
  deltaSeconds: number,
  playerRadius: number,
  islandColliders: readonly IslandCollider[],
): boolean {
  if (enemy.health <= 0) {
    enemy.deadElapsedSeconds += deltaSeconds;
    return false;
  }

  if (player.health <= 0) return false;

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  const contactDistance = enemy.radius + playerRadius;

  if (distance > 0) {
    enemy.rotation = Math.atan2(dx, -dy);

    const availableDistance = Math.max(0, distance - contactDistance);
    const movement = Math.min(
      chaserConfig.moveSpeed * deltaSeconds,
      availableDistance,
    );

    moveEnemyIfPathIsClear(
      enemy,
      {
        x: enemy.x + (dx / distance) * movement,
        y: enemy.y + (dy / distance) * movement,
      },
      islandColliders,
    );
  }

  const currentDistance = Math.hypot(player.x - enemy.x, player.y - enemy.y);

  const isWithinContactDistance =
    currentDistance <= contactDistance + chaserConfig.contactTolerance;

  const hasIslandBetweenShips = isCirclePathBlocked(
    enemy,
    player,
    0,
    islandColliders,
  );

  if (!isWithinContactDistance || hasIslandBetweenShips) {
    return false;
  }

  applyDamage(player, chaserConfig.contactDamage);
  enemy.health = 0;
  return true;
}

function getAngleDifference(target: number, current: number): number {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

export function updateShooter(
  enemy: ShooterState,
  player: PlayerState,
  deltaSeconds: number,
  islandColliders: readonly IslandCollider[],
): boolean {
  if (enemy.health <= 0) {
    enemy.deadElapsedSeconds += deltaSeconds;
    return false;
  }

  if (player.health <= 0) return false;

  enemy.shotCooldownSeconds = Math.max(
    0,
    enemy.shotCooldownSeconds - deltaSeconds,
  );

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) return false;

  const targetRotation = Math.atan2(dx, -dy);
  const angleDifference = getAngleDifference(targetRotation, enemy.rotation);
  const maxTurn = shooterConfig.rotationSpeed * deltaSeconds;

  enemy.rotation += Math.max(-maxTurn, Math.min(maxTurn, angleDifference));

  const remainingAngle = getAngleDifference(targetRotation, enemy.rotation);
  const isAimingAtPlayer =
    Math.abs(remainingAngle) <= shooterConfig.attackAlignmentTolerance;

  if (!isAimingAtPlayer) return false;

  const availableDistance = Math.max(
    0,
    distance - shooterConfig.preferredDistance,
  );
  const movement = Math.min(
    shooterConfig.moveSpeed * deltaSeconds,
    availableDistance,
  );

  moveEnemyIfPathIsClear(
    enemy,
    {
      x: enemy.x + Math.sin(enemy.rotation) * movement,
      y: enemy.y - Math.cos(enemy.rotation) * movement,
    },
    islandColliders,
  );

  const currentDistance = Math.hypot(player.x - enemy.x, player.y - enemy.y);

  if (
    currentDistance > shooterConfig.attackRange ||
    enemy.shotCooldownSeconds > 0
  ) {
    return false;
  }

  enemy.shotCooldownSeconds = shooterConfig.shotCooldownSeconds;
  return true;
}
