import type { PlayerInput } from './input';
import type { HealthState } from './health';

export interface PlayerState extends HealthState {
  x: number;
  y: number;
  rotation: number;
  speed: number;
}

export interface ArenaBounds {
  width: number;
  height: number;
}

export const playerMovementConfig = {
  maxSpeed: 180,
  acceleration: 240,
  deceleration: 180,
  rotationSpeed: Math.PI,
};

export function updatePlayerMovement(
  player: PlayerState,
  input: PlayerInput,
  deltaSeconds: number,
): void {
  const turnDirection = Number(input.turnRight) - Number(input.turnLeft);

  player.rotation +=
    turnDirection * playerMovementConfig.rotationSpeed * deltaSeconds;

  if (input.moveForward) {
    player.speed = Math.min(
      playerMovementConfig.maxSpeed,
      player.speed + playerMovementConfig.acceleration * deltaSeconds,
    );
  } else {
    player.speed = Math.max(
      0,
      player.speed - playerMovementConfig.deceleration * deltaSeconds,
    );
  }

  player.x += Math.sin(player.rotation) * player.speed * deltaSeconds;

  player.y -= Math.cos(player.rotation) * player.speed * deltaSeconds;
}

export function constrainPlayerToArena(
  player: PlayerState,
  bounds: ArenaBounds,
  radius: number,
): void {
  const marginX = Math.min(radius, bounds.width / 2);
  const marginY = Math.min(radius, bounds.height / 2);

  player.x = Math.max(marginX, Math.min(player.x, bounds.width - marginX));

  player.y = Math.max(marginY, Math.min(player.y, bounds.height - marginY));
}
