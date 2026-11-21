// Salt & Cinder — level geometry: collision, sight lines, fog and beam.
// Every query here is pure geometry over the rectangles in config.js,
// so the guards, the player and the beam all agree on what blocks sight.

import { WALLS, CRATES, FOG, BEAM, WORLD_W, WORLD_H } from './config.js';

const CRATE_SIZE = 32;

// All solid rectangles: walls plus crates.
export function solids() {
  const list = WALLS.map((w) => ({ x: w.x, y: w.y, w: w.w, h: w.h }));
  for (const c of CRATES) list.push({ x: c.x, y: c.y, w: CRATE_SIZE, h: CRATE_SIZE });
  return list;
}

function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// True when a circle of radius r at (x, y) overlaps any solid.
export function blockedAt(x, y, r) {
  if (x - r < 0 || x + r > WORLD_W || y - r < 0 || y + r > WORLD_H) return true;
  for (const s of solids()) {
    if (circleHitsRect(x, y, r, s)) return true;
  }
  return false;
}

// Move a circle by (dx, dy), sliding along walls: try the full step,
// then each axis on its own, so the player hugs walls instead of sticking.
export function moveCircle(x, y, r, dx, dy) {
  if (!blockedAt(x + dx, y + dy, r)) return { x: x + dx, y: y + dy };
  if (!blockedAt(x + dx, y, r)) return { x: x + dx, y };
  if (!blockedAt(x, y + dy, r)) return { x, y: y + dy };
  return { x, y };
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Slab test: does the segment cross the rectangle's interior?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  const axes = [
    { d: dx, min: rect.x - x1, max: rect.x + rect.w - x1 },
    { d: dy, min: rect.y - y1, max: rect.y + rect.h - y1 },
  ];
  for (const a of axes) {
    if (Math.abs(a.d) < 1e-9) {
      if (a.min > 0 || a.max < 0) return false;
    } else {
      let t1 = a.min / a.d;
      let t2 = a.max / a.d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

// True when nothing solid stands between two points.
export function hasLineOfSight(x1, y1, x2, y2) {
  for (const s of solids()) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return false;
  }
  return true;
}

// True when the point sits inside a fog bank.
export function inFog(x, y) {
  for (const f of FOG) {
    const dx = x - f.x;
    const dy = y - f.y;
    if (dx * dx + dy * dy < f.r * f.r) return true;
  }
  return false;
}

// The lamp's beam angle at time t (seconds), sweeping back and forth.
export function beamAngle(t) {
  const phase = (t / BEAM.period) * Math.PI * 2;
  // Sweep from down-left to down-right around straight down.
  return Math.PI / 2 + Math.sin(phase) * 1.1;
}

// True when the point lies inside the beam wedge and the lamp can see it.
export function inBeam(x, y, t) {
  const dx = x - BEAM.x;
  const dy = y - BEAM.y;
  const dist = Math.hypot(dx, dy);
  if (dist > BEAM.length || dist < 1) return false;
  const angle = Math.atan2(dy, dx);
  let diff = angle - beamAngle(t);
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > BEAM.halfAngle) return false;
  return hasLineOfSight(BEAM.x, BEAM.y, x, y);
}
