// Pole ui — wires engine + render + input into a mounted game (see game/CONTRACT.md).
import { createGame } from './engine.js';
import { renderBoard, renderScore } from './render.js';
import { bindInput } from './input.js';

// mountUI(root): builds DOM, wires input->engine->render, shows win/over overlay + restart.
export function mountUI(root) {
  root.innerHTML = `
    <div class="game">
      <header class="header">
        <h1>2048</h1>
        <div class="scores">
          <div class="scorebox">Score <span class="score">0</span></div>
          <div class="scorebox">Best <span class="best">0</span></div>
        </div>
      </header>
      <div class="board"></div>
      <div class="overlay hidden">
        <p class="overlay-msg"></p>
        <button class="restart" type="button">New Game</button>
      </div>
    </div>`;

  const boardEl = root.querySelector('.board');
  const scoresEl = root.querySelector('.scores');
  const overlayEl = root.querySelector('.overlay');
  const overlayMsg = root.querySelector('.overlay-msg');
  const restartBtn = root.querySelector('.restart');

  const game = createGame();

  function draw() {
    renderBoard(game.state.board, boardEl);
    renderScore(game.state.score, game.state.best, scoresEl);
    if (game.state.over) show('Game Over');
    else if (game.state.won) show('You Win!');
    else overlayEl.classList.add('hidden');
  }

  function show(msg) {
    overlayMsg.textContent = msg;
    overlayEl.classList.remove('hidden');
  }

  bindInput((dir) => {
    if (game.move(dir)) draw();
  });

  restartBtn.addEventListener('click', () => {
    game.reset();
    draw();
  });

  draw();
  return game;
}
