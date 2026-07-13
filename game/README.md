# 2048

A vanilla-JS implementation of the 2048 puzzle game, no build step, no dependencies.

## How to play

- Use the **arrow keys** (or **swipe** on touch devices) to slide all tiles in a direction.
- Tiles with the same number merge into one when they collide.
- A new tile (2 or 4) appears after each valid move.
- **Goal**: reach a tile worth **2048**. The game ends when no more moves are possible.

## How to run

The game is served as ES modules, which most browsers block over `file://`. Serve the folder over HTTP instead:

```bash
python3 -m http.server --directory game
```

Then open `http://localhost:8000/index.html` in a browser.

## How to test

Tests use Node's built-in test runner (`node:test`):

```bash
node --test game/tests/logic.test.mjs
```

Run this from the repo root. Note: `node --test game/tests/` (directory form) does not resolve module imports correctly on this project; use the explicit file path above.

## Module layout

- `src/logic.js` — pure game logic (grid moves, merges, win/lose checks)
- `src/engine.js` — game state/turn orchestration on top of logic
- `src/render.js` — DOM rendering of the grid
- `src/input.js` — keyboard and swipe input handling
- `src/ui.js` — wires everything together, exports `mountUI`
- `src/persistence.js` — save/load game state (e.g. localStorage)
- `src/styles.css` — styling
- `index.html` — entry point, loads `src/ui.js` and calls `mountUI`
