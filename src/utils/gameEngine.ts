/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NPC, NPCRole, NPCState, ToolTier, ResourceType, CropPlot, ResourceNode, Inventory, GridPos, CropStage, Direction, CropType } from '../types';
import { GRID_WIDTH, GRID_HEIGHT, CROPS, TIER_BENEFITS, generateInitialMap, generateInitialResourceNodes, generateInitialCropPlots } from '../data';
import { findPath, findNearestPassableAdjacent } from './pathfinding';

// Floating text notifications displayed on the map
export interface FloatingText {
  id: string;
  x: number; // grid float position
  y: number;
  text: string;
  color: string;
  life: number; // starts at 60 (frames) count down
}

export interface MapTile {
  x: number;
  y: number;
  type: 'grass' | 'water' | 'shallow' | 'dirt' | 'path' | 'well' | 'house' | 'shop' | 'fence';
  wateredLevel: number; // 0 = dry, >0 watered
}

export class GameEngine {
  public mapTiles: MapTile[] = [];
  public npcs: NPC[] = [];
  public resourceNodes: ResourceNode[] = [];
  public cropPlots: CropPlot[] = [];
  public inventory: Inventory;
  public gold: number = 100;
  
  // Custom tool upgrades level trackers per role
  public toolTiers: Record<NPCRole, ToolTier> = {
    farmer: 'primitive',
    lumberjack: 'primitive',
    miner: 'primitive',
  };

  // Selections
  public selectedNPCId: string | null = null;
  public hoverTile: GridPos | null = null;
  
  // Floating alerts
  public floatingTexts: FloatingText[] = [];
  private textCounter = 0;

  // Auto task allocation toggle
  public isAutoPlayActive: boolean = true;
  
  // Stats
  public totalGoldEarned: number = 0;
  public totalCropsHarvested: number = 0;
  public totalTreesChopped: number = 0;
  public totalOresMined: number = 0;

  constructor(savedInventory?: Inventory) {
    this.mapTiles = generateInitialMap();
    this.resourceNodes = generateInitialResourceNodes();
    this.cropPlots = generateInitialCropPlots();
    this.inventory = savedInventory || {
      gold: 150,
      wood: 20,
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
    
    // Seed NPCs
    this.spawnNPC('farmer', 'Barny');
    this.spawnNPC('lumberjack', 'Jack');
    this.spawnNPC('miner', 'Rocky');
  }

  // Create an NPC
  public spawnNPC(role: NPCRole, explicitName?: string) {
    const id = `npc_${role}_${Date.now()}_${Math.floor(Math.random() * 100)}`;
    const names = {
      farmer: ['Giles', 'Pippin', 'Hodge', 'Nate', 'Silas'],
      lumberjack: ['Woody', 'Bruce', 'Paul', 'Logger', 'Axel'],
      miner: ['Cole', 'Dusty', 'Rusty', 'Oreo', 'Gravel'],
    };

    const name = explicitName || names[role][Math.floor(Math.random() * names[role].length)];

    // Place them near the main house door (4, 6)
    const newNPC: NPC = {
      id,
      name,
      role,
      state: 'idle',
      x: 4,
      y: 6,
      gridX: 4,
      gridY: 6,
      path: [],
      currentPathIndex: 0,
      moveSpeed: 0.05, // grid spacing unit per tick frame
      moveProgress: 0,
      targetNodeId: null,
      targetNodeType: null,
      toolTier: this.toolTiers[role],
      direction: 'down',
      walkFrame: 0,
      cargo: null,
      waterCapacity: 3,
      waterLevel: 0,
      actionProgress: 0,
      actionDuration: 100, // frames to complete. Tool upgrades divide this duration!
    };

    this.npcs.push(newNPC);
    this.addFloatingText(4, 5.5, `+ Hired ${name}!`, '#3b82f6');
  }

  // Check if grid tile is passable
  public isTilePassable = (x: number, y: number): boolean => {
    // Water boundary
    const tile = this.mapTiles.find(t => t.x === x && t.y === y);
    if (!tile) return false;
    
    if (tile.type === 'water' || tile.type === 'well' || tile.type === 'house' || tile.type === 'shop' || tile.type === 'fence') {
      return false;
    }

    // Nodes also block unless they are targets
    const hasNode = this.resourceNodes.some(n => n.x === x && n.y === y && n.amount > 0);
    if (hasNode) return false;

    return true;
  };

  // Push notifications
  public addFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({
      id: `text_${this.textCounter++}`,
      x,
      y,
      text,
      color,
      life: 60, // 60 frames (~1 second)
    });
  }

