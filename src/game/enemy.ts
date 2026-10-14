import type { HealthState } from './health';

export interface EnemyState extends HealthState {
  x: number;
  y: number;
  rotation: number;
  radius: number;
}

export function createStationaryEnemy(
  x: number,
  y: number,
): EnemyState {
  return {
    x,
    y,
    rotation: Math.PI,
    radius: 32,
    health: 100,
    maxHealth: 100,
  };
}