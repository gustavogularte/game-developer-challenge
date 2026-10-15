export const collisionConfig = {
  shipHullRadius: 66,
  shoreClearance: 10,
  projectileRadius: 6,
};
export function getShipIslandRadius(): number {
  return collisionConfig.shipHullRadius + collisionConfig.shoreClearance;
}

interface Position {
  x: number;
  y: number;
}

export function segmentIntersectsCircle(
  start: Position,
  end: Position,
  center: Position,
  radius: number,
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const segmentLengthSquared = dx * dx + dy * dy;

  let progress = 0;

  if (segmentLengthSquared > 0) {
    const projection =
      ((center.x - start.x) * dx + (center.y - start.y) * dy) /
      segmentLengthSquared;

    progress = Math.max(0, Math.min(1, projection));
  }

  const closestX = start.x + dx * progress;
  const closestY = start.y + dy * progress;

  const distance = Math.hypot(center.x - closestX, center.y - closestY);

  return distance <= radius;
}
