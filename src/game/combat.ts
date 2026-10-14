import type { PlayerInput } from './input';
import type { ArenaBounds, PlayerState } from './player';

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
}

export interface CombatState {
  projectiles: ProjectileState[];
  cooldowns: Record<FireAction, number>;
}

export const projectileConfig = {
  speed: 500,
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
  };
}

export function updateCombat(
  combat: CombatState,
  player: PlayerState,
  input: PlayerInput,
  deltaSeconds: number,
  bounds: ArenaBounds,
): void {
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
      });
    }

    combat.cooldowns[weapon.action] = weapon.cooldownSeconds;
  }

  for (const projectile of combat.projectiles) {
    projectile.x += projectile.velocityX * deltaSeconds;
    projectile.y += projectile.velocityY * deltaSeconds;
    projectile.remainingSeconds -= deltaSeconds;
  }

  const radius = projectileConfig.radius;

  combat.projectiles = combat.projectiles.filter(
    (projectile) =>
      projectile.remainingSeconds > 0 &&
      projectile.x >= -radius &&
      projectile.x <= bounds.width + radius &&
      projectile.y >= -radius &&
      projectile.y <= bounds.height + radius,
  );
}
