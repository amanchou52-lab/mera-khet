/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Retro Pixel Art Generator for Canvas Drawing
// Generates high-quality pixel-aligned assets as standard HTMLCanvasElement objects 
// so that the main loop can draw them instantly on screen.

export interface PixelAssets {
  getTile: (key: string, frame?: number) => HTMLCanvasElement | null;
  getNPC: (role: string, direction: string, state: string, frame: number, toolTier: string) => HTMLCanvasElement;
  getCrop: (type: string, stage: string) => HTMLCanvasElement;
  getNode: (type: string, amount: number) => HTMLCanvasElement;
  getItem: (type: string) => HTMLCanvasElement;
  isLoaded: boolean;
}

const canvasCache: { [key: string]: HTMLCanvasElement } = {};

// Helper to create an offscreen canvas
function createOffscreen(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  // Disable image smoothing for nice crispy retro pixel art
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

// Draw a pixel on the canvas using custom grid size
function drawPixel(ctx: CanvasRenderingContext2D, px: number, py: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(px * size, py * size, size, size);
}

// ----------------------------------------------------------------------------
// Procedural Pixel Art Drawing Functions
// ----------------------------------------------------------------------------

function makeGrassTile(): HTMLCanvasElement {
  const size = 32;
  const pixelSize = 2; // 16x16 pixels within 32x32 size
  const { canvas, ctx } = createOffscreen(size, size);

  // Base grass green
  ctx.fillStyle = '#adc1a3'; // Soft tranquil forest sage-green
  ctx.fillRect(0, 0, size, size);

  // Subtle grass details (darker green spots and flowers)
  const pxGrid = size / pixelSize;
  for (let x = 0; x < pxGrid; x++) {
    for (let y = 0; y < pxGrid; y++) {
      // Noise
      const n = Math.sin(x * 12.3 + y * 45.6);
      if (n > 0.85) {
        // Dark green blade of grass
        drawPixel(ctx, x, y, pixelSize, '#6e8960');
      } else if (n > 0.75 && n <= 0.85) {
        // Tiny yellow flower dot
        drawPixel(ctx, x, y, pixelSize, '#ebd197');
      } else if (n < -0.85) {
        // Deep grass shadows
        drawPixel(ctx, x, y, pixelSize, '#4f6345');
      }
    }
  }

  // Draw border outline slightly of grass tiles for grids (very light green)
  ctx.strokeStyle = 'rgba(110, 137, 96, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, size, size);

  return canvas;
}

function makeWaterTile(frame: number): HTMLCanvasElement {
  const size = 32;
  const pixelSize = 2;
  const { canvas, ctx } = createOffscreen(size, size);

  // Deep water blue
  ctx.fillStyle = '#527075'; // Slate teal water tone
  ctx.fillRect(0, 0, size, size);

  // Waves that animate depending on the frame (0 to 3)
  const waveColor = '#628287'; 
  const foamColor = '#8caeb3'; 
  const yOffset = (frame * 4) % 16;

  // Simple wave lines
  for (let y = 4; y < 32; y += 12) {
    const waveY = (y + yOffset) % 32;
    ctx.fillStyle = waveColor;
    ctx.fillRect(0, waveY, size, 2);
    ctx.fillStyle = foamColor;
    ctx.fillRect(8, waveY, 4, 1);
    ctx.fillRect(20, waveY, 6, 1);
  }

  // Border reflection of light
  ctx.fillStyle = 'rgba(140, 174, 179, 0.15)';
  ctx.fillRect(0, 0, size, 1);

  return canvas;
}

function makeShallowWaterTile(): HTMLCanvasElement {
  const size = 32;
  const { canvas, ctx } = createOffscreen(size, size);

  ctx.fillStyle = '#6a8f94'; // Shallow bay teal
  ctx.fillRect(0, 0, size, size);

  // Sand grains/wave details
  for (let i = 0; i < 8; i++) {
    const rx = Math.floor(Math.sin(i * 153.21) * 16) + 16;
    const ry = Math.floor(Math.cos(i * 411.5) * 16) + 16;
    ctx.fillStyle = '#8abcc2'; 
    ctx.fillRect(rx, ry, 3, 2);
  }

  return canvas;
}

function makeDirtTile(watered: boolean): HTMLCanvasElement {
  const size = 32;
  const pixelSize = 2;
  const { canvas, ctx } = createOffscreen(size, size);

  // Dirt brown base
  ctx.fillStyle = watered ? '#4d3725' : '#8c6b53'; // Cozy chocolate-brown mud watered vs natural cocoa tilled land
  ctx.fillRect(0, 0, size, size);

  const pxGrid = size / pixelSize;
  const spotColor = watered ? '#6e503b' : '#baa593';

  // Mud chunks / dry earth grains
  for (let x = 1; x < pxGrid - 1; x++) {
    for (let y = 1; y < pxGrid - 1; y++) {
      const n = Math.sin(x * 55.4 + y * 99.1);
      if (n > 0.8) {
        drawPixel(ctx, x, y, pixelSize, spotColor);
      } else if (n < -0.8 && !watered) {
        drawPixel(ctx, x, y, pixelSize, '#302014'); // crack lines
      }
    }
  }

  // Draw cute rough tilled border
  ctx.strokeStyle = watered ? '#1e140d' : '#413023';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  return canvas;
}

function makePathTile(): HTMLCanvasElement {
  const size = 32;
  const { canvas, ctx } = createOffscreen(size, size);

  // base grout dark grey
  ctx.fillStyle = '#374151'; // gray-700
  ctx.fillRect(0, 0, size, size);

  // Cobblestone tiles within the tile
  const stones = [
    { x: 1, y: 1, w: 13, h: 13, c: '#9ca3af' }, // light
    { x: 16, y: 1, w: 15, h: 13, c: '#6b7280' }, // medium
    { x: 1, y: 16, w: 13, h: 15, c: '#6b7280' }, // medium
    { x: 16, y: 16, w: 15, h: 15, c: '#4b5563' }, // dark grey
  ];

  stones.forEach(s => {
    ctx.fillStyle = s.c;
    ctx.fillRect(s.x, s.y, s.w, s.h);

    // Stone highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(s.x, s.y, s.w, 2);
    ctx.fillRect(s.x, s.y, 2, s.h);

    // Stone shadows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(s.x, s.y + s.h - 2, s.w, 2);
    ctx.fillRect(s.x + s.w - 2, s.y, 2, s.h);
  });

  return canvas;
}

function makeFenceTile(): HTMLCanvasElement {
  const size = 32;
  const { canvas, ctx } = createOffscreen(size, size);

  // Fence tile has a transparent background, but grass draws under it.
  // We will generate the fence alone with alpha.
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);

  // Post wood dark
  const woodColor = '#78350f'; // amber-900
  const woodHighlight = '#b45309'; // amber-700

  // Draw 2 posts
  ctx.fillStyle = woodColor;
  ctx.fillRect(4, 2, 6, 28);
  ctx.fillRect(22, 2, 6, 28);

  // Draw 2 rails
  ctx.fillRect(0, 8, 32, 4);
  ctx.fillRect(0, 20, 32, 4);

  // Highlights
  ctx.fillStyle = woodHighlight;
  ctx.fillRect(4, 2, 2, 28);
  ctx.fillRect(22, 2, 2, 28);
  ctx.fillRect(0, 8, 32, 1);
  ctx.fillRect(0, 20, 32, 1);

  // Shadows
  ctx.fillStyle = '#451a03';
  ctx.fillRect(8, 2, 2, 28);
  ctx.fillRect(26, 2, 2, 28);
  ctx.fillRect(0, 11, 32, 1);
  ctx.fillRect(0, 23, 32, 1);

  return canvas;
}

