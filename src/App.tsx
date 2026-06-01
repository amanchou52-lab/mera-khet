/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GameEngine } from './utils/gameEngine';
import { GameCanvas } from './components/GameCanvas';
import { ShopPanel } from './components/ShopPanel';
import { HUD } from './components/HUD';
import { NPC } from './types';
import { TIER_BENEFITS } from './data';
import { Play, Pause, RefreshCw, BarChart2, Eye, Sun, Moon, HelpCircle } from 'lucide-react';

export default function App() {
  const [engine] = useState(() => new GameEngine());
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  
  // React reactive mirrors to state triggers
  const [tickCount, setTickCount] = useState(0);
  const [morale, setMorale] = useState(100);
  const [speedBoostActive, setSpeedBoostActive] = useState(false);

  // Simulated Day Clock parameters
  const [simDay, setSimDay] = useState(1);
  const [simHour, setSimHour] = useState(8);
  const [simMinute, setSimMinute] = useState(0);

  // Instructions toggle modal
  const [showGuide, setShowGuide] = useState(false);

  // Increment simulated time in the loop
  useEffect(() => {
    const timer = setInterval(() => {
      setSimMinute(m => {
        let nextMin = m + 10;
        if (nextMin >= 60) {
          nextMin = 0;
          setSimHour(h => {
            let nextHour = h + 1;
            if (nextHour >= 24) {
              nextHour = 0;
              setSimDay(d => d + 1);
            }
            return nextHour;
          });
        }
        return nextMin;
      });
    }, 4000); // 10 sim-minutes every 4 seconds

    return () => clearInterval(timer);
  }, []);

  // Update loop helper trigger
  const handleEngineUpdate = () => {
    setTickCount(t => t + 1);
  };

  const isNightTime = simHour >= 18 || simHour <= 5;

  return (
    <div className="min-h-screen bg-[#2d5a27] text-amber-100 flex flex-col font-sans transition-all selection:bg-yellow-600/20 antialiased selection:text-yellow-105">
      
      {/* Upper Navigation Header Bar */}
      <header className="bg-[#3d2b1f] border-b-4 border-[#251a12] select-none sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand Titles */}
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-spin-slow">🚜</span>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-yellow-100 font-sans flex items-center gap-2">
                Pixel Colony
                <span className="text-[10px] bg-yellow-400/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.2 rounded font-mono font-bold tracking-wider uppercase">
                  SIMULATION
                </span>
              </h1>
              <p className="text-[10px] text-[#e0ccb3] font-mono">RETRO 2D SETTLEMENT MANAGER</p>
            </div>
          </div>

          {/* Day / Night clock overlays */}
          <div className="flex items-center gap-3 bg-[#5d4037] border-2 border-[#8d6e63] px-4 py-1.5 rounded-full shadow-inner font-mono text-xs text-[#e0ccb3]">
            {isNightTime ? (
              <Moon className="w-4 h-4 text-indigo-300 animate-pulse" />
            ) : (
              <Sun className="w-4 h-4 text-yellow-400 animate-spin-slow" />
            )}
            <span className="font-bold flex items-center gap-1.5">
              <span>Day {simDay}</span>
              <span className="text-[#8d6e63]">|</span>
              <span className="text-yellow-300 font-semibold">
                {String(simHour).padStart(2, '0')}:{String(simMinute).padStart(2, '0')} {simHour >= 12 ? 'PM' : 'AM'}
              </span>
            </span>
          </div>

          {/* Quick Info buttons panel */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="cursor-pointer bg-[#8d6e63] hover:bg-[#a1887f] border-2 border-[#5d4037] p-2 text-amber-50 hover:text-white rounded-lg transition-all flex items-center gap-1 text-xs shadow-md"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Guide Info</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Panel Content Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Statistics Panels Box */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[#3d2b1f] p-3 rounded-2xl border-4 border-[#251a12] text-xs shadow-inner">
          <div className="bg-[#5d4037] p-3 rounded-xl border-2 border-[#8d6e63] flex items-center gap-3 select-none">
            <span className="text-2xl">💰</span>
            <div>
              <p className="text-[10px] text-[#e0ccb3] uppercase tracking-wider font-bold">Total Golden Minted</p>
              <h4 className="font-bold text-yellow-200 mt-0.5 text-xs">{engine.totalGoldEarned + 100}g</h4>
            </div>
          </div>

          <div className="bg-[#5d4037] p-3 rounded-xl border-2 border-[#8d6e63] flex items-center gap-3 select-none">
            <span className="text-2xl">🧺</span>
            <div>
              <p className="text-[10px] text-[#e0ccb3] uppercase tracking-wider font-bold">Crops Harvested</p>
              <h4 className="font-bold text-yellow-200 mt-0.5 text-xs">{engine.totalCropsHarvested} units</h4>
            </div>
          </div>

          <div className="bg-[#5d4037] p-3 rounded-xl border-2 border-[#8d6e63] flex items-center gap-3 select-none">
            <span className="text-2xl">🪵</span>
            <div>
              <p className="text-[10px] text-[#e0ccb3] uppercase tracking-wider font-bold">Trees Chopped</p>
              <h4 className="font-bold text-yellow-200 mt-0.5 text-xs">{engine.totalTreesChopped} logs</h4>
            </div>
          </div>

          <div className="bg-[#5d4037] p-3 rounded-xl border-2 border-[#8d6e63] flex items-center gap-3 select-none">
            <span className="text-2xl">⛏️</span>
            <div>
              <p className="text-[10px] text-[#e0ccb3] uppercase tracking-wider font-bold">Ores Excavated</p>
              <h4 className="font-bold text-yellow-200 mt-0.5 text-xs">{engine.totalOresMined} minerals</h4>
            </div>
          </div>
        </div>

        {/* Dynamic Instructional Guide Overlay when visible */}
        {showGuide && (
          <div className="bg-[#3e2b22] text-[#e0ccb3] border-4 border-[#251a12] p-4 rounded-2xl flex flex-col gap-3 select-none animate-fadeIn shadow-xl">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-yellow-400 flex items-center gap-1.5">
              💡 COLONY MANAGEMENT COMMAND MANUAL
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] leading-relaxed text-[#e0ccb3]/90 font-sans">
              <div>
                <span className="font-extrabold text-white block mb-0.5">1. Cursor Selection ("God Mode")</span>
                Click once on any NPC (Farmer, Lumberjack, Miner) to SELECT them. They will show a spinning yellow indicator ring!
              </div>
              <div>
                <span className="font-extrabold text-white block mb-0.5">2. Direct Commands Allocation</span>
                While selecting an NPC, click on a resource node to route them: Lumberjack to trees 🌲, Miner to rocks 🪨, or Farmer to tilled mud crop plots 🌱.
              </div>
              <div>
                <span className="font-extrabold text-white block mb-0.5">3. Autoplay Task Fallbacks</span>
                If Auto-Play is ON, idle NPCs will scan and find available local work on their own. Direct selection clicks override Auto mode instantly!
              </div>
            </div>
          </div>
        )}

        {/* Master Double-Column Page Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Core Map Game Canvas Viewport */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="bg-[#3d2b1f] border-4 border-[#251a12] p-4 rounded-3xl flex flex-col shadow-lg">
              <GameCanvas
                engine={engine}
                onUpdate={handleEngineUpdate}
                selectedNPC={selectedNPC}
                setSelectedNPC={setSelectedNPC}
              />
            </div>

            {/* Active Workers monitoring list */}
            <div className="bg-[#3d2b1f] border-4 border-[#251a12] p-4 rounded-3xl flex flex-col gap-2 select-noneshadow-lg">
              <h3 className="text-xs font-extrabold tracking-wide text-[#e0ccb3] uppercase flex items-center gap-1.5">
                👷 Active Settlers Status Grid
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-1.5">
                {engine.npcs.map(npc => {
                  const isNpcSelected = selectedNPC?.id === npc.id;
                  const speedMultiplier = TIER_BENEFITS[npc.toolTier].multiplier;
                  
                  return (
                    <div
                      key={npc.id}
                      onClick={() => {
                        setSelectedNPC(npc);
                        engine.selectedNPCId = npc.id;
                        engine.addFloatingText(npc.x, npc.y - 0.5, 'Selected!', '#facc15');
                      }}
                      className={`cursor-pointer p-2.5 rounded-xl border-2 flex flex-col justify-between hover:border-[#8d6e63] transition-all ${
                        isNpcSelected 
                          ? 'bg-[#3e2b22] border-white ring-4 ring-[#8d6e63]' 
                          : 'bg-[#5d4037] border-[#251a12]'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <h4 className="font-bold text-amber-50 text-xs flex items-center gap-1">
                            {npc.name}
                            <span className="text-[9px] text-[#e0ccb3]/70 font-mono capitalize">({npc.role})</span>
                          </h4>
                          <span className="text-[10px] text-[#e0ccb3]/80 block leading-tight mt-0.5 italic">
                            {npc.state === 'idle' && '💤 Idle and awaiting target'}
                            {npc.state === 'walking' && `🚶 Walking to (${Math.floor(npc.x)}, ${Math.floor(npc.y)})`}
                            {npc.state === 'working' && '⚒️ Performing tasks...'}
                            {npc.state === 'returning' && '🚚 Storing items in warehouse'}
                          </span>
                        </div>
                        <span className="text-lg">
                          {npc.role === 'farmer' ? '🚜' : npc.role === 'lumberjack' ? '🪓' : '👷'}
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#3e2b22] flex justify-between items-center text-[10px] text-[#e0ccb3]/85">
                        <span>Tool Speed: <b className="text-yellow-400 font-mono">{speedMultiplier}x</b></span>
                        {npc.cargo && (
                          <span className="text-yellow-100 font-bold bg-[#4a773c] border-2 border-[#251a12] px-1 py-0.2 rounded font-mono uppercase text-[9px] shadow-sm">
                            CARGO 📦
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Economics Shop & Upgrades */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Top Row: Inventory Warehouse Status HUD */}
            <HUD
              engine={engine}
              onUpdate={handleEngineUpdate}
              morale={morale}
              setMorale={setMorale}
              speedBoostActive={speedBoostActive}
              setSpeedBoostActive={setSpeedBoostActive}
            />

            {/* Bottom Row: Shop Trading center */}
            <ShopPanel
              engine={engine}
              onUpdate={handleEngineUpdate}
            />

          </div>

        </div>

      </main>

      {/* Sticky footer */}
      <footer className="mt-12 bg-[#3d2b1f] border-t-4 border-[#251a12] py-6 text-center text-[11px] text-[#e0ccb3]/60 font-mono select-none">
        PIXEL COLONY V1.1.0-RC | PROCEDURAL PIXEL-ART CANVAS PARSING ENGINE | NO TRADING GAS FEE
      </footer>
    </div>
  );
}
