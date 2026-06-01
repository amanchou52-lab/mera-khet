/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CropInfo, ToolUpgradeInfo, ToolTier, CropType } from './types';

// Grid configurations
export const GRID_WIDTH = 24;
export const GRID_HEIGHT = 18;
export const TILE_SIZE = 32;

// Crop information map
export const CROPS: Record<CropType, CropInfo> = {
  potato: {
    type: 'potato',
    name: 'Potato',
    seedCost: 5,
    sellValue: 12,
    growTime: 120, // 2 seconds at 60 FPS
    color: '#9a3412',
  },
  tomato: {
    type: 'tomato',
    name: 'Tomato',
    seedCost: 8,
    sellValue: 20,
    growTime: 240, // 4 seconds
    color: '#dc2626',
  },
  onion: {
    type: 'onion',
    name: 'Onion',
    seedCost: 12,
    sellValue: 32,
    growTime: 360, // 6 seconds
    color: '#f59e0b',
  },
  chili: {
    type: 'chili',
    name: 'Chili',
    seedCost: 20,
    sellValue: 55,
    growTime: 480, // 8 seconds
    color: '#e11d48',
  },
  eggplant: {
    type: 'eggplant',
    name: 'Eggplant',
    seedCost: 35,
    sellValue: 95,
    growTime: 600, // 10 seconds
    color: '#4c1d95',
  },
};

// Tool tier speeds and cost formulations
export const TIER_BENEFITS: Record<ToolTier, { name: string; multiplier: number }> = {
  primitive: { name: 'Primitive Stone', multiplier: 1.0 },
  iron: { name: 'Basat Iron', multiplier: 2.0 },
  silver: { name: 'Shining Silver', multiplier: 3.5 },
  gold: { name: 'Gleaming Golden', multiplier: 5.5 },
};

// Hire cost formulations
// NPC count increments scale costs compounding
export const HIRE_BASE_GOLD = 150;
export const HIRE_MULTIPLIER = 1.8;

// Tool Upgrade specifications
export const TOOL_UPGRADES: Record<ToolTier, ToolUpgradeInfo> = {
  primitive: {
    tier: 'primitive',
    name: 'Stone Tool',
    speedMultiplier: 1.0,
    woodCost: 0,
    stoneCost: 0,
    goldCost: 0,
  },
  iron: {
    tier: 'iron',
    name: 'Basat Iron Tool',
    speedMultiplier: 2.0,
    woodCost: 10,
    stoneCost: 10,
    goldCost: 100,
  },
  silver: {
    tier: 'silver',
    name: 'Shining Silver Tool',
    speedMultiplier: 3.5,
    woodCost: 25,
    stoneCost: 25,
    goldCost: 300,
  },
  gold: {
    tier: 'gold',
    name: 'Gleaming Golden Tool',
    speedMultiplier: 5.5,
    woodCost: 60,
    stoneCost: 60,
    goldCost: 750,
  },
};

// Helper to calculate costs based on levels
export function getUpgradeCost(base: number, level: number, multiplier = 1.5): number {
  return Math.floor(base * Math.pow(multiplier, level));
}

// Initial Game Inventory State standard
export const STARTING_INVENTORY = {
  gold: 150,
  wood: 15,
  stone: 15,
  iron_ore: 0,
  silver_ore: 0,
  gold_ore: 0,
  potatoSeed: 5,
  tomatoSeed: 2,
  onionSeed: 0,
  chiliSeed: 0,
  eggplantSeed: 0,
  potato: 0,
  tomato: 0,
  onion: 0,
  chili: 0,
  eggplant: 0,
};