function makeMainHouseSprite(): HTMLCanvasElement {
  // House is big: 96x96 (3x3 grid tiles equivalent)
  const { canvas, ctx } = createOffscreen(96, 96);

  // Red brick tiled roof
  ctx.fillStyle = '#b91c1c'; // red-700
  // Render a lovely triangular roof with pixelated steps
  for (let r = 0; r < 24; r++) {
    const rx = r * 2;
    const rw = 96 - rx * 2;
    const ry = 6 + r * 1.5;
    ctx.fillRect(rx, ry, rw, 2);
    ctx.fillStyle = r % 2 === 0 ? '#dc2626' : '#991b1b'; // tiles variation
    ctx.fillRect(rx + 2, ry, rw - 4, 1.5);
  }

  // Stone Wall base (grey tiles)
  ctx.fillStyle = '#d1d5db'; // gray-300
  ctx.fillRect(10, 42, 76, 50);

  // Bricks lines and details
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(10, 42, 76, 3);
  for (let y = 48; y < 90; y += 10) {
    ctx.fillRect(10, y, 76, 2);
  }

  // Door (Wood)
  ctx.fillStyle = '#78350f'; // amber-900
  ctx.fillRect(38, 62, 20, 30);
  ctx.fillStyle = '#b45309'; // highlights
  ctx.fillRect(40, 64, 4, 28);
  // Gold doorknob
  ctx.fillStyle = '#eab308';
  ctx.fillRect(52, 76, 3, 3);

  // Windows glass blue-cyan with white cross
  const drawWindow = (wx: number, wy: number) => {
    ctx.fillStyle = '#1e3a8a'; // glass shadow
    ctx.fillRect(wx, wy, 14, 14);
    ctx.fillStyle = '#06b6d4'; // bright blue
    ctx.fillRect(wx + 1, wy + 1, 12, 12);
    ctx.fillStyle = '#ffffff'; // white glow
    ctx.fillRect(wx + 1, wy + 6, 12, 2);
    ctx.fillRect(wx + 6, wy + 1, 2, 12);
    ctx.fillStyle = '#4b5563'; // window frame
    ctx.strokeRect(wx, wy, 14, 14);
  };

  drawWindow(18, 52);
  drawWindow(64, 52);

  // Chimney
  ctx.fillStyle = '#4b5563'; // stone
  ctx.fillRect(72, 12, 12, 30);
  ctx.fillStyle = '#1f2937'; // pipe
  ctx.fillRect(70, 10, 16, 4);

  return canvas;
}

