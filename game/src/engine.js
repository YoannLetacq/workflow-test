// Pole engine: composes logic + persistence into a stateful game.
// Contract: createGame() -> { state:{board,score,best,won,over}, move(dir), reset() }
import { newBoard, move as logicMove, spawn, isWin, isGameOver } from './logic.js';
import { loadBest, saveBest } from './persistence.js';

export function createGame() {
  const state = {
    board: newBoard(),
    score: 0,
    best: loadBest(),
    won: false,
    over: false,
  };

  function move(dir) {
    if (state.over) return false;
    const { board, moved, gained } = logicMove(state.board, dir);
    if (!moved) return false;

    state.board = spawn(board);
    state.score += gained;
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }
    if (!state.won && isWin(state.board)) state.won = true;
    if (isGameOver(state.board)) state.over = true;
    return true;
  }

  function reset() {
    state.board = newBoard();
    state.score = 0;
    state.best = loadBest();
    state.won = false;
    state.over = false;
  }

  return { state, move, reset };
}
