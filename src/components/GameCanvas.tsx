/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, FloatingText } from '../utils/gameEngine';
import { initializeAssets, PixelAssets } from '../utils/assets';
import { TILE_SIZE, GRID_WIDTH, GRID_HEIGHT } from '../data';
import { NPC, CropPlot, ResourceNode } from '../types';
import { Play, Pause, MousePointerClick, RefreshCw, Layers } from 'lucide-react';

interface GameCanvasProps {
  engine: GameEngine;
  onUpdate: () => void;
  selectedNPC: NPC | null;
  setSelectedNPC: (npc: NPC | null) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  onUpdate,
  selectedNPC,
  setSelectedNPC,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const assetsRef = useRef<PixelAssets | null>(null);
  const requestRef = useRef<number | null>(null);
  const [showGridLines, setShowGridLines] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string>('Click on an NPC to select them, then click on trees, ores, or crops to assign them!');

  // Frame tick counters for wave animations
  const [waveFrame, setWaveFrame] = useState(0);

  // Initialize assets once
  useEffect(() => {
    assetsRef.current = initializeAssets();

    // Trigger wave ticks cycle every 250ms
    const waveInterval = setInterval(() => {
      setWaveFrame(f => (f + 1) % 4);
    }, 250);

    return () => clearInterval(waveInterval);
  }, []);

