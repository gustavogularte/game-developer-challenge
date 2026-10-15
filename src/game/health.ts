export interface HealthState {
  health: number;
  maxHealth: number;
}

export function applyDamage(target: HealthState, damage: number): void {
  const validDamage = Math.max(0, damage);

  target.health = Math.max(0, target.health - validDamage);
}

export type HealthStage = 'green' | 'amber' | 'red' | 'dead';

export function getHealthStage(target: HealthState): HealthStage {
  if (target.health <= 0 || target.maxHealth <= 0) {
    return 'dead';
  }

  const ratio = target.health / target.maxHealth;

  if (ratio <= 0.3) return 'red';
  if (ratio <= 0.6) return 'amber';

  return 'green';
}