function makeShopSprite(): HTMLCanvasElement {
  // Shop is 96x96 (3x3 grid tiles)
  const { canvas, ctx } = createOffscreen(96, 96);

  // Stone base walls
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(8, 38, 80, 54);
  ctx.fillStyle = '#4b5563';
  for (let y = 42; y < 90; y += 12) {
    ctx.fillRect(8, y, 80, 2);
  }

  // Large Blue & White Awning (Market Shop vibes)
  const awningY = 24;
  const awningH = 16;
  ctx.fillStyle = '#1e40af'; // base blue
  ctx.fillRect(4, awningY, 88, awningH);

  const stripWidth = 8;
  for (let x = 4; x < 92; x += stripWidth * 2) {
    ctx.fillStyle = '#f8fafc'; // white sheets
    ctx.fillRect(x, awningY, stripWidth, awningH);
  }

  // Scalloped bottom of the canopy
  for (let x = 4; x < 92; x += 4) {
    ctx.fillStyle = (x % 8 === 0) ? '#f8fafc' : '#1e40af';
    ctx.beginPath();
    ctx.arc(x + 2, awningY + awningH, 3, 0, Math.PI);
    ctx.fill();
  }

  // Shop door
  ctx.fillStyle = '#78350f';
  ctx.fillRect(20, 60, 16, 32);
  ctx.fillStyle = '#eab308'; // bell
  ctx.fillRect(26, 54, 4, 5);

  // Counter board display
  ctx.fillStyle = '#d97706'; // amber Counter shelf
  ctx.fillRect(46, 62, 40, 10);
  // Display items on the shelves
  // Apple red bucket
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(52, 54, 6, 8);
  ctx.fillStyle = '#22c55e'; // green plants pots
  ctx.fillRect(64, 56, 6, 6);
  ctx.fillStyle = '#7c3aed'; // shiny potion bottles
  ctx.fillRect(76, 52, 4, 10);

  // Cute "SHOP" sign
  ctx.fillStyle = '#f59e0b'; // amber board
  ctx.fillRect(32, 6, 32, 14);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 6, 32, 14);

  // Draw the text "SHOP" manually via pixels for style
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 8px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SHOP', 48, 16);

  return canvas;
}

function makeWellSprite(): HTMLCanvasElement {
  // Well is 32x64 (1 wide, 2 tall)
  const { canvas, ctx } = createOffscreen(32, 64);

  // Stone base (bottom half)
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(2, 40, 28, 22);
  ctx.fillStyle = '#4b5563';
  ctx.strokeRect(2, 40, 28, 22);

  // Stone textures
  ctx.fillStyle = '#374151';
  ctx.fillRect(6, 44, 4, 3);
  ctx.fillRect(18, 50, 6, 4);

  // Wooden support beams vertical
  ctx.fillStyle = '#78350f';
  ctx.fillRect(4, 12, 4, 28);
  ctx.fillRect(24, 12, 4, 28);

  // Wooden crank spindle/rope
  ctx.fillStyle = '#d97706';
  ctx.fillRect(8, 18, 16, 4);
  ctx.fillStyle = '#f59e0b'; // Rope wrapped
  ctx.fillRect(13, 17, 6, 6);

  // Well roof awning
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(0, 4, 32, 8);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(2, 2, 28, 4);

  // Hang cute detailed bucket on rope
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(15, 23, 2, 7); // rope down
  ctx.fillStyle = '#d97706'; // bucket brown
  ctx.fillRect(12, 29, 8, 8);
  ctx.fillStyle = '#9ca3af'; // metal handle
  ctx.fillRect(12, 27, 8, 2);

  return canvas;
}

// ----------------------------------------------------------------------------
// Resource Nodes Generatons
// ----------------------------------------------------------------------------

