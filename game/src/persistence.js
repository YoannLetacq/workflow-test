// Pole persistence: best-score storage via localStorage.
// Contract: loadBest() -> int, saveBest(score:int).
const KEY = 'best-2048';

// ponytail: optional-chaining guard covers node (no localStorage) and privacy-mode throws.
function store() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadBest() {
  try {
    return parseInt(store()?.getItem(KEY), 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    store()?.setItem(KEY, String(score | 0));
  } catch {
    // storage unavailable/full — best score is non-critical, ignore.
  }
}
