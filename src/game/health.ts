export interface HealthState {
  health: number;
  maxHealth: number;
}

export function applyDamage(
  target: HealthState,
  damage: number,
): void {
  const validDamage = Math.max(0, damage);

  target.health = Math.max(0, target.health - validDamage);
}