/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// NPC Roles and States
export type NPCRole = 'farmer' | 'lumberjack' | 'miner';
export type NPCState = 'idle' | 'walking' | 'working' | 'returning';

// Tool Upgrades: Primitive -> Iron -> Silver -> Golden
export type ToolTier = 'primitive' | 'iron' | 'silver' | 'gold';

// Directions for walking animation
export type Direction = 'up' | 'down' | 'left' | 'right';

// Resource types collected and held
export type ResourceType = 'wood' | 'stone' | 'iron_ore' | 'silver_ore' | 'gold_ore' | 'potato' | 'tomato' | 'onion' | 'chili' | 'eggplant';

// Grid position helper
export interface GridPos {
  x: number;
  y: number;
}

// Crop Types
export type CropType = 'potato' | 'tomato' | 'onion' | 'chili' | 'eggplant';
export type CropStage = 'seed' | 'sprout' | 'growing' | 'mature';

export interface CropInfo {
  type: CropType;
  name: string;
  seedCost: number;
  sellValue: number;
  growTime: number; // in game ticks or seconds
  color: string;
}

// Map Grid Elements
export type TileType = 'grass' | 'water' | 'shallow' | 'dirt' | 'path' | 'well' | 'house' | 'shop' | 'fence';

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  wateredLevel?: number; // 0 = dry, >0 watered
}

// NPC Interface
export interface NPC {
  id: string;
  name: string;
  role: NPCRole;
  state: NPCState;
  
  // Grid coordinates and smooth sub-grid pixels
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  
  // Pathfinding progress
  path: GridPos[];
  currentPathIndex: number;
  moveSpeed: number; // grid units per frame
  moveProgress: number; // 0 to 1 between tiles
  
  // Tasks assignment
  targetNodeId: string | null;
  targetNodeType: 'crop' | 'node' | 'shop' | 'well' | null;
  
  // Tool characteristics from upgrading
  toolTier: ToolTier;
  
  // Direction for rendering sprite
  direction: Direction;
  walkFrame: number;
  
  // Carrying Cargo
  cargo: {
    type: ResourceType;
    amount: number;
  } | null;
  
  // Watering specific characteristics
  waterCapacity: number;
  waterLevel: number;
  
  // Task tick metrics
  actionProgress: number; // 0 to 100
  actionDuration: number; // Time in milliseconds required to complete work at current tier
}

// Crop Plot Interface
export interface CropPlot {
  id: string;
  x: number;
  y: number;
  cropType: CropType | null;
  stage: CropStage;
  growthProgress: number; // 0 to 100
  isWatered: boolean;
  assignedNPCActions: string[]; // NPC ids assigned to this plot so they don't lock each other
}

// Resource Node (Trees, Stubs, Rocks)
export type ResourceNodeType = 'oak_tree' | 'pine_tree' | 'stone' | 'iron' | 'silver' | 'gold';

export interface ResourceNode {
  id: string;
  x: number;
  y: number;
  type: ResourceNodeType;
  amount: number;
  maxAmount: number;
  regenTicks: number; // ticks left to regenerate when empty
}

// Upgrades cost mapping
export interface ToolUpgradeInfo {
  tier: ToolTier;
  name: string;
  speedMultiplier: number;
  woodCost: number;
  stoneCost: number;
  goldCost: number;
}

// Overall Inventory List
export interface Inventory {
  gold: number;
  wood: number;
  stone: number;
  iron_ore: number;
  silver_ore: number;
  gold_ore: number;
  potatoSeed: number;
  tomatoSeed: number;
  onionSeed: number;
  chiliSeed: number;
  eggplantSeed: number;
  potato: number;
  tomato: number;
  onion: number;
  chili: number;
  eggplant: number;
}

// Game Settings & Stats
export interface GameStats {
  totalGoldEarned: number;
  totalCropsHarvested: number;
  totalTreesChopped: number;
  totalOresMined: number;
  colonyLevel: number;
}
