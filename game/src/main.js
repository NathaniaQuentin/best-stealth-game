// Salt & Cinder — game loop and state.
// Phases: title → playing → caught | won. The player steals the Fresnel
// crystal from the vault, then reaches the rowboat. Guards patrol, grow
// suspicious, chase, investigate and give up — the detection meter
// always gives the player a chance to slip away.
// ?shot=start|play|alert|escape stages a fixed scene for screenshots.

import { PLAYER_START, SHARDS, GUARDS, CRYSTAL, EXIT, PLAYER, GUARD } from './config.js';
import { moveCircle, inFog } from './level.js';
import { createGuard, updateGuard, distractGuards } from './guards.js';
import { render } from './render.js';
import { createInput } from './input.js';
import {
  unlockAudio, playStep, playPebble, playPickup, playWin, playLose,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const hudObjective = document.getElementById('hud-objective');
const hudShards = document.getElementById('hud-shards');
const hudPebbles = document.getElementById('hud-pebbles');
const hudTime = document.getElementById('hud-time');
const hudEye = document.getElementById('hud-eye');
const hudEyeFill = document.getElementById('hud-eye-fill');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

window.addEventListener('error', (e) => {
  statusEl.textContent = `error: ${e.message}`;
});

function freshGame() {
  return {
    phase: 'title',
    elapsed: 0,
    player: {
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      face: 0,
      sneaking: false,
      moving: false,
      state: 'playing',
    },
    guards: GUARDS.map(createGuard),
    shards: SHARDS.map((s) => ({ ...s, taken: false })),
    shardsTaken: 0,
    pebblesLeft: PLAYER.pebbles,
    pebbles: [],
    pebbleCooldown: 0,
    hasCrystal: false,
    caughtBy: null,
    stepTimer: 0,
  };
}

let game = freshGame();

function startPlaying() {
  if (game.phase !== 'title') return;
  game.phase = 'playing';
  statusEl.textContent = 'Steal the Fresnel crystal, then reach the rowboat unseen.';
}

function restart() {
  game = freshGame();
  game.phase = 'playing';
  statusEl.textContent = 'Steal the Fresnel crystal, then reach the rowboat unseen.';
}

function throwPebble(wx, wy) {
  if (game.phase !== 'playing') return;
  if (game.pebblesLeft <= 0 || game.pebbleCooldown > 0) return;
  const dx = wx - game.player.x;
  const dy = wy - game.player.y;
  const dist = Math.hypot(dx, dy);
  const range = Math.min(dist, PLAYER.pebbleRange);
  const tx = game.player.x + (dist > 0 ? (dx / dist) * range : 0);
  const ty = game.player.y + (dist > 0 ? (dy / dist) * range : 0);
  game.pebbles.push({ x: tx, y: ty, age: 0 });
  game.pebblesLeft -= 1;
  game.pebbleCooldown = 0.8;
  playPebble();
  distractGuards(game.guards, tx, ty, PLAYER.pebbleNoiseRadius);
}

const input = createInput(
  canvas,
  (x, y) => {
    unlockAudio();
    if (game.phase === 'title') startPlaying();
    else if (game.phase === 'caught' || game.phase === 'won') restart();
    else throwPebble(x, y);
  },
  () => {
    unlockAudio();
    if (game.phase === 'title') startPlaying();
    else if (game.phase === 'caught' || game.phase === 'won') restart();
  },
  () => {
    if (game.phase !== 'title') restart();
  },
);

function updateHud() {
  const maxMeter = Math.max(0, ...game.guards.map((g) => g.meter));
  const anyChase = game.guards.some((g) => g.state === 'chase');
  const anySuspicious = game.guards.some((g) => g.state === 'suspicious' || g.state === 'investigate');
  hudObjective.textContent = game.hasCrystal
    ? 'Reach the rowboat unseen!'
    : 'Steal the Fresnel crystal from the vault';
  hudShards.textContent = `Embers ${game.shardsTaken}/3`;
  hudPebbles.textContent = `Pebbles ${game.pebblesLeft}`;
  hudTime.textContent = `${game.elapsed.toFixed(0)}s`;
  hudEyeFill.style.width = `${maxMeter}%`;
  hudEyeFill.style.background = anyChase ? '#e6463c' : anySuspicious ? '#e8b64c' : '#7fe0d4';
  hudEye.title = anyChase ? 'Spotted!' : anySuspicious ? 'A guard is suspicious' : 'Unseen';
}

function update(dt, t) {
  if (game.phase !== 'playing') return;
  game.elapsed += dt;
  game.pebbleCooldown = Math.max(0, game.pebbleCooldown - dt);
  for (const p of game.pebbles) p.age += dt;

  const p = game.player;
  const move = input.moveVector();
  p.sneaking = input.sneaking();
  p.moving = move !== null;
  if (move) {
    const speed = p.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const moved = moveCircle(p.x, p.y, PLAYER.radius, move.x * speed * dt, move.y * speed * dt);
    p.x = moved.x;
    p.y = moved.y;
    p.face = Math.atan2(move.y, move.x);
    game.stepTimer -= dt;
    if (game.stepTimer <= 0) {
      playStep(p.sneaking);
      game.stepTimer = p.sneaking ? 0.55 : 0.38;
    }
  }

  // Pick up ember shards.
  for (const s of game.shards) {
    if (!s.taken && Math.hypot(s.x - p.x, s.y - p.y) < 20) {
      s.taken = true;
      game.shardsTaken += 1;
      playPickup(false);
      statusEl.textContent = `Ember shard ${game.shardsTaken} of 3.`;
    }
  }
  // Take the crystal.
  if (!game.hasCrystal && Math.hypot(CRYSTAL.x - p.x, CRYSTAL.y - p.y) < 26) {
    game.hasCrystal = true;
    playPickup(true);
    statusEl.textContent = 'Crystal taken! Now reach the rowboat unseen.';
  }
  // Reach the rowboat with the crystal.
  if (game.hasCrystal && Math.hypot(EXIT.x - p.x, EXIT.y - p.y) < EXIT.r) {
    game.phase = 'won';
    playWin();
    statusEl.textContent = 'Clean getaway! The crystal is yours.';
    return;
  }

  // Guards think and move. A catch ends the run.
  for (const g of game.guards) {
    updateGuard(g, p, dt, t, (guard) => {
      game.phase = 'caught';
      game.caughtBy = guard.name;
      playLose();
      statusEl.textContent = `${guard.name} caught you.`;
    });
    if (game.phase !== 'playing') return;
  }
  // A guard bumping into the player at close range is a catch too.
  for (const g of game.guards) {
    if (Math.hypot(g.x - p.x, g.y - p.y) < GUARD.catchDistance) {
      game.phase = 'caught';
      game.caughtBy = g.name;
      playLose();
      statusEl.textContent = `${g.name} caught you.`;
      return;
    }
  }
}

// Stage a fixed scene for screenshots: ?shot=start|play|alert|escape.
function stageShot() {
  if (!shot) return;
  game.phase = 'playing';
  if (shot === 'start') {
    game.phase = 'title';
    return;
  }
  if (shot === 'play') {
    // Wren sneaking behind the gallery crates, Bram mid-patrol ahead,
    // Maren growing suspicious at the edge of sight.
    game.player.x = 560;
    game.player.y = 300;
    game.player.sneaking = true;
    game.player.face = 0;
    game.guards[1].x = 640;
    game.guards[1].y = 240;
    game.guards[1].angle = Math.PI / 2;
    game.guards[1].waypointIndex = 2;
    game.guards[0].meter = 45;
    game.guards[0].state = 'suspicious';
    game.guards[0].x = 320;
    game.guards[0].y = 200;
    game.guards[0].angle = -Math.PI / 2;
    game.guards[0].pauseTimer = 99;
  } else if (shot === 'alert') {
    // Pip has spotted Wren by the vault and is closing in, meter full.
    game.player.x = 1000;
    game.player.y = 150;
    game.player.face = Math.PI;
    game.guards[2].x = 1060;
    game.guards[2].y = 120;
    game.guards[2].angle = Math.PI;
    game.guards[2].meter = 100;
    game.guards[2].state = 'chase';
    game.guards[2].lastSeen = { x: 1000, y: 150 };
  } else if (shot === 'escape') {
    // Crystal in hand, Wren slipping to the rowboat as Bram patrols away.
    game.hasCrystal = true;
    game.shardsTaken = 2;
    game.shards[0].taken = true;
    game.shards[1].taken = true;
    game.player.x = 1080;
    game.player.y = 360;
    game.player.face = Math.PI / 2;
    game.guards[1].x = 512;
    game.guards[1].y = 384;
    game.guards[1].angle = Math.PI;
    game.guards[1].waypointIndex = 3;
  }
}

stageShot();

let last = performance.now();
let t = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  // In staged shots the world holds still so the render is deterministic.
  if (!shot) update(dt, t);
  render(ctx, game, t);
  updateHud();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
