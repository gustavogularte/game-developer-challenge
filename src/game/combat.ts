import type { PlayerInput } from './input';
import type { ArenaBounds, PlayerState } from './player';
import {
  shooterConfig,
  updateChaser,
  updateShooter,
  type EnemyState,
  type ShooterState,
} from './enemy';
import { applyDamage } from './health';

type FireAction = 'fireFront' | 'fireLeft' | 'fireRight';
type ProjectileOwner = 'player' | 'enemy';
type EnemyDestructionCause = 'playerAttack' | 'collision';

interface Position {
  x: number;
  y: number;
}

interface WeaponDefinition {
  action: FireAction;
  cooldownSeconds: number;
  angleOffset: number;
  muzzles: { forward: number; sideways: number }[];
}

export interface EnemyDestroyedEvent {
  type: 'enemyDestroyed';
  cause: EnemyDestructionCause;
  x: number;
  y: number;
  points: number;
}

export type CombatEvent =
  | EnemyDestroyedEvent
  | { type: 'shotFired'; action: FireAction }
  | { type: 'enemyShotFired' }
  | { type: 'waterHit' };

export interface ProjectileState extends Position {
  owner: ProjectileOwner;
  velocityX: number;
  velocityY: number;
  remainingSeconds: number;
  remainingRange: number;
  damage: number;
}

export interface SplashState extends Position {
  elapsedSeconds: number;
}

export interface CombatState {
  projectiles: ProjectileState[];
  cooldowns: Record<FireAction, number>;
  splashes: SplashState[];
  events: CombatEvent[];
}

export const combatConfig = {
  playerCollisionRadius: 32,
  pointsPerPlayerDefeat: 1,
};

export const projectileConfig = {
  speed: 400,
  range: 350,
  lifetimeSeconds: 2,
  damage: 20,
  radius: 6,
};

export const splashConfig = {
  durationSeconds: 0.45,
};

const weaponConfig = {
  frontCooldownSeconds: 0.45,
  broadsideCooldownSeconds: 1,
  frontMuzzleDistance: 60,
  broadsideMuzzleDistance: 36,
  broadsideMuzzleSpacing: 20,
};

const weapons: readonly WeaponDefinition[] = [
  {
    action: 'fireFront',
    cooldownSeconds: weaponConfig.frontCooldownSeconds,
    angleOffset: 0,
    muzzles: [{ forward: weaponConfig.frontMuzzleDistance, sideways: 0 }],
  },
  {
    action: 'fireLeft',
    cooldownSeconds: weaponConfig.broadsideCooldownSeconds,
    angleOffset: -Math.PI / 2,
    muzzles: [
      {
        forward: -weaponConfig.broadsideMuzzleSpacing,
        sideways: -weaponConfig.broadsideMuzzleDistance,
      },
      {
        forward: 0,
        sideways: -weaponConfig.broadsideMuzzleDistance,
      },
      {
        forward: weaponConfig.broadsideMuzzleSpacing,
        sideways: -weaponConfig.broadsideMuzzleDistance,
      },
    ],
  },
  {
    action: 'fireRight',
    cooldownSeconds: weaponConfig.broadsideCooldownSeconds,
    angleOffset: Math.PI / 2,
    muzzles: [
      {
        forward: -weaponConfig.broadsideMuzzleSpacing,
        sideways: weaponConfig.broadsideMuzzleDistance,
      },
      {
        forward: 0,
        sideways: weaponConfig.broadsideMuzzleDistance,
      },
      {
        forward: weaponConfig.broadsideMuzzleSpacing,
        sideways: weaponConfig.broadsideMuzzleDistance,
      },
    ],
  },
];

export function createCombatState(): CombatState {
  return {
    projectiles: [],
    cooldowns: { fireFront: 0, fireLeft: 0, fireRight: 0 },
    splashes: [],
    events: [],
  };
}

