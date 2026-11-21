// Salt & Cinder — canvas rendering. Draw order matters: the floor and
// the vision cones go down first, then walls and crates cover the cones,
// so a cone never shows through solid cover — what you see is what the
// guards can see.

import { WALLS, CRATES, FOG, CRYSTAL, EXIT, SHARDS, BEAM, GUARD, PLAYER, WORLD_W, WORLD_H } from './config.js';
import { beamAngle } from './level.js';

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawFloor(ctx, t) {
  ctx.fillStyle = '#171a21';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // Room tints so each area reads at a glance.
  const rooms = [
    { x: 32, y: 32, w: 384, h: 288, c: 'rgba(122, 84, 40, 0.16)', label: 'STORAGE' },
    { x: 448, y: 160, w: 384, h: 288, c: 'rgba(46, 110, 110, 0.16)', label: 'GALLERY' },
    { x: 864, y: 32, w: 384, h: 224, c: 'rgba(70, 90, 160, 0.18)', label: 'VAULT' },
    { x: 864, y: 288, w: 384, h: 160, c: 'rgba(90, 96, 110, 0.16)', label: 'DOCK' },
  ];
  for (const r of rooms) {
    ctx.fillStyle = r.c;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(220, 225, 235, 0.10)';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(r.label, r.x + 12, r.y + 24);
  }
  // Faint floorboards.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 32; x < WORLD_W; x += 32) {
    ctx.moveTo(x, 32);
    ctx.lineTo(x, WORLD_H - 32);
  }
  for (let y = 32; y < WORLD_H; y += 32) {
    ctx.moveTo(32, y);
    ctx.lineTo(WORLD_W - 32, y);
  }
  ctx.stroke();
}

function drawFog(ctx, t) {
  for (const f of FOG) {
    const wobble = Math.sin(t * 0.7 + f.x) * 4;
    const grad = ctx.createRadialGradient(f.x + wobble, f.y, 4, f.x, f.y, f.r);
    grad.addColorStop(0, 'rgba(190, 205, 225, 0.16)');
    grad.addColorStop(1, 'rgba(190, 205, 225, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBeam(ctx, t) {
  const angle = beamAngle(t);
  const grad = ctx.createRadialGradient(BEAM.x, BEAM.y, 8, BEAM.x, BEAM.y, BEAM.length);
  grad.addColorStop(0, 'rgba(255, 226, 150, 0.22)');
  grad.addColorStop(1, 'rgba(255, 226, 150, 0)');
  ctx.fillStyle = grad;
  conePath(ctx, BEAM.x, BEAM.y, angle, BEAM.length, BEAM.halfAngle);
  ctx.fill();
  // The lamp housing on the wall.
  ctx.fillStyle = '#3a3f4c';
  ctx.beginPath();
  ctx.arc(BEAM.x, BEAM.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe296';
  ctx.beginPath();
  ctx.arc(BEAM.x, BEAM.y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCones(ctx, guards) {
  for (const g of guards) {
    const base = g.state === 'chase'
      ? 'rgba(230, 70, 60, '
      : g.state === 'suspicious' || g.state === 'investigate'
        ? 'rgba(232, 182, 76, '
        : 'rgba(240, 214, 130, ';
    const alpha = g.state === 'chase' ? 0.28 : g.state === 'patrol' ? 0.12 : 0.2;
    const grad = ctx.createRadialGradient(g.x, g.y, 6, g.x, g.y, GUARD.viewRange);
    grad.addColorStop(0, base + alpha + ')');
    grad.addColorStop(1, base + '0)');
    ctx.fillStyle = grad;
    conePath(ctx, g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle);
    ctx.fill();
  }
}

function drawWallsAndCrates(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = '#2b3040';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.fillRect(w.x, w.y, w.w, 3);
  }
  for (const c of CRATES) {
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(c.x, c.y, 32, 32);
    ctx.strokeStyle = '#3d2a14';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 2, c.y + 2, 28, 28);
    ctx.beginPath();
    ctx.moveTo(c.x + 2, c.y + 2);
    ctx.lineTo(c.x + 30, c.y + 30);
    ctx.moveTo(c.x + 30, c.y + 2);
    ctx.lineTo(c.x + 2, c.y + 30);
    ctx.stroke();
  }
}

function drawObjectives(ctx, state, t) {
  // The pedestal and its crystal.
  ctx.fillStyle = '#3a3f4c';
  ctx.fillRect(CRYSTAL.x - 14, CRYSTAL.y - 10, 28, 20);
  if (!state.hasCrystal) {
    const pulse = 0.7 + Math.sin(t * 3) * 0.3;
    ctx.save();
    ctx.translate(CRYSTAL.x, CRYSTAL.y - 16);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = `rgba(120, 230, 255, ${0.75 * pulse + 0.25})`;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#dff8ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
    ctx.fillStyle = 'rgba(120, 230, 255, 0.9)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FRESNEL CRYSTAL', CRYSTAL.x, CRYSTAL.y + 34);
  }
  // The rowboat exit.
  ctx.save();
  ctx.translate(EXIT.x, EXIT.y);
  ctx.strokeStyle = state.hasCrystal ? '#7be495' : '#8a90a0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 14, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.moveTo(-8, -11);
  ctx.lineTo(-8, 11);
  ctx.moveTo(8, -11);
  ctx.lineTo(8, 11);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = state.hasCrystal ? '#7be495' : 'rgba(220, 225, 235, 0.75)';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.hasCrystal ? 'ROWBOAT — GO!' : 'ROWBOAT (EXIT)', EXIT.x, EXIT.y + 30);
  // Ember shards.
  for (const s of state.shards) {
    if (s.taken) continue;
    const pulse = 0.6 + Math.sin(t * 4 + s.x) * 0.4;
    ctx.fillStyle = `rgba(255, 150, 60, ${pulse})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd9a0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Thrown pebbles, with an expanding ring that shows how far the
  // clatter carries while it is fresh.
  for (const p of state.pebbles) {
    ctx.fillStyle = '#c9cdd6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    if (p.age < 0.6) {
      const frac = p.age / 0.6;
      ctx.strokeStyle = `rgba(232, 182, 76, ${0.7 * (1 - frac)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8 + frac * PLAYER.pebbleNoiseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawGuards(ctx, guards) {
  for (const g of guards) {
    // Body: a keeper in a dark coat with a coloured lantern.
    ctx.fillStyle = '#22242e';
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 18, g.y + Math.sin(g.angle) * 18);
    ctx.stroke();
    // Lantern dot.
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * 8, g.y + Math.sin(g.angle) * 8, 3, 0, Math.PI * 2);
    ctx.fill();
    // Detection meter arc above the guard.
    if (g.meter > 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 18, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = g.meter >= GUARD.alertAt ? '#e6463c' : '#e8b64c';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 18, -Math.PI / 2, -Math.PI / 2 + (g.meter / 100) * Math.PI * 2);
      ctx.stroke();
    }
    // State mark.
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff5a4a';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 24);
    } else if (g.state === 'suspicious' || g.state === 'investigate') {
      ctx.fillStyle = '#f5c542';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 24);
    }
    // Name tag.
    ctx.fillStyle = 'rgba(220, 225, 235, 0.6)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y + 26);
  }
}