  // Main Canvas render and logic ticker loop
  useEffect(() => {
    const loop = () => {
      // 1. Progress State Tick
      engine.tick();
      onUpdate();

      // Ensure Selected NPC is in sync with Engine state
      if (selectedNPC) {
        const matchingCurrent = engine.npcs.find(n => n.id === selectedNPC.id);
        if (matchingCurrent) {
          setSelectedNPC(matchingCurrent);
        } else {
          setSelectedNPC(null); // was deleted or lost
        }
      }

      // 2. Draw canvas
      const canvas = canvasRef.current;
      const assets = assetsRef.current;
      if (canvas && assets) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Map Base Tiles
        engine.mapTiles.forEach(tile => {
          let tileCanvas = null;

          if (tile.type === 'dirt') {
            const plot = engine.cropPlots.find(p => p.x === tile.x && p.y === tile.y);
            tileCanvas = plot?.isWatered 
              ? assets.getTile('dirt_wet') 
              : assets.getTile('dirt_dry');
          } else if (tile.type === 'water') {
            tileCanvas = assets.getTile('water', waveFrame);
          } else {
            tileCanvas = assets.getTile(tile.type);
          }

          if (tileCanvas) {
            ctx.drawImage(tileCanvas, tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        });

        // Optional Grid Lines Overlay
        if (showGridLines) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          for (let x = 0; x < GRID_WIDTH; x++) {
            ctx.beginPath();
            ctx.moveTo(x * TILE_SIZE, 0);
            ctx.lineTo(x * TILE_SIZE, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y < GRID_HEIGHT; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * TILE_SIZE);
            ctx.lineTo(canvas.width, y * TILE_SIZE);
            ctx.stroke();
          }
        }

        // Draw Cobblestones path intersections borders
        // (Procedural paths connect houses perfectly, pre-drawn is good)

        // Draw Buildings
        // Main House: spans (3,3) to (5,5) size 96x96
        const houseAsset = assets.getTile('house');
        if (houseAsset) {
          ctx.drawImage(houseAsset, 3 * TILE_SIZE, 3 * TILE_SIZE, 96, 96);
        }

        // Shop Module: (15,3) to (17,5) size 96x96
        const shopAsset = assets.getTile('shop');
        if (shopAsset) {
          ctx.drawImage(shopAsset, 15 * TILE_SIZE, 3 * TILE_SIZE, 96, 96);
        }

        // Water Well: (11,7) to (11,8) size 32x64
        const wellAsset = assets.getTile('well');
        if (wellAsset) {
          ctx.drawImage(wellAsset, 11 * TILE_SIZE, 7 * TILE_SIZE, 32, 64);
        }

        // Draw Fences (Fences can be placed around farming zone boundary)
        const fencePositions = [
          { x: 2, y: 10 }, { x: 2, y: 11 }, { x: 2, y: 12 },
          { x: 9, y: 10 }, { x: 9, y: 11 }, { x: 9, y: 12 },
        ];
        fencePositions.forEach(fence => {
          const fenceAsset = assets.getTile('fence');
          if (fenceAsset) {
            ctx.drawImage(fenceAsset, fence.x * TILE_SIZE, fence.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        });

        // Draw Crop Plots Contents
        engine.cropPlots.forEach(plot => {
          if (plot.cropType) {
            const cropAsset = assets.getCrop(plot.cropType, plot.stage);
            ctx.drawImage(cropAsset, plot.x * TILE_SIZE, plot.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            
            // Draw a subtle watering state icon or growth indicator
            if (plot.stage !== 'mature') {
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.fillRect(plot.x * TILE_SIZE + 4, plot.y * TILE_SIZE + 26, 24, 3);
              ctx.fillStyle = plot.isWatered ? '#38bdf8' : '#e2e8f0';
              ctx.fillRect(plot.x * TILE_SIZE + 4, plot.y * TILE_SIZE + 26, (plot.growthProgress / 100) * 24, 3);
            } else {
              // Mature harvest indicator bounce tag
              const bounceY = Math.sin(Date.now() / 150) * 2;
              ctx.fillStyle = '#a855f7';
              ctx.beginPath();
              ctx.arc(plot.x * TILE_SIZE + 16, plot.y * TILE_SIZE + bounceY, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });

        // Draw Resource Nodes
        engine.resourceNodes.forEach(node => {
          if (node.amount > 0) {
            const nodeAsset = assets.getNode(node.type, node.amount);
            if (node.type.includes('tree')) {
              // Trees size is 64x96, pivots from ground (X center-aligned, bottom aligned)
              ctx.drawImage(nodeAsset, (node.x - 0.5) * TILE_SIZE, (node.y - 2) * TILE_SIZE, 64, 96);
            } else {
              ctx.drawImage(nodeAsset, node.x * TILE_SIZE, node.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
          } else {
            // Drawn as chopped stumps or flat pits
            ctx.fillStyle = '#78350f'; // stump-dark
            if (node.type.includes('tree')) {
              ctx.fillRect(node.x * TILE_SIZE + 12, node.y * TILE_SIZE + 24, 8, 8); // small stump
              ctx.fillStyle = 'rgba(255,255,255,0.15)'; // bark ring
              ctx.fillRect(node.x * TILE_SIZE + 13, node.y * TILE_SIZE + 24, 6, 2);
            } else {
              // mineral cavity
              ctx.fillStyle = '#374151';
              ctx.fillRect(node.x * TILE_SIZE + 6, node.y * TILE_SIZE + 22, 20, 4);
            }
            
            // Show respawn timer ring
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(node.x * TILE_SIZE + 4, node.y * TILE_SIZE + 4, 24, 2);
            ctx.fillStyle = '#4ade80';
            const maxRegen = node.type.includes('tree') ? 360 : 480;
            const progress = (maxRegen - node.regenTicks) / maxRegen;
            ctx.fillRect(node.x * TILE_SIZE + 4, node.y * TILE_SIZE + 4, progress * 24, 2);
          }
        });

        // Selector arrow or target pathways for Selected NPC
        if (selectedNPC) {
          // A. Draw Spinning yellow selector ring under selected NPC's feet
          const baseTime = Date.now() / 200;
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.ellipse(
            selectedNPC.x * TILE_SIZE + 16,
            selectedNPC.y * TILE_SIZE + 36,
            12 + Math.sin(baseTime) * 1.5,
            6 + Math.sin(baseTime) * 0.75,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.setLineDash([]); // clear dash

          // B. Draw dots path line connecting selected NPC to target
          if (selectedNPC.path.length > 0) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.moveTo(selectedNPC.x * TILE_SIZE + 16, selectedNPC.y * TILE_SIZE + 24);
            for (let i = selectedNPC.currentPathIndex; i < selectedNPC.path.length; i++) {
              ctx.lineTo(selectedNPC.path[i].x * TILE_SIZE + 16, selectedNPC.path[i].y * TILE_SIZE + 16);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Hovered grid highlight ring
        if (engine.hoverTile) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(engine.hoverTile.x * TILE_SIZE, engine.hoverTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }

        // Draw NPCs
        engine.npcs.forEach(npc => {
          const npcAsset = assets.getNPC(
            npc.role,
            npc.direction,
            npc.state,
            Math.floor(npc.walkFrame),
            npc.toolTier
          );
          // Drawn at smoothed float position offset
          // we align them so they stand centered on tiles
          ctx.drawImage(
            npcAsset,
            npc.x * TILE_SIZE,
            (npc.y - 0.5) * TILE_SIZE,
            TILE_SIZE,
            48
          );

          // Working bubble icon indicator
          if (npc.state === 'working') {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(npc.x * TILE_SIZE + 2, (npc.y - 0.7) * TILE_SIZE, 28, 4);
            ctx.fillStyle = '#eab308'; // Amber progress
            ctx.fillRect(npc.x * TILE_SIZE + 2, (npc.y - 0.7) * TILE_SIZE, (npc.actionProgress / 100) * 28, 4);
          }

          // Cargo delivery tag
          if (npc.cargo) {
            ctx.fillStyle = '#4ade80';
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 1;
            ctx.strokeRect(npc.x * TILE_SIZE + 26, (npc.y - 0.3) * TILE_SIZE, 6, 6);
            ctx.fillRect(npc.x * TILE_SIZE + 26, (npc.y - 0.3) * TILE_SIZE, 6, 6);
          }

          // Farmer water tank badge
          if (npc.role === 'farmer' && npc.waterLevel > 0) {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(npc.x * TILE_SIZE + 4, (npc.y - 0.1) * TILE_SIZE, 2.5, 0, Math.PI * 2);
            ctx.fill();
            if (npc.waterLevel > 1) {
              ctx.beginPath();
              ctx.arc(npc.x * TILE_SIZE + 4, (npc.y + 0.1) * TILE_SIZE, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });

        // Draw Floating Text notifications overlay
        engine.floatingTexts.forEach(txt => {
          ctx.fillStyle = '#000000'; // text shadow drop
          ctx.font = 'bold 11px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(txt.text, txt.x * TILE_SIZE + 16, txt.y * TILE_SIZE + 1);
          
          ctx.fillStyle = txt.color;
          ctx.fillText(txt.text, txt.x * TILE_SIZE + 16, txt.y * TILE_SIZE);
        });
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [engine, waveFrame, showGridLines, selectedNPC, onUpdate, setSelectedNPC]);

  // Handle Mouse Click triggers Selection & Actions
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const gridX = Math.floor(mouseX / TILE_SIZE);
    const gridY = Math.floor(mouseY / TILE_SIZE);

    // Bounds limit guard to prevent crashes
    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
      return;
    }

    // 1. Check if clicked an NPC
    const clickedNPC = engine.npcs.find(
      n => Math.abs(n.x - gridX) < 1.2 && Math.abs(n.y - gridY) < 1.2
    );

    if (clickedNPC) {
      setSelectedNPC(clickedNPC);
      engine.selectedNPCId = clickedNPC.id;
      setInfoMessage(`Selected NPC ${clickedNPC.name} (${clickedNPC.role.toUpperCase()}). Assign a command by clicking target!`);
      engine.addFloatingText(clickedNPC.x, clickedNPC.y - 0.5, 'Selected!', '#facc15');
      return;
    }

    // 2. If NPC is currently selected, handle action assignment target
    if (selectedNPC) {
      // Is there an interactive resource node?
      const targetNode = engine.resourceNodes.find(n => n.x === gridX && n.y === gridY);
      if (targetNode) {
        if (targetNode.amount <= 0) {
          setInfoMessage('That resource node is currently depleted, wait for it to recover!');
          return;
        }

        // Verify role compatibilities
        if (selectedNPC.role === 'lumberjack' && targetNode.type.includes('tree')) {
          engine.assignDirectCommand(selectedNPC, targetNode.id, 'node');
          setInfoMessage(`Ordered ${selectedNPC.name} to harvest wood at (${gridX}, ${gridY})`);
          return;
        } else if (selectedNPC.role === 'miner' && !targetNode.type.includes('tree')) {
          engine.assignDirectCommand(selectedNPC, targetNode.id, 'node');
          setInfoMessage(`Ordered ${selectedNPC.name} to mine ore minerals at (${gridX}, ${gridY})`);
          return;
        } else {
          setInfoMessage(`Only a ${targetNode.type.includes('tree') ? 'LUMBERJACK' : 'MINER'} can process that node!`);
          return;
        }
      }

      // Is there a mud Crop Plot?
      const targetCrop = engine.cropPlots.find(p => p.x === gridX && p.y === gridY);
      if (targetCrop) {
        if (selectedNPC.role === 'farmer') {
          engine.assignDirectCommand(selectedNPC, targetCrop.id, 'crop');
          setInfoMessage(`Ordered ${selectedNPC.name} to manage Crop Plot at (${gridX}, ${gridY})`);
        } else {
          setInfoMessage('Only a FARMER can work with crops!');
        }
        return;
      }

      // Check if clicked the Water Well (to draw water)
      if (gridX === 11 && (gridY === 7 || gridY === 8)) {
        if (selectedNPC.role === 'farmer') {
          engine.assignDirectCommand(selectedNPC, 'well', 'well');
          setInfoMessage(`Ordered ${selectedNPC.name} to refill water at the Water Well!`);
        } else {
          setInfoMessage('Only the Farmer requires water to hydrate crops!');
        }
        return;
      }

      // Clear selection if clicked blank land
      setSelectedNPC(null);
      engine.selectedNPCId = null;
      setInfoMessage('Clear instruction. Click an NPC to select them.');
    } else {
      // Inspect blank soil or item details
      const isPlot = engine.cropPlots.find(p => p.x === gridX && p.y === gridY);
      const isNode = engine.resourceNodes.find(n => n.x === gridX && n.y === gridY);

      if (isPlot) {
        setInfoMessage(`Tilled crop plot. Status: ${isPlot.cropType ? `${isPlot.cropType} (${Math.floor(isPlot.growthProgress)}% grown, Stage: ${isPlot.stage.toUpperCase()})` : 'EMPTY (Requires seeds)'}`);
      } else if (isNode) {
        setInfoMessage(`Mineral Node: ${isNode.type.toUpperCase()}. Units remaining: ${isNode.amount}/${isNode.maxAmount}`);
      } else if (gridX >= 15 && gridX <= 17 && gridY >= 3 && gridY <= 5) {
        setInfoMessage('The Town Shop. NPCs deliver logs, crops, and ores here to convert them into Shiny Coins.');
      } else if (gridX >= 3 && gridX <= 5 && gridY >= 3 && gridY <= 5) {
        setInfoMessage('Colony Main Headquarters. This is where your pioneers reside.');
      } else {
        setInfoMessage(`Grid Lands: coordinates (${gridX}, ${gridY})`);
      }
    }
  };

  // Tracking mouse over tile highlight boundaries
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const gridX = Math.floor(mouseX / TILE_SIZE);
    const gridY = Math.floor(mouseY / TILE_SIZE);

    if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
      engine.hoverTile = { x: gridX, y: gridY };
    } else {
      engine.hoverTile = null;
    }
  };

  const handleMouseLeave = () => {
    engine.hoverTile = null;
  };

  return (
    <div id="game_viewport_root" className="flex flex-col gap-4 w-full h-full justify-center items-center">
      {/* Upper Viewport Controls Info */}
      <div className="flex flex-wrap gap-2 w-full justify-between items-center text-xs text-[#e0ccb3] bg-[#251a12] border-2 border-[#8d6e63] p-2.5 rounded-lg select-none">
        <span className="flex items-center gap-1.5 text-yellow-405 font-semibold">
          <MousePointerClick className="w-4 h-4 text-yellow-404" />
          <span className="truncate max-w-[420px] md:max-w-[500px]">{infoMessage}</span>
        </span>
        <div className="flex gap-2.5 ml-auto">
          <button
            onClick={() => {
              engine.isAutoPlayActive = !engine.isAutoPlayActive;
              engine.addFloatingText(12, 10, engine.isAutoPlayActive ? 'Auto On 🤖' : 'Auto Off 🎮', '#a855f7');
              onUpdate();
            }}
            className={`cursor-pointer px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1 border-2 ${
              engine.isAutoPlayActive 
                ? 'bg-purple-900/40 text-purple-200 border-[#251a12] hover:bg-purple-900/60 shadow-sm' 
                : 'bg-[#5d4037] text-[#e0ccb3] border-[#251a12] hover:bg-[#8d6e63]'
            }`}
          >
            {engine.isAutoPlayActive ? <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> : <Pause className="w-3.5 h-3.5" />}
            Auto-Manage {engine.isAutoPlayActive ? 'ON' : 'OFF'}
          </button>
          
          <button
            onClick={() => setShowGridLines(!showGridLines)}
            className={`cursor-pointer px-2 py-1 rounded font-bold transition-all flex items-center gap-1 border-2 ${
              showGridLines 
                ? 'bg-[#4a773c] text-amber-50 border-[#251a12]' 
                : 'bg-[#5d4037] text-[#e0ccb3] border-[#251a12]'
            }`}
          >
            <Layers className="w-3.1 h-3.1" /> Grid
          </button>
        </div>
      </div>

      {/* Main Canvas Canvas Board Container with nostalgic CRT styling or sharp framing */}
      <div 
        ref={containerRef}
        className="w-full relative bg-[#251a12] border-4 border-[#251a12] p-1 md:p-2 rounded-2xl shadow-xl flex justify-center items-center select-none overflow-hidden"
      >
        <canvas
          id="simulation_map_canvas"
          ref={canvasRef}
          width={GRID_WIDTH * TILE_SIZE}
          height={GRID_HEIGHT * TILE_SIZE}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="rounded-xl w-full h-auto cursor-crosshair active:scale-[0.99] transition-transform"
          style={{ 
            imageRendering: 'pixelated', 
            maxWidth: '100%',
            aspectRatio: '4 / 3'
          }}
        />

        {selectedNPC && (
          <div className="absolute top-4 left-4 bg-[#4a773c] text-amber-100 border-2 border-[#251a12] px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 max-w-[280px] shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-green-300 animate-ping" />
            <span>Targeting {selectedNPC.name} ({selectedNPC.role.toUpperCase()})</span>
            <button 
              onClick={() => {
                setSelectedNPC(null);
                engine.selectedNPCId = null;
              }}
              className="text-yellow-105 hover:text-white ml-2 hover:scale-105 cursor-pointer font-bold font-sans"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Hover inspector coordinates at bottom panel */}
      <div className="text-[10px] text-[#e0ccb3]/70 font-mono tracking-wider">
        MAP MATRIX: {GRID_WIDTH}x{GRID_HEIGHT} | SPRITE ATLAS SCALE: 32PX | GRID-A* ALIGNED
      </div>
    </div>
  );
};