  // Assign specific task directly
  public assignDirectCommand(npc: NPC, targetId: string, targetType: 'crop' | 'node' | 'well' | 'shop') {
    npc.targetNodeId = targetId;
    npc.targetNodeType = targetType;
    npc.path = [];
    npc.currentPathIndex = 0;
    npc.moveProgress = 0;
    npc.actionProgress = 0;
    npc.state = 'walking';

    let targetPos: GridPos | null = null;

    if (targetType === 'crop') {
      const plot = this.cropPlots.find(p => p.id === targetId);
      if (plot) targetPos = { x: plot.x, y: plot.y };
    } else if (targetType === 'node') {
      const node = this.resourceNodes.find(n => n.id === targetId);
      if (node) targetPos = { x: node.x, y: node.y };
    } else if (targetType === 'well') {
      targetPos = { x: 11, y: 7 }; // Water Well Location
    } else if (targetType === 'shop') {
      targetPos = { x: 16, y: 6 }; // Shop Depot Location
    }

    if (targetPos) {
      const isWalkable = this.isTilePassable(targetPos.x, targetPos.y);
      let endPos = targetPos;
      
      // If the destination itself is blocked, path adjacent to it
      if (!isWalkable) {
        endPos = findNearestPassableAdjacent({ x: Math.floor(npc.x), y: Math.floor(npc.y) }, targetPos, GRID_WIDTH, GRID_HEIGHT, this.isTilePassable);
      }

      const generatedPath = findPath(
        { x: Math.floor(npc.x), y: Math.floor(npc.y) },
        endPos,
        GRID_WIDTH,
        GRID_HEIGHT,
        this.isTilePassable
      );

      if (generatedPath.length > 0) {
        npc.path = generatedPath;
        npc.currentPathIndex = 0;
        this.addFloatingText(npc.x, npc.y - 0.5, 'Understood!', '#22c55e');
      } else {
        // can't reach
        this.addFloatingText(npc.x, npc.y - 0.5, "Can't reach!", '#ef4444');
        npc.state = 'idle';
        npc.targetNodeId = null;
        npc.targetNodeType = null;
      }
    }
  }