function fireWeapons(
  combat: CombatState,
  player: PlayerState,
  input: PlayerInput,
  deltaSeconds: number,
): void {
  const forwardX = Math.sin(player.rotation);
  const forwardY = -Math.cos(player.rotation);
  const rightX = Math.cos(player.rotation);
  const rightY = Math.sin(player.rotation);

  for (const weapon of weapons) {
    const cooldown = Math.max(0, combat.cooldowns[weapon.action] - deltaSeconds);
    combat.cooldowns[weapon.action] = cooldown;

    if (player.health <= 0 || !input[weapon.action] || cooldown > 0) continue;

    const direction = player.rotation + weapon.angleOffset;

    for (const muzzle of weapon.muzzles) {
      combat.projectiles.push({
        owner: 'player',
        x: player.x + forwardX * muzzle.forward + rightX * muzzle.sideways,
        y: player.y + forwardY * muzzle.forward + rightY * muzzle.sideways,
        velocityX: Math.sin(direction) * projectileConfig.speed,
        velocityY: -Math.cos(direction) * projectileConfig.speed,
        remainingSeconds: projectileConfig.lifetimeSeconds,
        remainingRange: projectileConfig.range,
        damage: projectileConfig.damage,
      });
    }

    combat.cooldowns[weapon.action] = weapon.cooldownSeconds;
    combat.events.push({ type: 'shotFired', action: weapon.action });
  }
}

// Returns the first intersection along the segment: 0 = start, 1 = end.
function getSegmentCircleHitTime(
  start: Position,
  end: Position,
  center: Position,
  radius: number,
): number | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const offsetX = start.x - center.x;
  const offsetY = start.y - center.y;
  const distanceSquared = dx * dx + dy * dy;
  const circleOffset = offsetX * offsetX + offsetY * offsetY - radius * radius;

  if (circleOffset <= 0) return 0;
  if (distanceSquared === 0) return null;

  const projection = 2 * (offsetX * dx + offsetY * dy);
  const discriminant =
    projection * projection - 4 * distanceSquared * circleOffset;

  if (discriminant < 0) return null;

  const hitTime =
    (-projection - Math.sqrt(discriminant)) / (2 * distanceSquared);

  return hitTime >= 0 && hitTime <= 1 ? hitTime : null;
}

function findFirstEnemyHit(
  start: Position,
  end: Position,
  enemies: readonly EnemyState[],
): EnemyState | undefined {
  let firstEnemy: EnemyState | undefined;
  let firstHitTime = Infinity;

  for (const enemy of enemies) {
    if (enemy.health <= 0) continue;

    const hitTime = getSegmentCircleHitTime(
      start,
      end,
      enemy,
      enemy.radius + projectileConfig.radius,
    );

    if (hitTime !== null && hitTime < firstHitTime) {
      firstEnemy = enemy;
      firstHitTime = hitTime;
    }
  }

  return firstEnemy;
}

function recordEnemyDestroyed(
  combat: CombatState,
  enemy: EnemyState,
  cause: EnemyDestructionCause,
): void {
  combat.events.push({
    type: 'enemyDestroyed',
    cause,
    x: enemy.x,
    y: enemy.y,
    points: cause === 'playerAttack' ? combatConfig.pointsPerPlayerDefeat : 0,
  });
}

function isInsideArena(position: Position, bounds: ArenaBounds, margin = 0): boolean {
  return (
    position.x >= -margin &&
    position.x <= bounds.width + margin &&
    position.y >= -margin &&
    position.y <= bounds.height + margin
  );
}

function applyProjectileHit(
  combat: CombatState,
  projectile: ProjectileState,
  previousPosition: Position,
  player: PlayerState,
  enemies: readonly EnemyState[],
): boolean {
  if (projectile.owner === 'enemy') {
    if (player.health <= 0) return false;

    const hitTime = getSegmentCircleHitTime(
      previousPosition,
      projectile,
      player,
      combatConfig.playerCollisionRadius + projectileConfig.radius,
    );

    if (hitTime === null) return false;

    applyDamage(player, projectile.damage);
    projectile.remainingSeconds = 0;
    return true;
  }

  const enemy = findFirstEnemyHit(previousPosition, projectile, enemies);

  if (!enemy) return false;

  applyDamage(enemy, projectile.damage);
  projectile.remainingSeconds = 0;

  if (enemy.health === 0) {
    recordEnemyDestroyed(combat, enemy, 'playerAttack');
  }

  return true;
}

