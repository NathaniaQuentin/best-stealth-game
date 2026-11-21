// Salt & Cinder — level data and tuning constants.
// A decommissioned lighthouse at night: storage, gallery, vault and dock.
// The whole level is one hand-placed map, 1280 x 480, so every patrol,
// hiding spot and sightline is deliberate and learnable.

export const TILE = 32;
export const WORLD_W = 1280;
export const WORLD_H = 480;

// Walls are solid rectangles (x, y, width, height). They block movement,
// guard sight and the lighthouse beam.
export const WALLS = [
  // Outer shell.
  { x: 0, y: 0, w: 1280, h: 32 },
  { x: 0, y: 448, w: 1280, h: 32 },
  { x: 0, y: 0, w: 32, h: 480 },
  { x: 1248, y: 0, w: 32, h: 480 },
  // Storage / gallery divider (door gap at row 6).
  { x: 416, y: 64, w: 32, h: 128 },
  { x: 416, y: 224, w: 32, h: 96 },
  // Gallery / vault divider (door gap at row 8).
  { x: 832, y: 128, w: 32, h: 128 },
  { x: 832, y: 288, w: 32, h: 96 },
  // Gallery north wall (door gap at column 20).
  { x: 448, y: 128, w: 192, h: 32 },
  { x: 672, y: 128, w: 160, h: 32 },
  // Storage south wall (door gap at column 7).
  { x: 64, y: 320, w: 160, h: 32 },
  { x: 256, y: 320, w: 128, h: 32 },
];

// Crates are cover: they block movement and sight, so the player can
// break a guard's line of sight behind them.
export const CRATES = [
  { x: 160, y: 160 }, { x: 192, y: 160 }, { x: 160, y: 192 },
  { x: 320, y: 320 }, { x: 352, y: 320 },
  { x: 576, y: 224 }, { x: 608, y: 224 },
  { x: 736, y: 288 },
  { x: 960, y: 288 }, { x: 992, y: 288 }, { x: 960, y: 320 },
  { x: 1120, y: 256 },
];

// Fog banks are soft cover: detection fills four times slower inside one.
export const FOG = [
  { x: 576, y: 288, r: 64 },
  { x: 704, y: 352, r: 64 },
  { x: 256, y: 160, r: 48 },
  { x: 1056, y: 320, r: 64 },
];

// The Fresnel crystal sits on its pedestal in the vault room.
export const CRYSTAL = { x: 1120, y: 96 };
// The rowboat at the dock is the way out.
export const EXIT = { x: 1152, y: 384, r: 30 };
// Where Wren slips in through the cellar door.
export const PLAYER_START = { x: 96, y: 384 };

// Optional ember shards, tucked into risky corners for score.
export const SHARDS = [
  { x: 192, y: 64 },
  { x: 768, y: 416 },
  { x: 1056, y: 160 },
];

// Guard patrols: name, waypoints, speed, and the colour of their lantern.
export const GUARDS = [
  {
    name: 'Maren',
    waypoints: [
      { x: 128, y: 96 }, { x: 320, y: 96 },
      { x: 320, y: 256 }, { x: 128, y: 256 },
    ],
    speed: 55,
    color: '#e8b64c',
  },
  {
    name: 'Bram',
    waypoints: [
      { x: 512, y: 192 }, { x: 768, y: 192 },
      { x: 768, y: 384 }, { x: 512, y: 384 },
    ],
    speed: 60,
    color: '#f0a35e',
  },
  {
    name: 'Pip',
    waypoints: [
      { x: 960, y: 96 }, { x: 1152, y: 96 },
      { x: 1152, y: 192 }, { x: 960, y: 192 },
    ],
    speed: 65,
    color: '#e8d27a',
  },
];

// The lighthouse lamp above the gallery sweeps a slow beam across the
// floor. Standing in it makes you much easier to spot. It hangs in the
// middle of the gallery door gap, so its light can reach the floor below.
export const BEAM = { x: 656, y: 64, length: 300, halfAngle: 0.21, period: 24 };

export const PLAYER = {
  radius: 11,
  walkSpeed: 130,
  sneakSpeed: 70,
  pebbles: 5,
  pebbleRange: 260,
  pebbleNoiseRadius: 120,
};

export const GUARD = {
  radius: 12,
  viewRange: 180,
  viewHalfAngle: 0.6,
  catchDistance: 22,
  chaseSpeed: 105,
  investigateSpeed: 80,
  detectRate: 90,
  detectDecay: 30,
  suspicionAt: 40,
  alertAt: 100,
  loseSightSeconds: 4,
  fogFactor: 0.25,
  sneakFactor: 0.5,
  beamBonus: 40,
};
