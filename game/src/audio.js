// Salt & Cinder — synthesized sound. Every sound is built from
// oscillators and filtered noise at run time; the game ships no audio
// files and makes no network request.

let ctx = null;
let master = null;
let windNodes = null;

function ensureContext() {
  if (ctx) return true;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return true;
  } catch (err) {
    return false;
  }
}

// Call from the first user gesture: browsers only allow audio after one.
export function unlockAudio() {
  if (!ensureContext()) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  startWind();
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ensureContext()) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, filterFreq, when = 0) {
  if (!ensureContext()) return;
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

// A soft loop of wind over the lighthouse roof, started once.
function startWind() {
  if (windNodes || !ctx) return;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  const gain = ctx.createGain();
  gain.gain.value = 0.05;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.025;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start();
  lfo.start();
  windNodes = { src, lfo };
}

// One footstep: a quiet tick, softer while sneaking.
export function playStep(sneaking) {
  noiseBurst(0.06, sneaking ? 0.03 : 0.08, sneaking ? 500 : 900);
}

// A guard notices something: a short questioning two-note blip.
export function playSuspicion() {
  tone(620, 0.12, 'sine', 0.16);
  tone(830, 0.16, 'sine', 0.16, 0.12);
}

// The alarm: a rising sting when a guard spots you fully.
export function playAlarm() {
  tone(220, 0.5, 'sawtooth', 0.12, 0, 440);
  tone(330, 0.5, 'sawtooth', 0.08, 0.08, 660);
}

// A pebble clatters where it lands.
export function playPebble() {
  noiseBurst(0.09, 0.2, 2400);
  tone(1900, 0.05, 'square', 0.05, 0.02);
}

// Picking up a shard or the crystal: a warm chime.
export function playPickup(big) {
  tone(880, 0.18, 'sine', 0.18);
  tone(1318, 0.24, 'sine', 0.14, 0.09);
  if (big) tone(1760, 0.4, 'sine', 0.12, 0.18);
}

// Escaped with the crystal: a small rising arpeggio.
export function playWin() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, i * 0.13));
}

// Caught: a low descending thud.
export function playLose() {
  tone(180, 0.7, 'sawtooth', 0.14, 0, 70);
  noiseBurst(0.3, 0.1, 300, 0.05);
}
