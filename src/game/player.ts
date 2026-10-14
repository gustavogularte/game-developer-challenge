import type { PlayerInput } from './input';

export interface PlayerState {
  x: number;
  y: number;
  rotation: number;
}

export interface ArenaBounds {
  width: number;
  height: number;
}

export const playerMovementConfig = {
  moveSpeed: 280,
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

  if (!input.moveForward) {
    return;
  }

  player.x +=
    Math.sin(player.rotation) * playerMovementConfig.moveSpeed * deltaSeconds;

  player.y -=
    Math.cos(player.rotation) * playerMovementConfig.moveSpeed * deltaSeconds;
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