function makeTreeSprite(type: 'oak' | 'pine', hit: boolean): HTMLCanvasElement {
  // Trees are big: 64x96 (tall)
  const { canvas, ctx } = createOffscreen(64, 96);

  const trunkColor = '#78350f';
  const leafColor1 = type === 'oak' ? '#15803d' : '#064e3b'; // light green vs deep teal pine
  const leafColor2 = type === 'oak' ? '#22c55e' : '#0f766e'; 
  const leafColor3 = type === 'oak' ? '#166534' : '#042f2e'; 

  // Shake offset if hit
  const ox = hit ? Math.sin(Date.now() / 30) * 3 : 0;

  // 1. Draw Trunk
  ctx.fillStyle = trunkColor;
  ctx.fillRect(26 + ox, 50, 12, 44);
  // Trunk outlines & detail
  ctx.fillStyle = '#451a03';
  ctx.fillRect(26 + ox, 50, 3, 44);
  ctx.fillRect(32 + ox, 62, 2, 12);

  // 2. Leaves layers (top down circles or triangles)
  if (type === 'oak') {
    // Big rounded fluffy layers
    // Layer 3 (deepest)
    ctx.fillStyle = leafColor3;
    ctx.beginPath();
    ctx.arc(32 + ox, 38, 26, 0, Math.PI * 2);
    ctx.fill();

    // Layer 2
    ctx.fillStyle = leafColor1;
    ctx.beginPath();
    ctx.arc(24 + ox, 28, 20, 0, Math.PI * 2);
    ctx.arc(40 + ox, 28, 20, 0, Math.PI * 2);
    ctx.fill();

    // Layer 1 (front highlights)
    ctx.fillStyle = leafColor2;
    ctx.beginPath();
    ctx.arc(32 + ox, 22, 18, 0, Math.PI * 2);
    ctx.fill();

    // Add cute red apple dots / details on tree
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(20 + ox, 24, 3, 3);
    ctx.fillRect(42 + ox, 34, 3, 3);
    ctx.fillRect(30 + ox, 40, 3, 3);
  } else {
    // Pine triangular layers
    const drawPineTriangle = (cx: number, cy: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy - h / 2);
      ctx.lineTo(cx - w / 2 + ox, cy + h / 2);
      ctx.lineTo(cx + w / 2 + ox, cy + h / 2);
      ctx.closePath();
      ctx.fill();
    };

    // Bottom layer
    drawPineTriangle(32, 52, 48, 28, leafColor3);
    // Middle layer
    drawPineTriangle(32, 38, 40, 24, leafColor1);
    // Top layer
    drawPineTriangle(32, 22, 30, 20, leafColor2);

    // Tip glow
    ctx.fillStyle = '#34d399';
    ctx.fillRect(31 + ox, 11, 2, 2);
  }

  // Draw shadows on ground
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(32 + ox, 92, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

function makeRockNode(type: 'stone' | 'iron' | 'silver' | 'gold', animProgress: number): HTMLCanvasElement {
  // Rocks are 32x32
  const { canvas, ctx } = createOffscreen(32, 32);

  const baseColors = {
    stone: '#9ca3af', // grey
    iron: '#a16207',  // rusty ochre dark-metal
    silver: '#cbd5e1', // shiny grey-silver
    gold: '#ca8a04',  // golden yellow
  };

  const veinColors = {
    stone: '#4b5563', // dark grey
    iron: '#ea580c',  // bright orange iron rust
    silver: '#38bdf8', // sparkling sky-blue reflection
    gold: '#facc15',   // radiant neon-gold
  };

  const bg = baseColors[type];
  const vein = veinColors[type];

  // Base rock shape - rugged boulders
  ctx.fillStyle = bg;
  // Let's draw an organic rock shape with pixels
  ctx.beginPath();
  ctx.moveTo(4, 28);
  ctx.lineTo(2, 16);
  ctx.lineTo(8, 6);
  ctx.lineTo(22, 4);
  ctx.lineTo(28, 12);
  ctx.lineTo(30, 28);
  ctx.closePath();
  ctx.fill();

  // Draw some highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.moveTo(8, 6);
  ctx.lineTo(22, 4);
  ctx.lineTo(26, 12);
  ctx.lineTo(16, 14);
  ctx.closePath();
  ctx.fill();

  // Draw deep dark rock shadows on elements
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.moveTo(4, 28);
  ctx.lineTo(16, 22);
  ctx.lineTo(30, 28);
  ctx.closePath();
  ctx.fill();

  // Precious vein sparkles
  ctx.fillStyle = vein;
  ctx.fillRect(8, 14, 4, 3);
  ctx.fillRect(16, 10, 5, 2);
  ctx.fillRect(18, 18, 4, 4);
  ctx.fillRect(10, 20, 3, 2);

  // Extra gleaming pixel for high-valued veins
  if (type === 'gold' || type === 'silver') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 10, 2, 2);
    ctx.fillRect(9, 14, 1, 1);
  }

  // Outline rock
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(4, 28);
  ctx.lineTo(2, 16);
  ctx.lineTo(8, 6);
  ctx.lineTo(22, 4);
  ctx.lineTo(28, 12);
  ctx.lineTo(30, 28);
  ctx.closePath();
  ctx.stroke();

  return canvas;
}

// ----------------------------------------------------------------------------
// Crop rendering (Seed -> Sprout -> Growing -> Mature)
// ----------------------------------------------------------------------------

