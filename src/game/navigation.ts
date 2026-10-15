import { arenaConfig } from './arena';
import {
  findIslandHitTime,
  isCirclePathBlocked,
  type IslandCollider,
} from './islandGeometry';

interface Point {
  x: number;
  y: number;
}
interface GridNode extends Point {
  index: number;
  walkable: boolean;
  neighbors?: number[];
}
interface NavigationGrid {
  nodes: GridNode[];
  columns: number;
  rows: number;
  radius: number;
  colliders: readonly IslandCollider[];
}
interface Route {
  waypoints: Point[];
  elapsedSeconds: number;
  target: Point;
  colliders: readonly IslandCollider[];
}
export const navigationConfig = {
  cellSize: 80,
  replanSeconds: 0.75,
  targetReplanDistance: 120,
  waypointTolerance: 8,
  goalProjectionInset: 2,
};
const grids = new WeakMap<
  readonly IslandCollider[],
  Map<number, NavigationGrid>
>();
const routes = new WeakMap<Point, Route>();

function getGrid(
  colliders: readonly IslandCollider[],
  radius: number,
): NavigationGrid {
  let byRadius = grids.get(colliders);
  if (!byRadius) {
    byRadius = new Map();
    grids.set(colliders, byRadius);
  }
  const existing = byRadius.get(radius);
  if (existing) return existing;
  const columns =
    Math.ceil((arenaConfig.width - radius * 2) / navigationConfig.cellSize) + 1;
  const rows =
    Math.ceil((arenaConfig.height - radius * 2) / navigationConfig.cellSize) +
    1;
  const nodes: GridNode[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const position = {
        x: radius + (column * (arenaConfig.width - radius * 2)) / (columns - 1),
        y: radius + (row * (arenaConfig.height - radius * 2)) / (rows - 1),
      };
      nodes.push({
        ...position,
        index: nodes.length,
        walkable: !isCirclePathBlocked(position, position, radius, colliders),
      });
    }
  }
  const grid = { nodes, columns, rows, radius, colliders };
  byRadius.set(radius, grid);
  return grid;
}

function neighbors(grid: NavigationGrid, node: GridNode): number[] {
  if (node.neighbors) return node.neighbors;
  const result: number[] = [];
  const column = node.index % grid.columns;
  const row = Math.floor(node.index / grid.columns);
  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
      if (columnOffset === 0 && rowOffset === 0) continue;
      const nextColumn = column + columnOffset,
        nextRow = row + rowOffset;
      if (
        nextColumn < 0 ||
        nextColumn >= grid.columns ||
        nextRow < 0 ||
        nextRow >= grid.rows
      )
        continue;
      const next = grid.nodes[nextRow * grid.columns + nextColumn];
      // Check the entire swept circle, including diagonal edges near corners.
      if (
        next.walkable &&
        !isCirclePathBlocked(node, next, grid.radius, grid.colliders)
      )
        result.push(next.index);
    }
  }
  node.neighbors = result;
  return result;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function closestConnectedNode(
  grid: NavigationGrid,
  position: Point,
): GridNode | undefined {
  const candidates = grid.nodes
    .filter((node) => node.walkable)
    .sort((a, b) => distance(a, position) - distance(b, position));
  return candidates.find(
    (node) => !isCirclePathBlocked(position, node, grid.radius, grid.colliders),
  );
}

/** The player's center may be too close to shore for the enemy's clearance. */
function selectSafeGoal(
  grid: NavigationGrid,
  target: Point,
): { node: GridNode; endpoint: Point } | undefined {
  if (!isCirclePathBlocked(target, target, grid.radius, grid.colliders)) {
    const node = closestConnectedNode(grid, target);
    return node ? { node, endpoint: target } : undefined;
  }
  const node = grid.nodes
    .filter((candidate) => candidate.walkable)
    .sort((a, b) => distance(a, target) - distance(b, target))[0];
  if (!node) return undefined;
  const hitTime = findIslandHitTime(node, target, grid.radius, grid.colliders);
  const length = distance(node, target);
  const progress =
    length > 0
      ? Math.max(
          0,
          (hitTime ?? 1) - navigationConfig.goalProjectionInset / length,
        )
      : 0;
  return {
    node,
    endpoint: {
      x: node.x + (target.x - node.x) * progress,
      y: node.y + (target.y - node.y) * progress,
    },
  };
}