function updateProjectiles(
  combat: CombatState,
  player: PlayerState,
  enemies: readonly EnemyState[],
  deltaSeconds: number,
  bounds: ArenaBounds,
): void {
  for (const projectile of combat.projectiles) {
    const previousPosition = { x: projectile.x, y: projectile.y };
    const activeSeconds = Math.max(
      0,
      Math.min(deltaSeconds, projectile.remainingSeconds),
    );
    const speed = Math.hypot(projectile.velocityX, projectile.velocityY);
    const travelDistance = Math.min(speed * activeSeconds, projectile.remainingRange);

    if (speed > 0) {
      projectile.x += (projectile.velocityX / speed) * travelDistance;
      projectile.y += (projectile.velocityY / speed) * travelDistance;
    }

    projectile.remainingRange -= travelDistance;
    projectile.remainingSeconds = Math.max(
      0,
      projectile.remainingSeconds - deltaSeconds,
    );

    const hitTarget = applyProjectileHit(
      combat,
      projectile,
      previousPosition,
      player,
      enemies,
    );

    if (hitTarget) continue;

    const hasFinished =
      projectile.remainingRange <= 0 || projectile.remainingSeconds <= 0;

    if (hasFinished && isInsideArena(projectile, bounds)) {
      combat.splashes.push({ x: projectile.x, y: projectile.y, elapsedSeconds: 0 });
      combat.events.push({ type: 'waterHit' });
    }
  }

  combat.projectiles = combat.projectiles.filter(
    (projectile) =>
      projectile.remainingSeconds > 0 &&
      projectile.remainingRange > 0 &&
      isInsideArena(projectile, bounds, projectileConfig.radius),
  );
}

function updateSplashes(combat: CombatState, deltaSeconds: number): void {
  for (const splash of combat.splashes) {
    splash.elapsedSeconds += deltaSeconds;
  }

  combat.splashes = combat.splashes.filter(
    (splash) => splash.elapsedSeconds < splashConfig.durationSeconds,
  );
}

function fireShooterProjectile(combat: CombatState, enemy: ShooterState): void {
  const forwardX = Math.sin(enemy.rotation);
  const forwardY = -Math.cos(enemy.rotation);

  combat.projectiles.push({
    owner: 'enemy',
    x: enemy.x + forwardX * shooterConfig.muzzleDistance,
    y: enemy.y + forwardY * shooterConfig.muzzleDistance,
    velocityX: forwardX * shooterConfig.projectileSpeed,
    velocityY: forwardY * shooterConfig.projectileSpeed,
    remainingSeconds: shooterConfig.projectileLifetimeSeconds,
    remainingRange: shooterConfig.projectileRange,
    damage: shooterConfig.projectileDamage,
  });

  combat.events.push({ type: 'enemyShotFired' });
}

function updateEnemies(
  combat: CombatState,
  enemies: readonly EnemyState[],
  player: PlayerState,
  deltaSeconds: number,
): void {
  for (const enemy of enemies) {
    if (enemy.kind === 'chaser') {
      const explodedOnContact = updateChaser(
        enemy,
        player,
        deltaSeconds,
        combatConfig.playerCollisionRadius,
      );

      if (explodedOnContact) {
        recordEnemyDestroyed(combat, enemy, 'collision');
      }
    } else if (updateShooter(enemy, player, deltaSeconds)) {
      fireShooterProjectile(combat, enemy);
    }
  }
}

export function updateCombat(
  combat: CombatState,
  player: PlayerState,
  input: PlayerInput,
  deltaSeconds: number,
  bounds: ArenaBounds,
  enemies: readonly EnemyState[],
): void {
  combat.events.length = 0;

  updateSplashes(combat, deltaSeconds);
  updateEnemies(combat, enemies, player, deltaSeconds);
  fireWeapons(combat, player, input, deltaSeconds);
  updateProjectiles(combat, player, enemies, deltaSeconds, bounds);
}
