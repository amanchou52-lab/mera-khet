/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameEngine } from '../utils/gameEngine';
import { CROPS } from '../data';
import { CropType, Inventory } from '../types';
import { Heart, Coins, Award, PackageCheck, Zap, Info } from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  onUpdate: () => void;
  morale: number; // 0 to 100 tracker
  setMorale: React.Dispatch<React.SetStateAction<number>>;
  speedBoostActive: boolean;
  setSpeedBoostActive: React.Dispatch<React.SetStateAction<boolean>>;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onUpdate,
  morale,
  setMorale,
  speedBoostActive,
  setSpeedBoostActive,
}) => {
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);

  // Compute Active Upgrade Progress Bar
  // There are 3 upgradeable roles, and each can go from primitive (level 1) up to gold (level 4).
  // Total upgrades = 9 maximum levels (3 roles * 3 upgrades each).
  const calculateUpgradeProgress = (): number => {
    let upgradeLevels = 0;
    const roles: ('farmer' | 'lumberjack' | 'miner')[] = ['farmer', 'lumberjack', 'miner'];
    
    roles.forEach(role => {
      const currentTier = engine.toolTiers[role];
      if (currentTier === 'iron') upgradeLevels += 1;
      if (currentTier === 'silver') upgradeLevels += 2;
      if (currentTier === 'gold') upgradeLevels += 3;
    });

    return (upgradeLevels / 9) * 100;
  };

  // List of inventory items with keys and labels
  const inventorySlots = [
    { key: 'wood', label: 'Raw Wood', icon: '🪵', isFood: false },
    { key: 'stone', label: 'Cobblestone', icon: '🪨', isFood: false },
    { key: 'iron_ore', label: 'Iron Ore', icon: '🧲', isFood: false },
    { key: 'silver_ore', label: 'Silver Ore', icon: '🪙', isFood: false },
    { key: 'gold_ore', label: 'Gold Ore', icon: '✨', isFood: false },
    { key: 'potato', label: 'Potato', icon: '🥔', isFood: true },
    { key: 'tomato', label: 'Tomato', icon: '🍅', isFood: true },
    { key: 'onion', label: 'Onion', icon: '🧅', isFood: true },
    { key: 'chili', label: 'Hot Chili', icon: '🌶️', isFood: true },
    { key: 'eggplant', label: 'Eggplant', icon: '🍆', isFood: true },
  ];

  const handleFeedCrops = (cropKey: string) => {
    const amount = engine.inventory[cropKey as keyof Inventory] || 0;
    if (amount > 0) {
      // Consume item!
      (engine.inventory[cropKey as keyof Inventory] as number)--;
      
      // Feed boosts heart energy/morale points
      setMorale(prev => Math.min(100, prev + 25));
      setSpeedBoostActive(true);

      // Trigger speed increases across all active NPCs!
      engine.npcs.forEach(n => {
        n.moveSpeed = 0.075; // speed up from normal 0.05
      });

      // Spawn notifications
      engine.npcs.forEach(n => {
        engine.addFloatingText(n.x, n.y - 0.4, 'Yum! Full Vigor ⚡', '#fbbf24');
      });

      // Clear speed boost timer in 10 seconds of game play
      setTimeout(() => {
        engine.npcs.forEach(n => {
          n.moveSpeed = 0.05; // restore normal
        });
        setSpeedBoostActive(false);
      }, 10000);

      onUpdate();
    }
  };

  return (
    <div id="hud_root_panel" className="w-full flex flex-col gap-4 bg-[#3d2b1f] border-4 border-[#251a12] p-4 rounded-2xl select-none text-[#e0ccb3]">
      
      {/* Top Indicators Bar */}
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 border-b-2 border-[#251a12] pb-3">
        {/* Row 1: Gold & Colony Morale */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Gold Coin Count */}
          <div className="flex items-center gap-2 bg-[#5d4037] border-2 border-[#8d6e63] px-3.5 py-1.5 rounded-xl text-yellow-300 font-mono text-sm shadow-inner">
            <Coins className="w-5 h-5 text-yellow-400 animate-pulse" />
            <span className="font-bold">{engine.inventory.gold}</span>
            <span className="text-[10px] text-[#e0ccb3] font-semibold uppercase">Gold</span>
          </div>

          {/* Heart / Morale Stats with active Vigor indicator */}
          <div className="flex items-center gap-2 bg-[#5d4037] border-2 border-[#8d6e63] px-3.5 py-1.5 rounded-xl shadow-inner">
            <Heart className={`w-5 h-5 text-red-500 ${speedBoostActive ? 'animate-bounce' : ''}`} fill="currentColor" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-red-300 text-xs font-semibold">
                <span>Vigor: {morale}%</span>
                {speedBoostActive && (
                  <span className="text-[9px] bg-yellow-400 text-[#3d2b1f] px-1 py-0.2 rounded font-extrabold tracking-wide uppercase animate-pulse">
                    ⚡ BOOST
                  </span>
                )}
              </div>
              {/* Vigor micro indicator bar */}
              <div className="w-24 h-1.5 bg-[#3d2b1f] rounded-full mt-0.5 overflow-hidden border border-[#251a12]">
                <div 
                  className={`h-full transition-all ${speedBoostActive ? 'bg-yellow-450' : 'bg-red-500'}`}
                  style={{ width: `${morale}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Progress Bar */}
        <div className="flex items-center gap-3 w-full md:w-auto max-w-sm flex-1">
          <div className="p-1 px-2.5 bg-[#5d4037] border-2 border-[#8d6e63] rounded-xl flex items-center gap-2 w-full">
            <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-[#e0ccb3]">
                <span>FORGE TECHNOLOGY</span>
                <span className="font-bold text-emerald-300">{Math.floor(calculateUpgradeProgress())}%</span>
              </div>
              <div className="w-full h-2 bg-[#3d2b1f] rounded-full mt-0.5 overflow-hidden border border-[#251a12]">
                <div 
                  className="h-full bg-gradient-to-r from-[#4a773c] to-[#2d5a27] rounded-full transition-all duration-500"
                  style={{ width: `${calculateUpgradeProgress()}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Inventory Slot Grid Panel */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-[#e0ccb3]">
          <span className="flex items-center gap-1">
            <PackageCheck className="w-4 h-4 text-[#e0ccb3]" />
            <span>Colony Warehouse Inventory</span>
          </span>
          <span className="text-[10px] text-[#e0ccb3]/70 font-mono">CLICK ITEMS TO USE OR CONSUME</span>
        </div>

        {/* Inventory grids layout */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {inventorySlots.map(slot => {
            const count = engine.inventory[slot.key as keyof Inventory] || 0;
            const isSelected = selectedInventoryItem === slot.key;

            return (
              <button
                key={slot.key}
                onClick={() => setSelectedInventoryItem(isSelected ? null : slot.key)}
                className={`cursor-pointer group flex flex-col justify-center items-center p-2.5 rounded-xl border-2 transition-all ${
                  isSelected 
                    ? 'bg-[#3e2b22] border-white ring-4 ring-[#8d6e63]' 
                    : count > 0 
                      ? 'bg-[#8d6e63] hover:bg-[#a1887f] border-[#3e2b22]' 
                      : 'bg-[#8d6e63]/30 border-[#3e2b22]/30 opacity-40 hover:opacity-50'
                }`}
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{slot.icon}</span>
                <span className={`text-[10px] font-mono font-bold mt-1 ${count > 0 ? 'text-yellow-200' : 'text-[#3e2b22]/50'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Click details expanded block */}
        {selectedInventoryItem && (
          <div className="mt-2.5 bg-[#3e2b22] border-2 border-[#8d6e63] p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none animate-fadeIn">
            {(() => {
              const currentSlot = inventorySlots.find(s => s.key === selectedInventoryItem)!;
              const count = engine.inventory[currentSlot.key as keyof Inventory] || 0;

              return (
                <>
                  <div className="flex gap-2.5 items-center">
                    <span className="text-2xl">{currentSlot.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-yellow-105">{currentSlot.label} Resource</h4>
                      <p className="text-[10px] text-[#e0ccb3]/85 leading-tight">
                        {currentSlot.isFood 
                          ? 'This is an organic harvested crop. Eat it to boost colony vigor +25% and increase walking movement speeds for 10 seconds!'
                          : 'Material collected by woodcutters or excavators. Use at the Tool Forge to build basat iron, silver, or gleaming golden tools.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 ml-auto sm:ml-0">
                    {currentSlot.isFood ? (
                      <button
                        onClick={() => handleFeedCrops(currentSlot.key)}
                        className={`cursor-pointer px-3.5 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 border-2 ${
                          count > 0 
                            ? 'bg-[#795548] border-[#251a12] text-amber-100 hover:bg-[#8d6e63]' 
                            : 'bg-[#3d2b1f] border-[#251a12]/55 text-[#e0ccb3]/50 cursor-not-allowed'
                        }`}
                        disabled={count <= 0}
                      >
                        <Zap className="w-3.5 h-3.5 text-yellow-405" /> Eat Crop (+25% Vigor)
                      </button>
                    ) : (
                      <div className="text-[10px] text-[#e0ccb3]/80 italic bg-[#3d2b1f] p-2 rounded border-2 border-[#251a12]">
                        Deliver to town shop for forge upgrades.
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

    </div>
  );
};