function findRoute(
  start: Point,
  target: Point,
  radius: number,
  colliders: readonly IslandCollider[],
): Point[] {
  const grid = getGrid(colliders, radius);
  const startNode = closestConnectedNode(grid, start);
  const goal = selectSafeGoal(grid, target);
  if (!startNode || !goal) return [];
  const { node: goalNode, endpoint } = goal;
  const open = new Set([startNode.index]);
  const costs = new Map([[startNode.index, 0]]);
  const estimates = new Map([[startNode.index, distance(startNode, goalNode)]]);
  const previous = new Map<number, number>();
  while (open.size > 0) {
    let current = -1,
      bestEstimate = Infinity;
    for (const index of open) {
      const estimate = estimates.get(index) ?? Infinity;
      if (estimate < bestEstimate) {
        current = index;
        bestEstimate = estimate;
      }
    }
    if (current === goalNode.index) {
      const path: Point[] = [{ ...endpoint }];
      let index = current;
      path.unshift(grid.nodes[index]);
      while (previous.has(index)) {
        index = previous.get(index)!;
        path.unshift(grid.nodes[index]);
      }
      // Keep only useful corners while preserving collision clearance.
      const smooth: Point[] = [];
      let anchor = start,
        cursor = 0;
      while (cursor < path.length) {
        let next = path.length - 1;
        while (
          next > cursor &&
          isCirclePathBlocked(anchor, path[next], radius, colliders)
        )
          next--;
        if (isCirclePathBlocked(anchor, path[next], radius, colliders))
          return [];
        smooth.push(path[next]);
        anchor = path[next];
        cursor = next + 1;
      }
      return smooth;
    }
    if (current < 0) break;
    open.delete(current);
    for (const neighbor of neighbors(grid, grid.nodes[current])) {
      const cost =
        (costs.get(current) ?? Infinity) +
        distance(grid.nodes[current], grid.nodes[neighbor]);
      if (cost >= (costs.get(neighbor) ?? Infinity)) continue;
      previous.set(neighbor, current);
      costs.set(neighbor, cost);
      estimates.set(neighbor, cost + distance(grid.nodes[neighbor], goalNode));
      open.add(neighbor);
    }
  }
  return [];
}

/** Use a direct course in open water; otherwise follow a cached A* route. */
export function getNavigationTarget(
  ship: Point,
  target: Point,
  radius: number,
  colliders: readonly IslandCollider[],
  deltaSeconds: number,
): Point {
  if (!isCirclePathBlocked(ship, target, radius, colliders)) {
    routes.delete(ship);
    return target;
  }
  let route = routes.get(ship);
  if (route) route.elapsedSeconds += deltaSeconds;
  if (
    !route ||
    route.colliders !== colliders ||
    route.elapsedSeconds >= navigationConfig.replanSeconds ||
    distance(route.target, target) >= navigationConfig.targetReplanDistance
  ) {
    route = {
      waypoints: findRoute(ship, target, radius, colliders),
      elapsedSeconds: 0,
      target: { ...target },
      colliders,
    };
    routes.set(ship, route);
  }
  while (
    route.waypoints.length > 0 &&
    distance(ship, route.waypoints[0]) <= navigationConfig.waypointTolerance
  ) {
    const following = route.waypoints[1];
    if (following && isCirclePathBlocked(ship, following, radius, colliders))
      break;
    route.waypoints.shift();
  }
  return route.waypoints[0] ?? ship;
}