function makeCropSprite(type: string, stage: string): HTMLCanvasElement {
  const { canvas, ctx } = createOffscreen(32, 32);

  const leafGreen = '#22c55e';
  const stemDark = '#15803d';
  const earthBrown = '#451a03';

  // Seed stage - simple brown dirt pile with tiny seed pod
  if (stage === 'seed') {
    ctx.fillStyle = earthBrown;
    ctx.fillRect(12, 24, 8, 4);
    ctx.fillStyle = '#d97706'; // tiny yellow-seed dot
    ctx.fillRect(15, 22, 2, 2);
  } 
  // Sprout stage - baby light-green plant with 2 small leaves
  else if (stage === 'sprout') {
    ctx.fillStyle = '#4ade80'; // soft green
    ctx.fillRect(15, 20, 2, 6); // shoot
    ctx.fillRect(13, 18, 2, 2); // left leaf
    ctx.fillRect(17, 18, 2, 2); // right leaf
    ctx.fillStyle = earthBrown;
    ctx.fillRect(10, 25, 12, 3);
  } 
  // Growing stage - bushier green leaves
  else if (stage === 'growing') {
    ctx.fillStyle = stemDark;
    ctx.fillRect(14, 14, 4, 12); // main stem
    ctx.fillStyle = leafGreen;
    ctx.fillRect(10, 16, 6, 5); // left leaf group
    ctx.fillRect(16, 14, 7, 5); // right leaf group
    ctx.fillRect(12, 10, 8, 6); // center crown
  } 
  // Mature stage - Big plant revealing the crop color and shape
  else {
    // Background green foliage
    ctx.fillStyle = leafGreen;
    ctx.fillRect(8, 10, 16, 16);
    ctx.fillStyle = stemDark;
    ctx.fillRect(14, 8, 4, 6);

    // Fruit pixel overlays depending on crop type
    if (type === 'potato') {
      // Little brown tubers peaking from dirt
      ctx.fillStyle = '#9a3412'; // rusty potato skin
      ctx.fillRect(10, 22, 6, 5);
      ctx.fillRect(18, 20, 6, 5);
      ctx.fillStyle = '#b45309'; // highlights
      ctx.fillRect(11, 23, 2, 1);
    } else if (type === 'tomato') {
      // Juicy round red tomatoes hanging
      ctx.fillStyle = '#dc2626'; // bright red
      ctx.beginPath();
      ctx.arc(11, 17, 4, 0, Math.PI * 2);
      ctx.arc(21, 19, 4, 0, Math.PI * 2);
      ctx.fill();
      // Green stems
      ctx.fillStyle = '#166534';
      ctx.fillRect(10, 13, 2, 2);
      ctx.fillRect(20, 15, 2, 2);
    } else if (type === 'onion') {
      // Pearly yellow organic root bodies
      ctx.fillStyle = '#f59e0b'; // golden skin
      ctx.fillRect(10, 21, 5, 6);
      ctx.fillStyle = '#fef08a'; // yellow pulp tip
      ctx.fillRect(11, 25, 3, 2);
    } else if (type === 'chili') {
      // Long bright-red dangling hot peppers
      ctx.fillStyle = '#e11d48'; // crimson hot
      ctx.fillRect(10, 16, 3, 8);
      ctx.fillRect(20, 15, 3, 9);
      // tip curves
      ctx.fillStyle = '#be123c';
      ctx.fillRect(11, 24, 1, 2);
      ctx.fillRect(21, 24, 1, 2);
    } else if (type === 'eggplant') {
      // Big purple drop-shapes
      ctx.fillStyle = '#4c1d95'; // deep dark violet
      ctx.fillRect(9, 14, 6, 9);
      ctx.fillRect(18, 15, 6, 9);
      ctx.fillStyle = '#6d28d9'; // lighter violet highlight
      ctx.fillRect(10, 15, 2, 6);
      // Green cap
      ctx.fillStyle = '#15803d';
      ctx.fillRect(9, 12, 6, 2);
      ctx.fillRect(18, 13, 6, 2);
    }
  }

  return canvas;
}

// ----------------------------------------------------------------------------
// Resource Item Icons drawing
// ----------------------------------------------------------------------------

