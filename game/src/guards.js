// Salt & Cinder — guard AI: patrol, suspicion, chase, investigate.
// A guard's state is readable at a glance: blue lantern while calm,
// amber while suspicious, red while chasing, with ? and ! over its head.
// Detection gives the player a chance to recover: the meter fills
// gradually, decays out of sight, and a chase can be broken.

import { GUARD } from './config.js';
import { moveCircle, hasLineOfSight, inFog, inBeam } from './level.js';
import { playSuspicion, playAlarm } from './audio.js';

export function createGuard(def) {
  return {
    name: def.name,
    x: def.waypoints[0].x,
    y: def.waypoints[0].y,
    waypoints: def.waypoints,
    waypointIndex: 1,
    speed: def.speed,
    color: def.color,
    angle: 0,
    state: 'patrol', // patrol | suspicious | chase | investigate | return
    meter: 0,
    pauseTimer: 0,
    loseTimer: 0,
    lastSeen: null,
    investigateTarget: null,
    alarmed: false,
  };
}

function angleTo(g, x, y) {
  return Math.atan2(y - g.y, x - g.x);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(g, targetAngle, rate, dt) {
  const diff = angleDiff(targetAngle, g.angle);
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  g.angle += step;
}

function walkToward(g, x, y, speed, dt) {
  const dx = x - g.x;
  const dy = y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const nx = g.x + (dx / dist) * step;
  const ny = g.y + (dy / dist) * step;
  const moved = moveCircle(g.x, g.y, GUARD.radius, nx - g.x, ny - g.y);
  g.x = moved.x;
  g.y = moved.y;
  g.angle = angleTo(g, x, y);
  return dist <= speed * dt + 2;
}

// Can this guard see the player right now?
export function canSee(g, px, py) {
  const dx = px - g.x;
  const dy = py - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.viewRange) return false;
  const diff = Math.abs(angleDiff(Math.atan2(dy, dx), g.angle));
  if (diff > GUARD.viewHalfAngle) return false;
  return hasLineOfSight(g.x, g.y, px, py);
}

export function updateGuard(g, player, dt, t, onCaught) {
  const seen = canSee(g, player.x, player.y);
  const px = player.x;
  const py = player.y;
  const dist = Math.hypot(px - g.x, py - g.y);

  // Detection fills while the player is visible, faster up close, slower
  // while sneaking or hidden in fog, faster still inside the beam.
  if (seen && player.state === 'playing') {
    let rate = GUARD.detectRate * (1 - (dist / GUARD.viewRange) * 0.6);
    if (player.sneaking) rate *= GUARD.sneakFactor;
    if (inFog(px, py)) rate *= GUARD.fogFactor;
    if (inBeam(px, py, t)) rate += GUARD.beamBonus;
    g.meter = Math.min(GUARD.alertAt, g.meter + rate * dt);
    g.lastSeen = { x: px, y: py };
    g.loseTimer = 0;
  } else {
    g.meter = Math.max(0, g.meter - GUARD.detectDecay * dt);
    if (g.state === 'chase') {
      g.loseTimer += dt;
    }
  }

  // Cross the suspicion line: pause, look, wonder.
  if (g.state === 'patrol' && g.meter >= GUARD.suspicionAt) {
    g.state = 'suspicious';
    g.pauseTimer = 1.2;
    playSuspicion();
  }
  // Cross the alarm line: give chase.
  if (g.meter >= GUARD.alertAt && g.state !== 'chase') {
    g.state = 'chase';
    if (!g.alarmed) {
      playAlarm();
      g.alarmed = true;
    }
  }

  switch (g.state) {
    case 'patrol': {
      if (g.pauseTimer > 0) {
        g.pauseTimer -= dt;
        // Idle at a waypoint: slowly scan the room.
        g.angle += Math.sin(t * 0.8 + g.x) * 0.4 * dt;
      } else {
        const wp = g.waypoints[g.waypointIndex];
        if (walkToward(g, wp.x, wp.y, g.speed, dt)) {
          g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
          g.pauseTimer = 0.8;
        }
      }
      if (g.meter < GUARD.suspicionAt * 0.5) g.alarmed = false;
      break;
    }
    case 'suspicious': {
      if (seen) turnToward(g, angleTo(g, px, py), 4, dt);
      g.pauseTimer -= dt;
      if (g.pauseTimer <= 0) {
        if (g.meter >= GUARD.suspicionAt * 0.6 && g.lastSeen) {
          g.state = 'investigate';
          g.investigateTarget = { ...g.lastSeen };
        } else {
          g.state = 'patrol';
        }
      }
      break;
    }
    case 'chase': {
      const target = seen ? { x: px, y: py } : g.lastSeen;
      if (target) walkToward(g, target.x, target.y, GUARD.chaseSpeed, dt);
      if (dist < GUARD.catchDistance) {
        onCaught(g);
        return;
      }
      if (g.loseTimer > GUARD.loseSightSeconds) {
        g.state = 'investigate';
        g.investigateTarget = g.lastSeen ? { ...g.lastSeen } : { x: g.x, y: g.y };
      }
      break;
    }
    case 'investigate': {
      const target = g.investigateTarget || { x: g.x, y: g.y };
      if (walkToward(g, target.x, target.y, GUARD.investigateSpeed, dt)) {
        g.pauseTimer = 1.4;
        g.state = 'return';
      }
      break;
    }
    case 'return': {
      g.pauseTimer -= dt;
      if (g.pauseTimer <= 0) {
        // Walk back to the nearest waypoint and resume the patrol.
        let best = 0;
        let bestDist = Infinity;
        g.waypoints.forEach((wp, i) => {
          const d = Math.hypot(wp.x - g.x, wp.y - g.y);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        g.waypointIndex = best;
        g.state = 'patrol';
        g.alarmed = false;
      }
      break;
    }
  }
}

// A thrown pebble pulls every guard in earshot toward the clatter.
export function distractGuards(guards, x, y, radius) {
  for (const g of guards) {
    if (g.state === 'chase') continue;
    const d = Math.hypot(x - g.x, y - g.y);
    if (d < radius) {
      g.state = 'investigate';
      g.investigateTarget = { x, y };
      g.meter = Math.max(g.meter, GUARD.suspicionAt * 0.5);
    }
  }
}
