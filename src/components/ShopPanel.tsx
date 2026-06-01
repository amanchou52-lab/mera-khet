/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameEngine } from '../utils/gameEngine';
import { CROPS, TIER_BENEFITS } from '../data';
import { NPCRole, ToolTier, CropType } from '../types';
import { ShoppingBag, Star, Zap, UserPlus, Coins, ShieldCheck, ArrowRight, Hammer } from 'lucide-react';

interface ShopPanelProps {
  engine: GameEngine;
  onUpdate: () => void;
}

export const ShopPanel: React.FC<ShopPanelProps> = ({ engine, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'seeds' | 'tools' | 'hire' | 'sell'>('seeds');

  // Exponential cost modifiers formulation
  const getToolCost = (role: NPCRole, aspect: 'gold' | 'wood' | 'stone') => {
    const currentTier = engine.toolTiers[role];
    let level = 1;
    if (currentTier === 'iron') level = 2;
    if (currentTier === 'silver') level = 3;
    if (currentTier === 'gold') level = 4;

    const baseCostMap = {
      gold: { farmer: 80, lumberjack: 100, miner: 120 },
      wood: { farmer: 5, lumberjack: 10, miner: 8 },
      stone: { farmer: 5, lumberjack: 6, miner: 12 },
    };

    const multiplier = 2.0; // compounding exponential modifier
    const base = baseCostMap[aspect][role];
    
    // returns compounding cost
    return Math.floor(base * Math.pow(multiplier, level - 1));
  };

  const getNextToolTier = (current: ToolTier): ToolTier | null => {
    if (current === 'primitive') return 'iron';
    if (current === 'iron') return 'silver';
    if (current === 'silver') return 'gold';
    return null; // Max level reached
  };

  const handleUpgradeTool = (role: NPCRole) => {
    const currentTier = engine.toolTiers[role];
    const nextTier = getNextToolTier(currentTier);
    if (!nextTier) return;

    const goldCost = getToolCost(role, 'gold');
    const woodCost = getToolCost(role, 'wood');
    const stoneCost = getToolCost(role, 'stone');

    // Cost validations
    if (engine.inventory.gold >= goldCost && engine.inventory.wood >= woodCost && engine.inventory.stone >= stoneCost) {
      engine.inventory.gold -= goldCost;
      engine.inventory.wood -= woodCost;
      engine.inventory.stone -= stoneCost;

      // Apply Upgrade
      engine.toolTiers[role] = nextTier;
      
      // Floating alert in shop area (16, 3)
      engine.addFloatingText(16, 4, `Upgraded ${role.toUpperCase()} tool to ${nextTier.toUpperCase()}! ✨`, '#fbbf24');
      
      onUpdate();
    } else {
      engine.addFloatingText(16, 4, 'Insufficient resources!', '#ef4444');
    }
  };

  // Farmer / lumberjack / miner worker hiring tracker
  const getNPCCount = (role: NPCRole) => {
    return engine.npcs.filter(n => n.role === role).length;
  };

  const getHireCosts = (role: NPCRole) => {
    const count = getNPCCount(role);
    // Exponential formula: 
    // Gold base = 120, multiplier = 1.6
    // Wood base = 15, multiplier = 1.5
    // Stone base = 10, multiplier = 1.5
    const baseGold = 120;
    const baseWood = 15;
    const baseStone = 10;
    
    return {
      gold: Math.floor(baseGold * Math.pow(1.6, count - 1)),
      wood: Math.floor(baseWood * Math.pow(1.5, count - 1)),
      stone: Math.floor(baseStone * Math.pow(1.5, count - 1)),
    };
  };

  const handleHireNPC = (role: NPCRole) => {
    const costs = getHireCosts(role);
    if (
      engine.inventory.gold >= costs.gold &&
      engine.inventory.wood >= costs.wood &&
      engine.inventory.stone >= costs.stone
    ) {
      engine.inventory.gold -= costs.gold;
      engine.inventory.wood -= costs.wood;
      engine.inventory.stone -= costs.stone;
      
      // spawn!
      engine.spawnNPC(role);
      onUpdate();
    } else {
      engine.addFloatingText(16, 4.3, 'Need more gold/wood/stone!', '#ef4444');
    }
  };

  // Buy seed packages
  const handleBuySeed = (cropName: CropType) => {
    const cropInfo = CROPS[cropName];
    if (engine.inventory.gold >= cropInfo.seedCost) {
      engine.inventory.gold -= cropInfo.seedCost;
      
      // increment corresponding seed inventory
      const seedKey = `${cropName}Seed`;
      (engine.inventory[seedKey as keyof typeof engine.inventory] as number)++;
      
      engine.addFloatingText(16, 4, `Bought ${cropInfo.name} Seed! 🌱`, '#4ade80');
      onUpdate();
    } else {
      engine.addFloatingText(16, 4, 'Need more Gold! 💰', '#ef4444');
    }
  };

  // Sell Raw Excess materials (Emergency backup)
  const handleSellRaw = (resource: 'wood' | 'stone', value: number) => {
    const amount = engine.inventory[resource];
    if (amount > 0) {
      engine.inventory[resource]--;
      engine.inventory.gold += value;
      engine.addFloatingText(16, 4.5, `+${value}g Gold! 🪙`, '#eab308');
      onUpdate();
    }
  };

  return (
    <div id="shop_panel_root" className="w-full bg-[#3d2b1f] border-4 border-[#251a12] rounded-3xl flex flex-col overflow-hidden shadow-lg">
      {/* Wooden-styled shop title bar */}
      <div className="bg-[#251a12] px-5 py-4 border-b-2 border-[#251a12] flex items-center justify-between select-none shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#5d4037] rounded-lg border-2 border-[#8d6e63] text-yellow-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-amber-50 font-sans">Town Mercat & Forge</h2>
            <p className="text-[11px] text-yellow-400/80 font-mono">TINY SETTLEMENT ECONOMIC ENGINE</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-[#5d4037] border-2 border-[#8d6e63] px-3 py-1 rounded-full font-mono text-xs text-yellow-300 shadow-md">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span>{engine.inventory.gold} Gold</span>
        </div>
      </div>

      {/* Action Sections Tabs */}
      <div className="flex border-b-2 border-[#251a12] select-none text-xs bg-[#251a12]">
        <button
          onClick={() => setActiveTab('seeds')}
          className={`flex-1 py-3 text-center font-bold cursor-pointer transition-all border-b-4 flex justify-center items-center gap-1.5 ${
            activeTab === 'seeds'
              ? 'text-white border-[#4a773c] bg-[#4a773c]/30'
              : 'text-[#e0ccb3] border-transparent hover:text-white hover:bg-[#5d4037]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Seeds Market
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 py-3 text-center font-bold cursor-pointer transition-all border-b-4 flex justify-center items-center gap-1.5 ${
            activeTab === 'tools'
              ? 'text-white border-yellow-500 bg-[#795548]/30'
              : 'text-[#e0ccb3] border-transparent hover:text-white hover:bg-[#5d4037]'
          }`}
        >
          <Hammer className="w-3.5 h-3.5" /> Tool Forge
        </button>
        <button
          onClick={() => setActiveTab('hire')}
          className={`flex-1 py-3 text-center font-bold cursor-pointer transition-all border-b-4 flex justify-center items-center gap-1.5 ${
            activeTab === 'hire'
              ? 'text-white border-purple-500 bg-purple-905/20'
              : 'text-[#e0ccb3] border-transparent hover:text-white hover:bg-[#5d4037]'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> Hire Laborers
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-3 text-center font-bold cursor-pointer transition-all border-b-4 flex justify-center items-center gap-1.5 ${
            activeTab === 'sell'
              ? 'text-white border-amber-500 bg-amber-900/20'
              : 'text-[#e0ccb3] border-transparent hover:text-white hover:bg-[#5d4037]'
          }`}
        >
          <Coins className="w-3.5 h-3.5" /> Sell Raw
        </button>
      </div>

      {/* Tabs Dynamic Content panels */}
      <div className="p-4 md:p-5 flex-1 min-h-[280px]">
        
        {/* TAB 1: SEEDS MARKET */}
        {activeTab === 'seeds' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-[#e0ccb3] bg-[#5d4037] p-3 rounded-lg border-2 border-[#251a12] flex justify-between select-none shadow-inner">
              <span>Seeds can be planted by your Farmers in empty Soil plots. Crops will mature & be sold automatically for premium gold!</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(CROPS) as CropType[]).map(cropKey => {
                const info = CROPS[cropKey];
                const count = engine.inventory[`${cropKey}Seed` as keyof typeof engine.inventory] || 0;
                const canAfford = engine.inventory.gold >= info.seedCost;

                return (
                  <div key={cropKey} className="bg-[#5d4037] border-2 border-[#251a12] p-3 rounded-xl flex items-center justify-between hover:border-[#8d6e63] transition-all select-none shadow-sm">
                    <div className="flex items-center gap-3">
                      {/* Procedural plant mini badge preview */}
                      <div className="w-10 h-10 rounded-lg flex justify-center items-center text-lg bg-[#4a773c] border-2 border-[#251a12] text-amber-50 shadow-sm" style={{ borderLeft: `8px solid ${info.color}` }}>
                        🌱
                      </div>
                      <div>
                        <h3 className="font-semibold text-amber-50 text-xs flex items-center gap-1">
                          {info.name} Seed
                          <span className="text-[10px] text-[#e0ccb3]/75 font-normal">({count} organic owned)</span>
                        </h3>
                        <p className="text-[10px] text-yellow-300 font-mono mt-0.5">
                          Cost: {info.seedCost}g | Sells Yield: {info.sellValue}g
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleBuySeed(cropKey)}
                      className={`cursor-pointer px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border-2 ${
                        canAfford 
                          ? 'bg-[#4a773c] border-[#251a12] text-amber-50 hover:bg-[#5f974d] shadow-md' 
                          : 'bg-[#3d2b1f] border-[#251a12]/55 text-[#e0ccb3]/40 cursor-not-allowed'
                      }`}
                      disabled={!canAfford}
                    >
                      Buy 1 🌱
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: TOOL FORGE UPGRADES (COMPOUNDING FORMULAIC ESCALATION) */}
        {activeTab === 'tools' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-[#e0ccb3] bg-[#5d4037] border-2 border-[#251a12] p-3.5 rounded-lg font-sans select-none shadow-inner">
              <span className="text-yellow-405 font-bold block mb-0.5">🚀 THE COMPOUNDING TOOL ADVANCEMENT ENGINE</span>
              Upgrading tool blocks drastically divides action frames! For every single tier upgrade, the speed rating scales exponentially. Price scales exponentially using resources (Wood, Stone & Golden Coins).
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {(['farmer', 'lumberjack', 'miner'] as NPCRole[]).map(role => {
                const current = engine.toolTiers[role];
                const next = getNextToolTier(current);
                const currentMultiplier = TIER_BENEFITS[current].multiplier;

                const goldCost = getToolCost(role, 'gold');
                const woodCost = getToolCost(role, 'wood');
                const stoneCost = getToolCost(role, 'stone');

                const canAfford = engine.inventory.gold >= goldCost && 
                                  engine.inventory.wood >= woodCost && 
                                  engine.inventory.stone >= stoneCost;

                return (
                  <div key={role} className="bg-[#5d4037] border-2 border-[#251a12] p-3.5 rounded-xl hover:border-[#8d6e63] transition-all shadow-sm">
                    <div className="flex flex-wrap justify-between items-center gap-2 select-none mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs uppercase tracking-wider font-extrabold text-yellow-300 font-mono">
                            {role === 'farmer' ? '🌾 Farmer Hoe' : role === 'lumberjack' ? '🪵 Logger Axe' : '⛏️ Ore Pickaxe'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#e0ccb3] mt-0.5 flex items-center gap-1.5">
                          Grade: <span className="text-yellow-400 font-bold capitalize font-mono text-xs">{current}</span> 
                          <span className="text-[#e0ccb3]/75">({currentMultiplier}x action speed)</span>
                        </p>
                      </div>

                      {next ? (
                        <div className="flex items-center gap-1 bg-[#3d2b1f] px-2 py-1 rounded border-2 border-[#251a12] text-[11px] text-yellow-300 font-mono shadow-inner">
                          Next Stage: <span className="capitalize font-bold">{next}</span> ({TIER_BENEFITS[next].multiplier}y speed)
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-450 px-2.5 py-1 rounded-full border border-yellow-500/20 text-[10px] font-mono font-bold uppercase">
                          👑 MAXIMUM LEVEL
                        </div>
                      )}
                    </div>

                    {next ? (
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-[#3d2b1f]">
                        {/* Cost list elements */}
                        <div className="flex items-center gap-3.5 select-none text-[11px] text-[#e0ccb3]">
                          <span className="text-[10px] text-[#e0ccb3]/70 uppercase font-bold tracking-wide">REQUIRED:</span>
                          <span className={`font-mono flex items-center gap-1 ${engine.inventory.gold >= goldCost ? 'text-yellow-400 font-bold' : 'text-[#e0ccb3]/30'}`}>
                            💰 {goldCost}g
                          </span>
                          <span className={`font-mono flex items-center gap-1 ${engine.inventory.wood >= woodCost ? 'text-amber-350 font-bold' : 'text-[#e0ccb3]/30'}`}>
                            🪵 {woodCost}
                          </span>
                          <span className={`font-mono flex items-center gap-1 ${engine.inventory.stone >= stoneCost ? 'text-white font-bold' : 'text-[#e0ccb3]/30'}`}>
                            🪨 {stoneCost}
                          </span>
                        </div>

                        <button
                          onClick={() => handleUpgradeTool(role)}
                          className={`cursor-pointer px-4 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border-2 mt-1 md:mt-0 ${
                            canAfford 
                              ? 'bg-[#795548] border-[#251a12] text-amber-50 hover:bg-[#8d6e63] hover:scale-[1.02] shadow-md' 
                              : 'bg-[#3d2b1f] border-[#251a12]/55 text-[#e0ccb3]/40 cursor-not-allowed'
                          }`}
                          disabled={!canAfford}
                        >
                          <Zap className="w-3.5 h-3.5 text-yellow-405" /> Forge Upgrade
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#3d2b1f] p-2 rounded border-2 border-[#251a12] text-[11px] text-[#e0ccb3]/60 text-center font-mono shadow-inner">
                        This tool tier is currently executing at absolute optimal efficiency level.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HIRE LABORERS */}
        {activeTab === 'hire' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-[#e0ccb3] bg-[#5d4037] p-3 rounded-lg border-2 border-[#251a12] flex justify-between select-none shadow-inner">
              <span>Recruit more specialized pioneers. They will settle in your colony and automatically seek local jobs to compound raw gains.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['farmer', 'lumberjack', 'miner'] as NPCRole[]).map(role => {
                const count = getNPCCount(role);
                const costs = getHireCosts(role);
                const canAfford = 
                  engine.inventory.gold >= costs.gold &&
                  engine.inventory.wood >= costs.wood &&
                  engine.inventory.stone >= costs.stone;

                return (
                  <div key={role} className="bg-[#5d4037] border-2 border-[#251a12] p-4 rounded-xl flex flex-col justify-between items-center text-center hover:border-[#8d6e63] transition-all select-none shadow-sm">
                    <div>
                      <div className="text-2xl mb-1.5">
                        {role === 'farmer' ? '🚜' : role === 'lumberjack' ? '🪓' : '👷'}
                      </div>
                      <h3 className="font-extrabold capitalize text-amber-50 text-xs">
                        {role} Pioneer
                      </h3>
                      <p className="text-[10px] text-[#e0ccb3]/80 font-medium font-mono mt-0.5">
                        Colony Strength: {count} active
                      </p>
                    </div>

                    <div className="w-full mt-4 flex flex-col gap-2">
                      <div className="flex flex-col gap-1 items-center justify-center text-[10px] bg-[#3d2b1f] p-2 rounded-lg border border-[#251a12] mb-1">
                        <span className="text-[9px] text-[#e0ccb3]/60 font-bold uppercase tracking-wider">Lodging Cost:</span>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <span className={`font-mono font-bold ${engine.inventory.gold >= costs.gold ? 'text-yellow-300' : 'text-[#e0ccb3]/30'}`}>
                            💰 {costs.gold}g
                          </span>
                          <span className={`font-mono font-bold ${engine.inventory.wood >= costs.wood ? 'text-amber-350' : 'text-[#e0ccb3]/30'}`}>
                            🪵 {costs.wood}
                          </span>
                          <span className={`font-mono font-bold ${engine.inventory.stone >= costs.stone ? 'text-white' : 'text-[#e0ccb3]/30'}`}>
                            🪨 {costs.stone}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleHireNPC(role)}
                        className={`cursor-pointer px-3 py-1.5 w-full rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 border-2 ${
                          canAfford 
                            ? 'bg-purple-900 border-[#251a12] text-amber-50 hover:bg-purple-855 shadow-md' 
                            : 'bg-[#3d2b1f] border-[#251a12]/55 text-[#e0ccb3]/40 cursor-not-allowed'
                        }`}
                        disabled={!canAfford}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-purple-200" /> Hire!
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: SELL RAW MATERIALS */}
        {activeTab === 'sell' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-[#e0ccb3] bg-[#5d4037] p-3 rounded-lg border-2 border-[#251a12] select-none shadow-inner">
              <span>If you are short on Gold coins to purchase seed packages or hire more workforce, sell raw gathered materials instantly to the merchant.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 select-none">
              <div className="bg-[#5d4037] border-2 border-[#251a12] p-4 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🪵</span>
                  <div>
                    <h4 className="font-bold text-amber-50 text-xs">Raw Fir Wood</h4>
                    <p className="text-[10px] text-[#e0ccb3]/85 font-mono mt-0.5">Owned: {engine.inventory.wood} | Sells: 4g each</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSellRaw('wood', 4)}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg font-bold text-xs transition-all border-2 ${
                    engine.inventory.wood > 0
                      ? 'bg-[#795548] border-[#251a12] text-amber-50 hover:bg-[#8d6e63]'
                      : 'bg-[#3d2b1f] border-[#251a12]/55 text-[#e0ccb3]/40'
                  }`}
                  disabled={engine.inventory.wood <= 0}
                >
                  Sell 1 🪵
                </button>
              </div>

              <div className="bg-[#5d4037] border-2 border-[#251a12] p-4 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🪨</span>
                  <div>
                    <h4 className="font-bold text-amber-50 text-xs">Cobble Stone</h4>
                    <p className="text-[10px] text-[#e0ccb3]/85 font-mono mt-0.5">Owned: {engine.inventory.stone} | Sells: 4g each</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSellRaw('stone', 4)}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg font-bold text-xs transition-all border-2 ${
                    engine.inventory.stone > 0
                      ? 'bg-[#795548] border-[#251a12] text-amber-50 hover:bg-[#8d6e63]'
                      : 'bg-[#3d2b1f] border-[#251a12]/55 text-[#e0ccb3]/40'
                  }`}
                  disabled={engine.inventory.stone <= 0}
                >
                  Sell 1 🪨
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
