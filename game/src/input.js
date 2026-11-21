// Salt & Cinder — keyboard and mouse input.
// WASD or arrows move, Shift sneaks, click throws a pebble toward the
// mouse, Enter starts, R restarts. The state is polled each frame, so
// holding a key moves smoothly and taps register as presses.

export function createInput(canvas, onPebble, onConfirm, onRestart) {
  const keys = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, clicked: false };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') onConfirm();
    if (e.code === 'KeyR') onRestart();
    const action = KEYMAP[e.code];
    if (action) {
      if (!keys.has(action)) pressed.add(action);
      keys.add(action);
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) keys.delete(action);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    mouse.clicked = true;
    onPebble(mouse.x, mouse.y);
  });

  return {
    // Held-down movement direction, normalised, or null when idle.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('left')) x -= 1;
      if (keys.has('right')) x += 1;
      if (keys.has('up')) y -= 1;
      if (keys.has('down')) y += 1;
      if (x === 0 && y === 0) return null;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    sneaking() {
      return keys.has('sneak');
    },
    // True once for each fresh key press; callers clear it after reading.
    wasPressed(action) {
      return pressed.has(action);
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
