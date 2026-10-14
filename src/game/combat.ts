import type { PlayerInput } from './input';
import type { ArenaBounds, PlayerState } from './player';
import type { EnemyState } from './enemy';
import { applyDamage } from './health';
import { segmentIntersectsCircle } from './collision';

type FireAction = 'fireFront' | 'fireLeft' | 'fireRight';

interface WeaponDefinition {
  action: FireAction;
  cooldownSeconds: number;
  angleOffset: number;
  muzzles: { forward: number; sideways: number }[];
}

export interface ProjectileState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  remainingSeconds: number;
  damage: number;
  remainingRange: number;
}

export interface CombatState {
  projectiles: ProjectileState[];
  cooldowns: Record<FireAction, number>;
  splashes: SplashState[];
}

export interface SplashState {
  x: number;
  y: number;
  elapsedSeconds: number;
}

export const splashConfig = {
  durationSeconds: 0.45,
};

export const projectileConfig = {
  speed: 400,
  range: 350,
  lifetimeSeconds: 2,
  damage: 20,
  radius: 6,
};

const weapons: WeaponDefinition[] = [
  {
    action: 'fireFront',
    cooldownSeconds: 0.35,
    angleOffset: 0,
    muzzles: [{ forward: 60, sideways: 0 }],
  },
  {
    action: 'fireLeft',
    cooldownSeconds: 0.8,
    angleOffset: -Math.PI / 2,
    muzzles: [
      { forward: -20, sideways: -36 },
      { forward: 0, sideways: -36 },
      { forward: 20, sideways: -36 },
    ],
  },
  {
    action: 'fireRight',
    cooldownSeconds: 0.8,
    angleOffset: Math.PI / 2,
    muzzles: [
      { forward: -20, sideways: 36 },
      { forward: 0, sideways: 36 },
      { forward: 20, sideways: 36 },
    ],
  },
];

export function createCombatState(): CombatState {
  return {
    projectiles: [],
    cooldowns: {
      fireFront: 0,
      fireLeft: 0,
      fireRight: 0,
    },
    splashes: [],
  };
}

export function updateCombat(
  combat: CombatState,
  player: PlayerState,
  input: PlayerInput,
  deltaSeconds: number,
  bounds: ArenaBounds,
  enemy: EnemyState,
): void {
  for (const splash of combat.splashes) {
    splash.elapsedSeconds += deltaSeconds;
  }

  combat.splashes = combat.splashes.filter(
    (splash) => splash.elapsedSeconds < splashConfig.durationSeconds,
  );

  for (const weapon of weapons) {
    const cooldown = Math.max(
      0,
      combat.cooldowns[weapon.action] - deltaSeconds,
    );

    combat.cooldowns[weapon.action] = cooldown;

    if (!input[weapon.action] || cooldown > 0) continue;

    const direction = player.rotation + weapon.angleOffset;

    for (const muzzle of weapon.muzzles) {
      combat.projectiles.push({
        x:
          player.x +
          Math.sin(player.rotation) * muzzle.forward +
          Math.cos(player.rotation) * muzzle.sideways,
        y:
          player.y -
          Math.cos(player.rotation) * muzzle.forward +
          Math.sin(player.rotation) * muzzle.sideways,
        velocityX: Math.sin(direction) * projectileConfig.speed,
        velocityY: -Math.cos(direction) * projectileConfig.speed,
        remainingSeconds: projectileConfig.lifetimeSeconds,
        damage: projectileConfig.damage,
        remainingRange: projectileConfig.range,
      });
    }

    combat.cooldowns[weapon.action] = weapon.cooldownSeconds;
  }

  for (const projectile of combat.projectiles) {
    const previousPosition = {
      x: projectile.x,
      y: projectile.y,
    };

    const activeSeconds = Math.max(
      0,
      Math.min(deltaSeconds, projectile.remainingSeconds),
    );

    const speed = Math.hypot(projectile.velocityX, projectile.velocityY);

    const travelDistance = Math.min(
      speed * activeSeconds,
      projectile.remainingRange,
    );

    if (speed > 0) {
      projectile.x += (projectile.velocityX / speed) * travelDistance;

      projectile.y += (projectile.velocityY / speed) * travelDistance;
    }

    projectile.remainingRange -= travelDistance;

    projectile.remainingSeconds = Math.max(
      0,
      projectile.remainingSeconds - deltaSeconds,
    );

    const hitEnemy =
      enemy.health > 0 &&
      segmentIntersectsCircle(
        previousPosition,
        projectile,
        enemy,
        enemy.radius + projectileConfig.radius,
      );

    if (hitEnemy) {
      applyDamage(enemy, projectile.damage);
      projectile.remainingSeconds = 0;
      continue;
    }

    const hasFinished =
      projectile.remainingRange <= 0 || projectile.remainingSeconds <= 0;

    const isInsideArena =
      projectile.x >= 0 &&
      projectile.x <= bounds.width &&
      projectile.y >= 0 &&
      projectile.y <= bounds.height;

    if (hasFinished && isInsideArena) {
      combat.splashes.push({
        x: projectile.x,
        y: projectile.y,
        elapsedSeconds: 0,
      });
    }
  }

  const radius = projectileConfig.radius;

  combat.projectiles = combat.projectiles.filter(
    (projectile) =>
      projectile.remainingSeconds > 0 &&
      projectile.remainingRange > 0 &&
      projectile.x >= -radius &&
      projectile.x <= bounds.width + radius &&
      projectile.y >= -radius &&
      projectile.y <= bounds.height + radius,
  );
}
