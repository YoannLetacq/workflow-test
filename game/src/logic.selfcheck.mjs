// Self-check for logic.js. Run: node src/logic.selfcheck.mjs
import assert from 'node:assert';
import { move, isWin, isGameOver, newBoard } from './logic.js';

// merge: [2,2,0,0] left -> [4,0,0,0], gained 4
{
  const b = [
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const r = move(b, 'left');
  assert.deepStrictEqual(r.board[0], [4, 0, 0, 0], 'merge left');
  assert.strictEqual(r.gained, 4, 'gained 4');
  assert.strictEqual(r.moved, true, 'moved');
}

// no double-merge: [2,2,2,2] left -> [4,4,0,0], gained 8
{
  const b = [[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const r = move(b, 'left');
  assert.deepStrictEqual(r.board[0], [4, 4, 0, 0], 'no chained merge');
  assert.strictEqual(r.gained, 8);
}

// direction: [0,0,2,2] right -> [0,0,0,4]
{
  const b = [[0, 0, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const r = move(b, 'right');
  assert.deepStrictEqual(r.board[0], [0, 0, 0, 4], 'merge right');
}

// no-op move reports moved:false
{
  const b = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  assert.strictEqual(move(b, 'left').moved, false, 'no-op moved false');
}

// win detection
assert.strictEqual(
  isWin([[2048, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]),
  true,
  'win at 2048'
);
assert.strictEqual(isWin(newBoard()), false, 'fresh board not won');

// game over: full board, no merges possible
assert.strictEqual(
  isGameOver([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]),
  true,
  'no moves = over'
);
// not over: has empty cell
assert.strictEqual(
  isGameOver([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 0]]),
  false,
  'empty cell = not over'
);
// not over: adjacent equal tiles mergeable
assert.strictEqual(
  isGameOver([[2, 2, 4, 8], [4, 8, 16, 32], [2, 4, 8, 16], [4, 8, 16, 32]]),
  false,
  'mergeable = not over'
);

console.log('logic.selfcheck: all assertions passed');
