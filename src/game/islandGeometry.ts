import type { IslandDefinition, IslandPoint } from "./islands";

export interface IslandCollider {
  points: IslandPoint[];
}

const geometryConfig = {
  cornerSegments: 8,
  hitTimeIterations: 16,
};

export function createRoundedOutline(
  points: readonly IslandPoint[],
  radius: number,
): IslandPoint[] {
  if (radius <= 0 || points.length < 3) {
    return [...points];
  }

  const outline: IslandPoint[] = [];

  for (let index = 0; index < points.length; index++) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];

    if (!previous || !current || !next) continue;

    const previousDistance = Math.hypot(
      previous.x - current.x,
      previous.y - current.y,
    );

    const nextDistance = Math.hypot(next.x - current.x, next.y - current.y);

    if (previousDistance === 0 || nextDistance === 0) {
      continue;
    }

    const offset = Math.min(radius, previousDistance / 2, nextDistance / 2);

    const start = {
      x: current.x + ((previous.x - current.x) / previousDistance) * offset,
      y: current.y + ((previous.y - current.y) / previousDistance) * offset,
    };

    const end = {
      x: current.x + ((next.x - current.x) / nextDistance) * offset,
      y: current.y + ((next.y - current.y) / nextDistance) * offset,
    };

    for (let step = 0; step <= geometryConfig.cornerSegments; step++) {
      const progress = step / geometryConfig.cornerSegments;
      const remaining = 1 - progress;

      outline.push({
        x:
          remaining * remaining * start.x +
          2 * remaining * progress * current.x +
          progress * progress * end.x,
        y:
          remaining * remaining * start.y +
          2 * remaining * progress * current.y +
          progress * progress * end.y,
      });
    }
  }

  return outline;
}

export function createIslandColliders(
  islands: readonly IslandDefinition[],
): IslandCollider[] {
  return islands.map((island) => ({
    points: createRoundedOutline(island.outline, island.cornerRadius).map(
      (point) => ({
        x: point.x + island.x,
        y: point.y + island.y,
      }),
    ),
  }));
}

function pointSegmentDistanceSquared(
  point: IslandPoint,
  start: IslandPoint,
  end: IslandPoint,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  const progress =
    lengthSquared > 0
      ? Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) /
              lengthSquared,
          ),
        )
      : 0;

  const offsetX = point.x - (start.x + dx * progress);
  const offsetY = point.y - (start.y + dy * progress);

  return offsetX * offsetX + offsetY * offsetY;
}

function segmentsCross(
  start: IslandPoint,
  end: IslandPoint,
  edgeStart: IslandPoint,
  edgeEnd: IslandPoint,
): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const edgeX = edgeEnd.x - edgeStart.x;
  const edgeY = edgeEnd.y - edgeStart.y;

  const denominator = dx * edgeY - dy * edgeX;

  if (denominator === 0) return false;

  const offsetX = edgeStart.x - start.x;
  const offsetY = edgeStart.y - start.y;

  const progress = (offsetX * edgeY - offsetY * edgeX) / denominator;

  const edgeProgress = (offsetX * dy - offsetY * dx) / denominator;

  return (
    progress >= 0 && progress <= 1 && edgeProgress >= 0 && edgeProgress <= 1
  );
}

function isPointInside(
  point: IslandPoint,
  polygon: readonly IslandPoint[],
): boolean {
  let inside = false;

  for (let index = 0; index < polygon.length; index++) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];

    if (!start || !end) continue;

    if (start.y > point.y !== end.y > point.y) {
      const crossingX =
        start.x + ((point.y - start.y) * (end.x - start.x)) / (end.y - start.y);

      if (point.x < crossingX) {
        inside = !inside;
      }
    }
  }

  return inside;
}

export function isCirclePathBlocked(
  start: IslandPoint,
  end: IslandPoint,
  radius: number,
  colliders: readonly IslandCollider[],
): boolean {
  const radiusSquared = radius * radius;

  for (const collider of colliders) {
    const polygon = collider.points;

    if (isPointInside(start, polygon) || isPointInside(end, polygon)) {
      return true;
    }

    for (let index = 0; index < polygon.length; index++) {
      const edgeStart = polygon[index];
      const edgeEnd = polygon[(index + 1) % polygon.length];

      if (!edgeStart || !edgeEnd) continue;

      if (segmentsCross(start, end, edgeStart, edgeEnd)) {
        return true;
      }

      const distanceSquared = Math.min(
        pointSegmentDistanceSquared(start, edgeStart, edgeEnd),
        pointSegmentDistanceSquared(end, edgeStart, edgeEnd),
        pointSegmentDistanceSquared(edgeStart, start, end),
        pointSegmentDistanceSquared(edgeEnd, start, end),
      );

      if (distanceSquared <= radiusSquared) {
        return true;
      }
    }
  }

  return false;
}

export function findIslandHitTime(
  start: IslandPoint,
  end: IslandPoint,
  radius: number,
  colliders: readonly IslandCollider[],
): number | null {
  if (!isCirclePathBlocked(start, end, radius, colliders)) {
    return null;
  }

  if (isCirclePathBlocked(start, start, radius, colliders)) {
    return 0;
  }

  let clearTime = 0;
  let blockedTime = 1;

  for (
    let iteration = 0;
    iteration < geometryConfig.hitTimeIterations;
    iteration++
  ) {
    const middleTime = (clearTime + blockedTime) / 2;

    const middlePosition = {
      x: start.x + (end.x - start.x) * middleTime,
      y: start.y + (end.y - start.y) * middleTime,
    };

    if (isCirclePathBlocked(start, middlePosition, radius, colliders)) {
      blockedTime = middleTime;
    } else {
      clearTime = middleTime;
    }
  }

  return blockedTime;
}