function drawPlayer(ctx, player, t) {
  const bob = player.moving ? Math.sin(t * 10) * 1.5 : 0;
  ctx.fillStyle = '#1f6f6b';
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob * 0.3, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7fe0d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob * 0.3, 11, 0, Math.PI * 2);
  ctx.stroke();
  // Hood point and facing tick.
  ctx.fillStyle = '#7fe0d4';
  ctx.beginPath();
  ctx.arc(
    player.x + Math.cos(player.face) * 7,
    player.y + Math.sin(player.face) * 7 + bob * 0.3,
    3.5, 0, Math.PI * 2,
  );
  ctx.fill();
  if (player.sneaking) {
    ctx.fillStyle = 'rgba(127, 224, 212, 0.8)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', player.x, player.y + 24);
  }
}

function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(8, 10, 16, ${alpha})`;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 12, 20, 0.88)';
  ctx.fillRect(340, 100, 600, 280);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(340, 100, 600, 280);
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, 152);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '16px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 192 + i * 26));
}

export function render(ctx, game, t) {
  drawFloor(ctx, t);
  drawFog(ctx, t);
  drawBeam(ctx, t);
  drawCones(ctx, game.guards);
  drawWallsAndCrates(ctx);
  drawObjectives(ctx, game, t);
  drawGuards(ctx, game.guards);
  drawPlayer(ctx, game.player, t);

  if (game.phase === 'title') {
    veil(ctx, 0.62);
    panel(ctx, 'SALT & CINDER', [
      'A lighthouse heist. Steal the Fresnel crystal,',
      'then reach the rowboat unseen.',
      '',
      'WASD / arrows — move    Shift — sneak    Click — throw a pebble',
      'Hide in fog, slip behind crates, watch the cones.',
      '',
      'Press Enter or click to begin',
    ], '#e8b64c');
  } else if (game.phase === 'caught') {
    veil(ctx, 0.55);
    panel(ctx, 'CAUGHT!', [
      `${game.caughtBy} spotted you in the lamplight.`,
      `Shards: ${game.shardsTaken} of 3    Time: ${game.elapsed.toFixed(1)}s`,
      '',
      'Press R or click to try again',
    ], '#e6463c');
  } else if (game.phase === 'won') {
    veil(ctx, 0.55);
    panel(ctx, 'CLEAN GETAWAY', [
      'The crystal is yours and the rowboat is already moving.',
      `Shards: ${game.shardsTaken} of 3    Time: ${game.elapsed.toFixed(1)}s`,
      `Pebbles left: ${game.pebblesLeft}`,
      '',
      'Press R or click to play again',
    ], '#7be495');
  }
}