  // System tick execution
  public tick() {
    // 1. Update Floating Texts life
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life--;
      t.y -= 0.015; // float slow upwards
      return t.life > 0;
    });

    // 2. Resource nodes regeneration
    this.resourceNodes.forEach(node => {
      if (node.amount <= 0) {
        node.regenTicks--;
        if (node.regenTicks <= 0) {
          node.amount = node.maxAmount;
          this.addFloatingText(node.x, node.y - 0.5, 'Respawned!', '#facc15');
        }
      }
    });

    // 3. Crop growths tick
    this.cropPlots.forEach(plot => {
      if (plot.cropType) {
        const cropInfo = CROPS[plot.cropType];
        if (plot.stage !== 'mature') {
          // If watered, grow speed is normal. Dry crops grow 4x slower!
          const growthSpeed = plot.isWatered ? 0.3 : 0.075;
          plot.growthProgress += growthSpeed;

          if (plot.growthProgress >= 100) {
            plot.growthProgress = 0;
            if (plot.stage === 'seed') {
              plot.stage = 'sprout';
              plot.isWatered = false; // absorbs hydration!
            } else if (plot.stage === 'sprout') {
              plot.stage = 'growing';
              plot.isWatered = false;
            } else if (plot.stage === 'growing') {
              plot.stage = 'mature';
              plot.isWatered = false;
            }
          }
        }
      }
    });

    // 4. Tick each NPC
    this.npcs.forEach(npc => {
      // NPC dynamic attributes update with upgrades
      npc.toolTier = this.toolTiers[npc.role];
      const tierBenefit = TIER_BENEFITS[npc.toolTier];

      // AI Scheduler logic if idle and autoplay is on
      if (npc.state === 'idle' && this.isAutoPlayActive) {
        this.determineAutoTask(npc);
      }

      // STATE MACHINE EXECUTOR
      switch (npc.state) {
        case 'idle':
          // Stand still - slowly bob frames
          npc.walkFrame = (npc.walkFrame + 0.05) % 3;
          break;

        case 'walking':
          this.handleNPCWalking(npc);
          break;

        case 'working':
          this.handleNPCWorking(npc, tierBenefit.multiplier);
          break;

        case 'returning':
          this.handleNPCReturning(npc);
          break;
      }
    });
  }

  // Walking mechanics
  private handleNPCWalking(npc: NPC) {
    if (npc.path.length === 0) {
      npc.state = 'idle';
      return;
    }

    const currentTarget = npc.path[npc.currentPathIndex];
    const dx = currentTarget.x - npc.x;
    const dy = currentTarget.y - npc.y;
    const dist = Math.hypot(dx, dy);

    // Determine heading direction for layout graphics
    if (Math.abs(dx) > Math.abs(dy)) {
      npc.direction = dx > 0 ? 'right' : 'left';
    } else if (Math.abs(dy) > 0.1) {
      npc.direction = dy > 0 ? 'down' : 'up';
    }

    npc.walkFrame = (npc.walkFrame + 0.15) % 3;

    if (dist < npc.moveSpeed) {
      npc.x = currentTarget.x;
      npc.y = currentTarget.y;
      npc.currentPathIndex++;

      // Reached final grid point of path
      if (npc.currentPathIndex >= npc.path.length) {
        npc.path = [];
        npc.currentPathIndex = 0;
        
        // Decide what to do at end of path!
        if (npc.targetNodeType === 'well') {
          // Reached water well source
          npc.state = 'working';
          npc.actionProgress = 0;
        } else if (npc.targetNodeType === 'shop') {
          // Delivering products
          this.deliverNPCResources(npc);
        } else if (npc.targetNodeId !== null) {
          npc.state = 'working';
          npc.actionProgress = 0;
        } else {
          npc.state = 'idle';
        }
      }
    } else {
      npc.x += (dx / dist) * npc.moveSpeed;
      npc.y += (dy / dist) * npc.moveSpeed;
    }
  }

  // Working mechanics
  private handleNPCWorking(npc: NPC, multiplier: number) {
    // Show tools swing action sequence, cycle work frame
    npc.walkFrame = 3; // Swing frame

    // Work ticks progress. Speed multiplication factors speed it up compounding!
    const tickRate = multiplier * 1.5;
    npc.actionProgress += tickRate;

    if (npc.actionProgress >= 100) {
      npc.actionProgress = 0;
      
      // Accomplished work triggers!
      if (npc.targetNodeType === 'well') {
        // Farmer finished drawing water
        npc.waterLevel = npc.waterCapacity;
        this.addFloatingText(npc.x, npc.y - 0.5, 'Water filled 💧', '#3b82f6');
        npc.targetNodeId = null;
        npc.targetNodeType = null;
        npc.state = 'idle';
      } 
      else if (npc.role === 'farmer') {
        this.executeFarmerWork(npc);
      } 
      else if (roleMatchesNode(npc.role, npc.targetNodeType)) {
        this.executeGathererWork(npc);
      } 
      else {
        npc.state = 'idle';
        npc.targetNodeId = null;
        npc.targetNodeType = null;
      }
    }
  }

  // Delivery mechanisms
  private handleNPCReturning(npc: NPC) {
    // Return destination is shop or house
    const destination: GridPos = { x: 16, y: 6 }; // Shop center area path
    
    if (npc.path.length === 0) {
      const generatedPath = findPath(
        { x: Math.floor(npc.x), y: Math.floor(npc.y) },
        destination,
        GRID_WIDTH,
        GRID_HEIGHT,
        this.isTilePassable
      );
      
      if (generatedPath.length > 0) {
        npc.path = generatedPath;
        npc.currentPathIndex = 0;
        npc.state = 'walking';
        npc.targetNodeType = 'shop';
      } else {
        // instantly dump if paths are totally blocked
        this.deliverNPCResources(npc);
      }
    } else {
      this.handleNPCWalking(npc);
    }
  }

  // Farmer specialized execution
  private executeFarmerWork(npc: NPC) {
    const plot = this.cropPlots.find(p => p.id === npc.targetNodeId);
    if (!plot) {
      npc.state = 'idle';
      npc.targetNodeId = null;
      npc.targetNodeType = null;
      return;
    }

    // Plot has 3 states: Clear -> Needs Plant, Planted dry -> Needs water, Mature -> Needs harvest
    // Case A: Empty soil slot, ready to plant potato/tomato seed
    if (plot.cropType === null) {
      // Choose available seed to plant
      let seedToPlant: CropType | null = null;
      const seedTypes: { key: string; type: CropType }[] = [
        { key: 'eggplantSeed', type: 'eggplant' },
        { key: 'chiliSeed', type: 'chili' },
        { key: 'onionSeed', type: 'onion' },
        { key: 'tomatoSeed', type: 'tomato' },
        { key: 'potatoSeed', type: 'potato' },
      ];

      for (const st of seedTypes) {
        if (this.inventory[st.key as keyof Inventory] > 0) {
          (this.inventory[st.key as keyof Inventory] as number)--;
          seedToPlant = st.type;
          break;
        }
      }

      // If no custom premium seeds and potato seeds are empty, do not plant (needs manual seed purchase)
      if (!seedToPlant) {
        this.addFloatingText(plot.x, plot.y - 0.5, 'No seeds left! 🚫', '#ef4444');
        npc.state = 'idle';
        npc.targetNodeId = null;
        npc.targetNodeType = null;
        return;
      }

      plot.cropType = seedToPlant;
      plot.stage = 'seed';
      plot.growthProgress = 0;
      plot.isWatered = false;

      this.addFloatingText(plot.x, plot.y - 0.5, `Planted ${CROPS[seedToPlant].name}! 🌱`, '#22c55e');
      npc.state = 'idle';
      npc.targetNodeId = null;
      npc.targetNodeType = null;
    }
    // Case B: Dry crop requires water hydration
    else if (!plot.isWatered && plot.stage !== 'mature') {
      if (npc.waterLevel > 0) {
        npc.waterLevel--;
        plot.isWatered = true;
        this.addFloatingText(plot.x, plot.y - 0.5, 'Watered! 💧', '#38bdf8');
        npc.state = 'idle';
        npc.targetNodeId = null;
        npc.targetNodeType = null;
      } else {
        // Needs hydration, but can is empty! Switch target to well
        this.assignDirectCommand(npc, 'well', 'well');
      }
    }
    // Case C: Mature ready to harvest
    else if (plot.stage === 'mature') {
      const type = plot.cropType;
      plot.cropType = null;
      plot.stage = 'seed';
      plot.growthProgress = 0;
      plot.isWatered = false;

      // Pack harvested crop in cargo!
      npc.cargo = {
        type: type,
        amount: 1,
      };

      this.totalCropsHarvested++;
      this.addFloatingText(plot.x, plot.y - 0.5, `Harvested ${CROPS[type].name}! 🧺`, '#a855f7');
      
      // Path immediate to depot shop to deliver!
      npc.state = 'returning';
    } 
    else {
      // Sprout growing but already watered, go back to idle
      npc.state = 'idle';
      npc.targetNodeId = null;
      npc.targetNodeType = null;
    }
  }

  // Wood & Ore gatherer specialized execution
  private executeGathererWork(npc: NPC) {
    const node = this.resourceNodes.find(n => n.id === npc.targetNodeId);
    if (!node || node.amount <= 0) {
      npc.state = 'idle';
      npc.targetNodeId = null;
      npc.targetNodeType = null;
      return;
    }

    node.amount--;
    
    // Set cargo yield
    let cargoType: ResourceType = 'stone';
    let label = '';
    
    if (node.type.includes('tree')) {
      cargoType = 'wood';
      label = 'Wood 🪵';
    } else if (node.type === 'stone') {
      cargoType = 'stone';
      label = 'Cobble 🪨';
    } else if (node.type === 'iron') {
      cargoType = 'iron_ore';
      label = 'Iron Ore 🧲';
    } else if (node.type === 'silver') {
      cargoType = 'silver_ore';
      label = 'Silver Vein 🪙';
    } else if (node.type === 'gold') {
      cargoType = 'gold_ore';
      label = 'Gold Ore ✨';
    }

    npc.cargo = {
      type: cargoType,
      amount: node.type.includes('tree') ? 3 : 2,
    };

    if (node.type.includes('tree')) {
      this.totalTreesChopped++;
    } else {
      this.totalOresMined++;
    }

    this.addFloatingText(node.x, node.y - 0.5, `Collected ${label}!`, '#cbd5e1');

    if (node.amount <= 0) {
      node.regenTicks = node.type.includes('tree') ? 360 : 480; // Respawn frames
    }

    npc.state = 'returning';
  }

  // Delivery transaction
  private deliverNPCResources(npc: NPC) {
    if (npc.cargo) {
      const cargo = npc.cargo;
      (this.inventory[cargo.type as keyof Inventory] as number) += cargo.amount;

      let color = '#22c55e';
      let icon = '';

      if (cargo.type === 'wood') { color = '#b45309'; icon = '🪵'; }
      else if (cargo.type === 'stone') { color = '#9ca3af'; icon = '🪨'; }
      else if (cargo.type === 'iron_ore') { color = '#f97316'; icon = '🧲'; }
      else if (cargo.type === 'silver_ore') { color = '#38bdf8'; icon = '🪙'; }
      else if (cargo.type === 'gold_ore') { color = '#eab308'; icon = '✨'; }
      else { color = '#a855f7'; icon = '🧺'; }

      this.addFloatingText(npc.x, npc.y - 0.6, `+${cargo.amount} Delivered ${icon}`, color);
      npc.cargo = null;

      // Sell automatically if configured or just accumulate in inventory
      // We will automatically process mined rare ores and crops into GOLD COINS 
      // immediately at the shop area to make compiling profit compounding seamless!
      this.autoSellCargo(cargo.type, cargo.amount);
    }

    npc.state = 'idle';
    npc.targetNodeId = null;
    npc.targetNodeType = null;
  }

  // Auto processing sell cargo
  public autoSellCargo(type: ResourceType, amt: number) {
    let goldValue = 0;
    
    if (CROPS[type as CropType]) {
      goldValue = CROPS[type as CropType].sellValue * amt;
    } else if (type === 'iron_ore') {
      goldValue = 18 * amt;
    } else if (type === 'silver_ore') {
      goldValue = 35 * amt;
    } else if (type === 'gold_ore') {
      goldValue = 65 * amt;
    }

    if (goldValue > 0) {
      this.inventory.gold += goldValue;
      this.totalGoldEarned += goldValue;
      this.addFloatingText(16, 4.5, `+${goldValue}g Earned! 💰`, '#eab308');
    }
  }

  // Smart Scheduler Auto-allocator searching for tasks
  private determineAutoTask(npc: NPC) {
    if (npc.role === 'farmer') {
      // 1. Water bucket depleted? Refill!
      if (npc.waterLevel === 0) {
        this.assignDirectCommand(npc, 'well', 'well');
        return;
      }

      // 2. Search for mature crops to harvest
      const maturePlot = this.cropPlots.find(p => p.cropType !== null && p.stage === 'mature');
      if (maturePlot) {
        this.assignDirectCommand(npc, maturePlot.id, 'crop');
        return;
      }

      // 3. Search for dry plots that need watering
      const dryPlot = this.cropPlots.find(p => p.cropType !== null && !p.isWatered && p.stage !== 'mature');
      if (dryPlot) {
        this.assignDirectCommand(npc, dryPlot.id, 'crop');
        return;
      }

      // 4. Look for unplanted plots if we have seeds in inventory
      const hasAnySeeds = (
        this.inventory.potatoSeed > 0 ||
        this.inventory.tomatoSeed > 0 ||
        this.inventory.onionSeed > 0 ||
        this.inventory.chiliSeed > 0 ||
        this.inventory.eggplantSeed > 0
      );
      if (hasAnySeeds) {
        const emptyPlot = this.cropPlots.find(p => p.cropType === null);
        if (emptyPlot) {
          this.assignDirectCommand(npc, emptyPlot.id, 'crop');
          return;
        }
      }
    } 
    else if (npc.role === 'lumberjack') {
      // Search for available Tree node
      const aliveTrees = this.resourceNodes.filter(n => n.type.includes('tree') && n.amount > 0);
      if (aliveTrees.length > 0) {
        // choose closest
        let closest = aliveTrees[0];
        let minDist = Infinity;
        aliveTrees.forEach(n => {
          const dist = Math.abs(npc.x - n.x) + Math.abs(npc.y - n.y);
          if (dist < minDist) {
            minDist = dist;
            closest = n;
          }
        });

        this.assignDirectCommand(npc, closest.id, 'node');
      }
    } 
    else if (npc.role === 'miner') {
      // Search closest mine ore boulder
      const aliveRocks = this.resourceNodes.filter(n => !n.type.includes('tree') && n.amount > 0);
      if (aliveRocks.length > 0) {
        let closest = aliveRocks[0];
        let minDist = Infinity;
        aliveRocks.forEach(n => {
          const dist = Math.abs(npc.x - n.x) + Math.abs(npc.y - n.y);
          if (dist < minDist) {
            minDist = dist;
            closest = n;
          }
        });

        this.assignDirectCommand(npc, closest.id, 'node');
      }
    }
  }
}

// Helpers
function roleMatchesNode(role: string, targetType: any): boolean {
  if (role === 'lumberjack' && targetType === 'node') return true;
  if (role === 'miner' && targetType === 'node') return true;
  return false;
}