// Setup map tile positions specifically:
// House top-left is 3, 3 (size 3x3 layout)
// Shop top-left is 15, 3 (size 3x3 layout)
// Well is 11, 7 (size 1x2 layout)
// Let's create a map design generator function.
export function generateInitialMap(): any[] {
  const map: any[] = [];
  
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      // 1. Water surrounding border
      let type: any = 'grass';
      
      if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
        type = 'water';
      } else if (x === 1 || x === GRID_WIDTH - 2 || y === 1 || y === GRID_HEIGHT - 2) {
        type = 'shallow';
      }
      
      // Placements of static structures on passability map:
      // A. House 3x3: (3,3) to (5,5)
      if (x >= 3 && x <= 5 && y >= 3 && y <= 5) {
        type = 'house';
      }
      // B. Shop 3x3: (15,3) to (17,5)
      else if (x >= 15 && x <= 17 && y >= 3 && y <= 5) {
        type = 'shop';
      }
      // C. Water Well 1x2: (11,7) to (11,8)
      else if (x === 11 && (y === 7 || y === 8)) {
        type = 'well';
      }
      // D. Dirt Plots centered (farming region): y=10..12, x=3..7 (6 tilled plots)
      else if (type === 'grass' && x >= 3 && x <= 8 && y >= 10 && y <= 12) {
        // Soil plots
        type = 'dirt';
      }
      // E. Path connectors - beautiful cobblestones
      // vertical spine connecting house area to well and main avenue
      else if (type === 'grass' && x === 4 && y >= 6 && y <= 8) {
        type = 'path';
      }
      else if (type === 'grass' && x === 16 && y >= 6 && y <= 8) {
        type = 'path';
      }
      else if (type === 'grass' && y === 8 && x >= 4 && x <= 16) {
        type = 'path';
      }
      else if (type === 'grass' && x === 11 && y === 9) {
        type = 'path';
      }

      map.push({
        x,
        y,
        type,
        wateredLevel: 0
      });
    }
  }

  return map;
}

// Initial placements of interactive Resource Nodes
export function generateInitialResourceNodes(): any[] {
  const nodes: any[] = [];
  
  // Forest Area (trees) bottom right (x=14..21, y=10..15)
  const treePositions = [
    { x: 19, y: 11, type: 'oak_tree' },
    { x: 21, y: 11, type: 'pine_tree' },
    { x: 14, y: 14, type: 'oak_tree' },
    { x: 17, y: 13, type: 'pine_tree' },
    { x: 20, y: 14, type: 'oak_tree' },
    { x: 15, y: 11, type: 'oak_tree' },
  ];

  treePositions.forEach((pos, idx) => {
    nodes.push({
      id: `node_tree_${idx}`,
      x: pos.x,
      y: pos.y,
      type: pos.type,
      amount: 5,
      maxAmount: 5,
      regenTicks: 0,
    });
  });

  // Mining Area (rocks containing minerals) top right (x=19..21, y=2..7)
  const miningPositions = [
    { x: 20, y: 2, type: 'stone' },
    { x: 21, y: 3, type: 'iron' },
    { x: 19, y: 5, type: 'silver' },
    { x: 21, y: 7, type: 'gold' },
    { x: 11, y: 2, type: 'stone' }, // lone stone near well
  ];

  miningPositions.forEach((pos, idx) => {
    nodes.push({
      id: `node_ore_${idx}`,
      x: pos.x,
      y: pos.y,
      type: pos.type,
      amount: 4,
      maxAmount: 4,
      regenTicks: 0,
    });
  });

  return nodes;
}

// Initial placements of crop plots
export function generateInitialCropPlots(): any[] {
  // Let's tilled dirt positions in generateInitialMap
  const plots: any[] = [
    { id: 'plot_1', x: 3, y: 11, cropType: 'potato', stage: 'mature', growthProgress: 100, isWatered: false, assignedNPCActions: [] },
    { id: 'plot_2', x: 5, y: 11, cropType: 'tomato', stage: 'growing', growthProgress: 50, isWatered: true, assignedNPCActions: [] },
    { id: 'plot_3', x: 7, y: 11, cropType: null, stage: 'seed', growthProgress: 0, isWatered: false, assignedNPCActions: [] },
    { id: 'plot_4', x: 3, y: 12, cropType: null, stage: 'seed', growthProgress: 0, isWatered: false, assignedNPCActions: [] },
    { id: 'plot_5', x: 5, y: 12, cropType: null, stage: 'seed', growthProgress: 0, isWatered: false, assignedNPCActions: [] },
    { id: 'plot_6', x: 7, y: 12, cropType: null, stage: 'seed', growthProgress: 0, isWatered: false, assignedNPCActions: [] },
  ];

  return plots;
}
