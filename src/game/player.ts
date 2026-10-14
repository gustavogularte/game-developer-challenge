import type { PlayerInput } from './input';

export interface PlayerState {
  x: number;
  y: number;
  rotation: number;
}

export const playerMovementConfig = {
  moveSpeed: 180,
  rotationSpeed: Math.PI,
};

export function updatePlayerMovement(
  player: PlayerState,
  input: PlayerInput,
  deltaSeconds: number,
): void {
  const turnDirection = Number(input.turnRight) - Number(input.turnLeft);

  player.rotation += turnDirection * playerMovementConfig.rotationSpeed * deltaSeconds;

  if (!input.moveForward) {
    return;
  }

  player.x +=
    Math.sin(player.rotation) * playerMovementConfig.moveSpeed * deltaSeconds;

  player.y -=
    Math.cos(player.rotation) * playerMovementConfig.moveSpeed * deltaSeconds;
}
