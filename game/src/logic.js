// 2048 core logic — PURE functions, no DOM. ES module.
// Grid = array of 4 rows x 4 cols of ints (0 = empty).

const SIZE = 4;

export function newBoard() {
  let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  board = spawn(board);
  board = spawn(board);
  return board;
}

// Slide + merge one row toward the left. Returns {row, gained}.
function slideLeft(row) {
  const tiles = row.filter((v) => v !== 0);
  const out = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const merged = tiles[i] * 2;
      out.push(merged);
      gained += merged;
      i++; // skip the consumed tile
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  return { row: out, gained };
}

const eqRow = (a, b) => a.every((v, i) => v === b[i]);

function transpose(b) {
  return b[0].map((_, c) => b.map((row) => row[c]));
}

export function move(board, dir) {
  let work = board.map((r) => r.slice());
  const flipH = dir === 'right';
  const transposed = dir === 'up' || dir === 'down';
  const flipV = dir === 'down';

  if (transposed) work = transpose(work);
  if (flipH || flipV) work = work.map((r) => r.slice().reverse());

  let gained = 0;
  work = work.map((r) => {
    const res = slideLeft(r);
    gained += res.gained;
    return res.row;
  });

  if (flipH || flipV) work = work.map((r) => r.slice().reverse());
  if (transposed) work = transpose(work);

  const moved = !board.every((r, i) => eqRow(r, work[i]));
  return { board: work, moved, gained };
}

export function spawn(board) {
  const out = board.map((r) => r.slice());
  const empties = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (out[r][c] === 0) empties.push([r, c]);
  if (empties.length === 0) return out;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  out[r][c] = Math.random() < 0.9 ? 2 : 4;
  return out;
}

export function isWin(board) {
  return board.some((row) => row.some((v) => v >= 2048));
}

export function isGameOver(board) {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return false;
      if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return false;
      if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return false;
    }
  return true;
}
