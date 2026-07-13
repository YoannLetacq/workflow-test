// Self-check for persistence.js. Run: node src/persistence.selfcheck.mjs
import assert from 'node:assert';

// localStorage stub (node has none)
const backing = new Map();
globalThis.localStorage = {
  getItem: (k) => (backing.has(k) ? backing.get(k) : null),
  setItem: (k, v) => backing.set(k, String(v)),
};

const { loadBest, saveBest } = await import('./persistence.js');

// empty store -> 0
assert.strictEqual(loadBest(), 0, 'no stored best -> 0');

// round-trip
saveBest(1024);
assert.strictEqual(loadBest(), 1024, 'save then load');

// coerces to int
saveBest(2048.9);
assert.strictEqual(loadBest(), 2048, 'stored as int');

// missing localStorage -> graceful 0, no throw
delete globalThis.localStorage;
assert.strictEqual(loadBest(), 0, 'no localStorage -> 0');
assert.doesNotThrow(() => saveBest(500), 'saveBest no-throws without localStorage');

console.log('persistence.selfcheck: all assertions passed');
