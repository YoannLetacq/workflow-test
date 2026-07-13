// node --test suite for src/logic.js — pure logic coverage.
import { test } from 'node:test';
import assert from 'node:assert';
import { newBoard, move, spawn, isWin, isGameOver } from '../src/logic.js';

const countTiles = (b) => b.flat().filter((v) => v !== 0).length;

test('move left: merges pair, reports gained + moved', () => {
  const b = [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const r = move(b, 'left');
  assert.deepStrictEqual(r.board[0], [4, 0, 0, 0]);
  assert.strictEqual(r.gained, 4);
  assert.strictEqual(r.moved, true);
});

test('move right: merges toward right edge', () => {
  const b = [[0, 0, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const r = move(b, 'right');
  assert.deepStrictEqual(r.board[0], [0, 0, 0, 4]);
  assert.strictEqual(r.gained, 4);
});

test('move up: merges toward top of column', () => {
  const b = [[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const r = move(b, 'up');
  assert.strictEqual(r.board[0][0], 4);
  assert.strictEqual(r.board[1][0], 0);
  assert.strictEqual(r.gained, 4);
});

test('move down: merges toward bottom of column', () => {
  const b = [[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const r = move(b, 'down');
  assert.strictEqual(r.board[3][0], 4);
  assert.strictEqual(r.board[2][0], 0);
  assert.strictEqual(r.gained, 4);
});

test('no chained merge: [2,2,2,2] left -> [4,4,0,0]', () => {
  const b = [[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const r = move(b, 'left');
  assert.deepStrictEqual(r.board[0], [4, 4, 0, 0]);
  assert.strictEqual(r.gained, 8);
});

test('no-op move reports moved:false and gained:0', () => {
  const b = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const r = move(b, 'left');
  assert.strictEqual(r.moved, false);
  assert.strictEqual(r.gained, 0);
});

test('newBoard spawns exactly 2 tiles on empty grid', () => {
  assert.strictEqual(countTiles(newBoard()), 2);
});

test('spawn adds exactly one tile (2 or 4) to an empty cell', () => {
  const b = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const out = spawn(b);
  assert.strictEqual(countTiles(out), countTiles(b) + 1);
  const added = out.flat().filter((v, i) => v !== b.flat()[i]);
  assert.ok(added.every((v) => v === 2 || v === 4));
});

test('spawn on full board keeps counts (no room)', () => {
  const b = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];
  assert.strictEqual(countTiles(spawn(b)), 16);
});

test('isWin true when any tile >= 2048, false otherwise', () => {
  assert.strictEqual(isWin([[2048, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), true);
  assert.strictEqual(isWin(newBoard()), false);
});

test('isGameOver: full board no merges = true', () => {
  assert.strictEqual(isGameOver([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]), true);
});

test('isGameOver: empty cell = false', () => {
  assert.strictEqual(isGameOver([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 0]]), false);
});

test('isGameOver: adjacent mergeable tiles = false', () => {
  assert.strictEqual(isGameOver([[2, 2, 4, 8], [4, 8, 16, 32], [2, 4, 8, 16], [4, 8, 16, 32]]), false);
});
