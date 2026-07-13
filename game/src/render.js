// 2048 render pole — DOM only, no game logic (see game/CONTRACT.md).

// Build the 4x4 tile grid inside `el`. Empty cells (0) render blank.
export function renderBoard(board, el) {
  el.innerHTML = '';
  for (const row of board) {
    for (const value of row) {
      const tile = document.createElement('div');
      tile.className = value ? `tile tile-${value}` : 'tile tile-empty';
      tile.textContent = value ? String(value) : '';
      el.appendChild(tile);
    }
  }
}

// Update score/best. Uses .score/.best children if present, else `el` text.
export function renderScore(score, best, el) {
  const scoreEl = el.querySelector('.score');
  const bestEl = el.querySelector('.best');
  if (scoreEl) scoreEl.textContent = String(score);
  if (bestEl) bestEl.textContent = String(best);
  if (!scoreEl && !bestEl) el.textContent = `Score: ${score}  Best: ${best}`;
}