function makeItemIcon(type: string): HTMLCanvasElement {
  const { canvas, ctx } = createOffscreen(24, 24);

  // Clear background
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 24, 24);

  if (type === 'wood') {
    // Beautiful brown textured wood log
    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 6, 20, 12);
    // End spiral rings
    ctx.fillStyle = '#b45309';
    ctx.fillRect(2, 6, 3, 12);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(3, 9, 1, 6);
    // Bark lines
    ctx.fillStyle = '#451a03';
    ctx.fillRect(5, 6, 17, 2);
    ctx.fillRect(5, 16, 17, 2);
    ctx.fillRect(10, 11, 6, 1);
  } else if (type === 'stone') {
    // Smooth gray rock
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.arc(12, 12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.arc(14, 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1f2937';
    ctx.strokeRect(4, 4, 16, 16);
  } else if (type === 'iron_ore') {
    ctx.fillStyle = '#d97706'; // rusty brown lump
    ctx.fillRect(4, 6, 16, 12);
    ctx.fillStyle = '#ea580c'; // bright rusty orange speckles
    ctx.fillRect(6, 8, 4, 4);
    ctx.fillRect(14, 11, 3, 3);
  } else if (type === 'silver_ore') {
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(4, 6, 16, 12);
    ctx.fillStyle = '#38bdf8'; // bright shining silver metal bits
    ctx.fillRect(6, 8, 4, 3);
    ctx.fillRect(14, 10, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 8, 2, 2);
  } else if (type === 'gold_ore') {
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(4, 6, 16, 12);
    ctx.fillStyle = '#facc15'; // bright shining yellow gold specks
    ctx.fillRect(6, 8, 4, 3);
    ctx.fillRect(13, 11, 4, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 7, 2, 2);
  } else if (type === 'potato') {
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(4, 6, 16, 12);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(6, 8, 4, 4);
  } else if (type === 'tomato') {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(12, 12, 8, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#15803d'; // green leaves stem
    ctx.fillRect(10, 2, 4, 4);
  } else if (type === 'onion') {
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(5, 8, 14, 12);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(10, 2, 4, 6); // green stems
  } else if (type === 'chili') {
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(10, 6, 4, 14);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(10, 2, 4, 4);
  } else if (type === 'eggplant') {
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(6, 8, 12, 12);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(9, 3, 6, 5);
  }

  return canvas;
}

// ----------------------------------------------------------------------------
// NPC Sprite Sheet Programmatic Pre-renderer
// ----------------------------------------------------------------------------
// Draws multi-frame characters with roles and visible tools
// frame 0: Idle frame
// frame 1: Walking left foot forward
// frame 2: Walking right foot forward
// frame 3: Tools swinging/watering frame

function drawNPCCharacter(role: string, direction: string, state: string, frame: number, toolTier: string): HTMLCanvasElement {
  // Characters are 32x48 size to give plenty of room for tools and hats
  const { canvas, ctx } = createOffscreen(32, 48);

  // Clothing & skin coloring
  const skin = '#fed7aa'; // light peach
  let pants = '#1e3a8a';  // blue overalls
  let shirt = '#facc15';  // yellow
  let hatColor = '';

  if (role === 'farmer') {
    shirt = '#fbbf24';  // amber shirt
    pants = '#1d4ed8';  // blue denim overalls
    hatColor = '#f59e0b'; // golden straw hat
  } else if (role === 'lumberjack') {
    shirt = '#dc2626';  // Red/black plaid vibes
    pants = '#451a03';  // brown leather pants
    hatColor = '#4b5563'; // cool grey lumberjack cap
  } else if (role === 'miner') {
    shirt = '#4b5563';  // grey miner tank
    pants = '#374151';  // dark dust pants
    hatColor = '#ea580c'; // orange hardhat!
  }

  // Animation values based on frame
  const shakeY = state === 'walking' && frame % 2 === 1 ? -2 : 0;
  const shakeX = state === 'working' ? Math.sin(Date.now() / 20) * 1.5 : 0;

  // Let's draw the body components layer by layer:
  // 1. Shadow beneath characters
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(16 + shakeX, 42, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Legs & Feet walking
  ctx.fillStyle = '#172554'; // dark shoes
  let leftFootY = 38;
  let rightFootY = 38;
  let leftFootX = 11;
  let rightFootX = 21;

  if (state === 'walking') {
    if (frame === 1) {
      leftFootY -= 4;
      leftFootX -= 1;
    } else if (frame === 2) {
      rightFootY -= 4;
      rightFootX += 1;
    }
  }

  // Draw feet
  ctx.fillRect(leftFootX + shakeX, leftFootY + shakeY, 4, 4);
  ctx.fillRect(rightFootX + shakeX, rightFootY + shakeY, 4, 4);

  // 3. Body Torso (shirt and overalls)
  ctx.fillStyle = shirt;
  ctx.fillRect(10 + shakeX, 22 + shakeY, 12, 12);
  ctx.fillStyle = pants; // overalls cover
  ctx.fillRect(10 + shakeX, 28 + shakeY, 12, 10);
  ctx.fillStyle = '#000000'; // overall straps
  ctx.fillRect(11 + shakeX, 22 + shakeY, 2, 6);
  ctx.fillRect(19 + shakeX, 22 + shakeY, 2, 6);

  // 4. Head
  ctx.fillStyle = skin;
  ctx.fillRect(12 + shakeX, 12 + shakeY, 8, 10);

  // Eye and face details based on direction
  ctx.fillStyle = '#000000';
  if (direction === 'down') {
    ctx.fillRect(14 + shakeX, 16 + shakeY, 2, 2);
    ctx.fillRect(18 + shakeX, 16 + shakeY, 2, 2);
    ctx.fillStyle = '#ef4444'; // little pink cheeks
    ctx.fillRect(13 + shakeX, 19 + shakeY, 1, 1);
    ctx.fillRect(20 + shakeX, 19 + shakeY, 1, 1);
  } else if (direction === 'left') {
    ctx.fillRect(13 + shakeX, 16 + shakeY, 2, 2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(12 + shakeX, 19 + shakeY, 1, 1);
  } else if (direction === 'right') {
    ctx.fillRect(19 + shakeX, 16 + shakeY, 2, 2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(21 + shakeX, 19 + shakeY, 1, 1);
  } else if (direction === 'up') {
    // back of head - simple hair
    ctx.fillStyle = '#7c2d12'; // dark brown hair covering
    ctx.fillRect(12 + shakeX, 12 + shakeY, 8, 8);
  }

  // Beard for lumberjack
  if (role === 'lumberjack' && direction !== 'up') {
    ctx.fillStyle = '#7c2d12'; // brown beard bushy
    ctx.fillRect(12 + shakeX, 18 + shakeY, 8, 5);
  }

  // 5. Hat / Cap
  if (hatColor) {
    ctx.fillStyle = hatColor;
    if (role === 'farmer') {
      // Big Straw Hat brim
      ctx.fillRect(8 + shakeX, 11 + shakeY, 16, 3);
      ctx.fillRect(11 + shakeX, 7 + shakeY, 10, 4);
    } else if (role === 'miner') {
      // Hardhat dome shape + headlight shine
      ctx.fillRect(11 + shakeX, 8 + shakeY, 10, 5);
      ctx.fillStyle = '#ffffff'; // light gleam lamp
      ctx.fillRect(15 + shakeX, 9 + shakeY, 2, 2);
    } else {
      // Simple lumberjack flannel cap
      ctx.fillRect(11 + shakeX, 9 + shakeY, 10, 4);
      ctx.fillRect(9 + shakeX, 10 + shakeY, 3, 2); // visor
    }
  }

  // 6. DRAW THE NPC TOOL / ITEMS IN HANDS
  // Tool colors reflecting tiers
  let toolColor = '#9ca3af'; // primitive stone
  let haftColor = '#78350f'; // wood grip
  if (toolTier === 'iron') toolColor = '#4b5563'; // iron dark-grey
  else if (toolTier === 'silver') toolColor = '#e2e8f0'; // bright silver
  else if (toolTier === 'gold') toolColor = '#fbbf24';  // rich golden glint

  const isWorking = state === 'working' || (state === 'idle' && frame === 3);

  // Position tool based on direction and action frame
  if (role === 'farmer') {
    // Farmer holds Hoe or Watering Can
    const canPaintWateringCan = toolTier === 'gold' || toolTier === 'silver';
    if (canPaintWateringCan) {
      // Watering Can
      ctx.fillStyle = toolColor;
      if (isWorking) {
        // Pouring water tilt
        ctx.fillRect(20 + shakeX, 26 + shakeY, 8, 6);
        ctx.fillStyle = '#38bdf8'; // water droplets spraying
        ctx.fillRect(28 + shakeX, 30 + shakeY, 3, 2);
        ctx.fillRect(30 + shakeX, 33 + shakeY, 2, 2);
      } else {
        ctx.fillRect(20 + shakeX, 26 + shakeY, 6, 6);
        ctx.fillStyle = '#4b5563'; // dark handle
        ctx.fillRect(18 + shakeX, 24 + shakeY, 3, 3);
      }
    } else {
      // Simple Hoe tool
      ctx.fillStyle = haftColor;
      // Handle shaft
      if (isWorking) {
        // Swinging down hoe
        ctx.fillRect(4 + shakeX, 28 + shakeY, 10, 3);
        ctx.fillStyle = toolColor;
        ctx.fillRect(3 + shakeX, 26 + shakeY, 3, 7);
      } else {
        // Held upright
        ctx.fillRect(20 + shakeX, 16 + shakeY, 2, 16);
        ctx.fillStyle = toolColor; // hoe head
        ctx.fillRect(19 + shakeX, 14 + shakeY, 5, 3);
      }
    }
  } else if (role === 'lumberjack') {
    // Lumberjack holds AXE
    ctx.fillStyle = haftColor;
    if (isWorking) {
      // Swinging axe horizontally
      ctx.fillRect(20 + shakeX, 26 + shakeY, 10, 2); // handle
      ctx.fillStyle = toolColor; // axe blade head
      ctx.fillRect(28 + shakeX, 22 + shakeY, 4, 8);
    } else {
      // Axe held over shoulder
      ctx.fillRect(20 + shakeX, 14 + shakeY, 2, 16);
      ctx.fillStyle = toolColor;
      ctx.fillRect(18 + shakeX, 12 + shakeY, 6, 4);
    }
  } else if (role === 'miner') {
    // Miner holds Pickaxe
    ctx.fillStyle = haftColor;
    if (isWorking) {
      // Swing pickaxe
      ctx.fillRect(18 + shakeX, 26 + shakeY, 12, 2);
      ctx.fillStyle = toolColor; // double pick beak
      ctx.fillRect(28 + shakeX, 20 + shakeY, 2, 12);
    } else {
      // Pickaxe over shoulder
      ctx.fillRect(20 + shakeX, 14 + shakeY, 2, 18);
      ctx.fillStyle = toolColor;
      ctx.fillRect(15 + shakeX, 12 + shakeY, 12, 3);
    }
  }

  return canvas;
}

// ----------------------------------------------------------------------------
// Asset Loader Initialization
// ----------------------------------------------------------------------------

export function initializeAssets(): PixelAssets {
  // Tile Prebuild templates
  try {
    canvasCache['tile_grass'] = makeGrassTile();
    canvasCache['tile_water_0'] = makeWaterTile(0);
    canvasCache['tile_water_1'] = makeWaterTile(1);
    canvasCache['tile_water_2'] = makeWaterTile(2);
    canvasCache['tile_water_3'] = makeWaterTile(3);
    canvasCache['tile_shallow'] = makeShallowWaterTile();
    canvasCache['tile_dirt_dry'] = makeDirtTile(false);
    canvasCache['tile_dirt_wet'] = makeDirtTile(true);
    canvasCache['tile_path'] = makePathTile();
    canvasCache['tile_fence'] = makeFenceTile();
    
    // Core Buildings
    canvasCache['building_house'] = makeMainHouseSprite();
    canvasCache['building_shop'] = makeShopSprite();
    canvasCache['building_well'] = makeWellSprite();

    // Resource Nodes Statically
    canvasCache['node_oak_tree'] = makeTreeSprite('oak', false);
    canvasCache['node_oak_tree_hit'] = makeTreeSprite('oak', true);
    canvasCache['node_pine_tree'] = makeTreeSprite('pine', false);
    canvasCache['node_pine_tree_hit'] = makeTreeSprite('pine', true);

    canvasCache['node_stone'] = makeRockNode('stone', 0);
    canvasCache['node_iron'] = makeRockNode('iron', 0);
    canvasCache['node_silver'] = makeRockNode('silver', 0);
    canvasCache['node_gold'] = makeRockNode('gold', 0);

    // Crop growth animations
    const cropTypes = ['potato', 'tomato', 'onion', 'chili', 'eggplant'];
    const cropStages = ['seed', 'sprout', 'growing', 'mature'];
    cropTypes.forEach(t => {
      cropStages.forEach(s => {
        canvasCache[`crop_${t}_${s}`] = makeCropSprite(t, s);
      });
    });

    // Resource item icons in layout HUD
    const resources = ['wood', 'stone', 'iron_ore', 'silver_ore', 'gold_ore', 'potato', 'tomato', 'onion', 'chili', 'eggplant'];
    resources.forEach(r => {
      canvasCache[`item_${r}`] = makeItemIcon(r);
    });

  } catch (err) {
    console.error('Error generating procedural pixel-art assets:', err);
  }

  return {
    getTile: (key: string, frame = 0) => {
      if (key === 'water') {
        return canvasCache[`tile_water_${frame % 4}`] || null;
      }
      if (key === 'dirt_wet') return canvasCache['tile_dirt_wet'] || null;
      if (key === 'dirt_dry') return canvasCache['tile_dirt_dry'] || null;
      return canvasCache[`tile_${key}`] || canvasCache[`building_${key}`] || null;
    },

    getNPC: (role: string, direction: string, state: string, frame: number, toolTier: string) => {
      const cacheKey = `npc_${role}_${direction}_${state}_${frame}_${toolTier}`;
      if (!canvasCache[cacheKey]) {
        canvasCache[cacheKey] = drawNPCCharacter(role, direction, state, frame, toolTier);
      }
      return canvasCache[cacheKey];
    },

    getCrop: (type: string, stage: string) => {
      const key = `crop_${type}_${stage}`;
      return canvasCache[key] || canvasCache['crop_potato_seed'];
    },

    getNode: (type: string, amount: number) => {
      if (type.includes('tree')) {
        const hitSuffix = amount < 3 ? '_hit' : '';
        return canvasCache[`node_${type}${hitSuffix}`] || canvasCache[`node_${type}`];
      }
      return canvasCache[`node_${type}`] || canvasCache['node_stone'];
    },

    getItem: (type: string) => {
      return canvasCache[`item_${type}`] || canvasCache['item_wood'];
    },

    isLoaded: true
  };
}
