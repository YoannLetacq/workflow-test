// src/input.js — arrow keys + touch swipe -> onMove(dir) per CONTRACT.md
const KEYS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const SWIPE_MIN = 30; // ponytail: fixed threshold, expose as arg if tuning needed

export function bindInput(onMove) {
  const onKey = (e) => {
    const dir = KEYS[e.key];
    if (dir) {
      e.preventDefault();
      onMove(dir);
    }
  };

  let sx = 0;
  let sy = 0;
  const onStart = (e) => {
    const t = e.changedTouches[0];
    sx = t.clientX;
    sy = t.clientY;
  };
  const onEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      onMove(dx > 0 ? 'right' : 'left');
    } else {
      onMove(dy > 0 ? 'down' : 'up');
    }
  };

  window.addEventListener('keydown', onKey);
  window.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchend', onEnd, { passive: true });

  // return unbind for callers that mount/unmount
  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('touchstart', onStart);
    window.removeEventListener('touchend', onEnd);
  };
}
