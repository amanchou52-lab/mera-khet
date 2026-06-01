/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GridPos } from '../types';

// Simple structure to represent A* Node
interface AStarNode {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic cost to end
  f: number; // total cost
  parent: AStarNode | null;
}

/**
 * Searches for a path from start to end on a 2D tilemap grid.
 * @param start Start coordinate
 * @param end End coordinate
 * @param gridWidth Width of the tilemap grid
 * @param gridHeight Height of the tilemap grid
 * @param isTilePassable Quick callback to check if a tile is walkable
 */
export function findPath(
  start: GridPos,
  end: GridPos,
  gridWidth: number,
  gridHeight: number,
  isTilePassable: (x: number, y: number) => boolean
): GridPos[] {
  // If start is same as end, return a single node path
  if (start.x === end.x && start.y === end.y) {
    return [start];
  }

  // Ensure end is clean
  if (end.x < 0 || end.x >= gridWidth || end.y < 0 || end.y >= gridHeight) {
    return [];
  }

  const openList: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: Math.abs(start.x - end.x) + Math.abs(start.y - end.y),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  openList.push(startNode);

  const getHash = (x: number, y: number) => `${x},${y}`;

  // Limit iterations to prevent game freezes on complex isolated networks
  let iterations = 0;
  const maxIterations = 600;

  while (openList.length > 0 && iterations++ < maxIterations) {
    // Sort to find the node with the lowest F cost
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    closedSet.add(getHash(current.x, current.y));

    // If we've reached the target position
    if (current.x === end.x && current.y === end.y) {
      const path: GridPos[] = [];
      let temp: AStarNode | null = current;
      while (temp !== null) {
        path.push({ x: temp.x, y: temp.y });
        temp = temp.parent;
      }
      return path.reverse();
    }

    // Neighbors (UP, DOWN, LEFT, RIGHT)
    const neighbors = [
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 },
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
    ];

    for (const neighbor of neighbors) {
      // Out of bounds checks
      if (neighbor.x < 0 || neighbor.x >= gridWidth || neighbor.y < 0 || neighbor.y >= gridHeight) {
        continue;
      }

      const neighborHash = getHash(neighbor.x, neighbor.y);

      // Skip if already evaluated
      if (closedSet.has(neighborHash)) {
        continue;
      }

      // Allow the destination grid to be passable even if it normally contains solid nodes,
      // so NPCs can reach their targets (like resources/crop plots).
      const isTargetTile = neighbor.x === end.x && neighbor.y === end.y;
      const isPassable = isTargetTile || isTilePassable(neighbor.x, neighbor.y);

      if (!isPassable) {
        continue;
      }

      // Simple G score calculation (orthogonal movement weight = 1)
      const tentativeGScore = current.g + 1;

      // Check if neighbor is already in open list
      const existingOpen = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

      if (!existingOpen) {
        const hScore = Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y);
        const newNeighborNode: AStarNode = {
          x: neighbor.x,
          y: neighbor.y,
          g: tentativeGScore,
          h: hScore,
          f: tentativeGScore + hScore,
          parent: current,
        };
        openList.push(newNeighborNode);
      } else if (tentativeGScore < existingOpen.g) {
        existingOpen.g = tentativeGScore;
        existingOpen.f = tentativeGScore + existingOpen.h;
        existingOpen.parent = current;
      }
    }
  }

  // Fallback: If no direct path is found, return empty (e.g. locked off)
  return [];
}

/**
 * Helper to find the nearest navigable tile adjacent to a target
 * If the target itself is blocked, we can stand on one of the surrounding ortho squares!
 */
export function findNearestPassableAdjacent(
  start: GridPos,
  target: GridPos,
  gridWidth: number,
  gridHeight: number,
  isTilePassable: (x: number, y: number) => boolean
): GridPos {
  const neighbors = [
    { x: target.x, y: target.y - 1 },
    { x: target.x, y: target.y + 1 },
    { x: target.x - 1, y: target.y },
    { x: target.x + 1, y: target.y },
  ];

  let bestNode: GridPos = target;
  let minDistance = Infinity;

  for (const n of neighbors) {
    if (n.x >= 0 && n.x < gridWidth && n.y >= 0 && n.y < gridHeight) {
      if (isTilePassable(n.x, n.y)) {
        const dist = Math.abs(start.x - n.x) + Math.abs(start.y - n.y);
        if (dist < minDistance) {
          minDistance = dist;
          bestNode = n;
        }
      }
    }
  }

  return bestNode;
}
