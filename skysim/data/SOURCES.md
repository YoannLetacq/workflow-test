# skysim data provenance

Every file in `skysim/data/` and the alt/az oracles in `skysim/tests/` are
third-party or derived data. This file records, per file: where it came from,
which upstream version, under what licence, and the exact command that
regenerates it. Nothing here is invented — the numbers below were verified
against upstream while writing this file (see "Verification" at the end).

## Upstream projects

### d3-celestial — Milky Way band and Messier catalog

- Project: <https://github.com/ofrohn/d3-celestial> (Olaf Frohn)
- Version: `0.7.35` (`package.json` on `master` at the time of writing)
- Licence: **BSD 3-Clause**, `Copyright (c) 2015, Olaf Frohn`
  (<https://github.com/ofrohn/d3-celestial/blob/master/LICENSE>) — confirmed,
  not inferred: the upstream `LICENSE` file and the `"license": "BSD-3-Clause"`
  field in upstream `package.json` agree.
- BSD-3-Clause requires the copyright notice and disclaimer be retained in
  redistributions. The line above carries the notice; the full text is at the
  URL above.

### HYG catalog — star catalog

- Project: <https://www.astronexus.com/hyg> (see the top-level `tools/prep_science.py`)
- Used by `data/stars.json`. Predates this round; unchanged here and its
  licence terms were **not** re-verified while writing this file.

### astropy — alt/az oracles

- Project: <https://www.astropy.org/>, version `8.0.1` (BSD 3-Clause)
- Used to generate the `tests/refs*.json` reference truth. Oracles only; no
  astropy code ships in the browser bundle.

## Per-file record

### `data/milkyway.json` — 534,254 bytes

- Upstream: `d3-celestial/data/mw.json`, **verbatim byte-for-byte copy**
  (renamed only). Upstream file last changed in commit `fc3f358ff33c`
  (2015-03-02).
- `sha256: aee221a7a0e879418e685de00c3e68fbdfac5667c0a8aab74929ef9cf4aab4fb`
- Content: GeoJSON `FeatureCollection`, 5 `MultiPolygon` brightness-outline
  layers `ol1`(broadest/faintest)..`ol5`(narrowest/brightest), 202 rings,
  30,676 vertices. Coordinates are `[lon, lat]` where `lat` = Dec and `lon` =
  RA folded into (-180, 180] — the same convention as `messier.json`.
- Regenerate:

  ```sh
  curl -sSfo skysim/data/milkyway.json \
    https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/mw.json
  ```

  There is no transform step, so there is no generator script for this file.
  `src/milkyway.selfcheck.mjs` re-asserts the layer count, the vertex count and
  the coordinate convention (nearest `ol1` vertex to the Galactic Center) after
  any refetch.

### `data/messier.json` — 12,767 bytes

- Upstream: `d3-celestial/data/messier.json`
  (`sha256: b576a9ef2ff1e3e81af49779c76ceecdf1e2f88b7bd7d21736fa9d590c9cb2b4`,
  21,568 bytes, last changed upstream in commit `083f1fb3b631`, 2016-07-17),
  **normalized** from GeoJSON Point features into a flat array of
  `{id, name, type, mag, ra_deg, dec_deg}` with `ra_deg` unfolded back to
  [0, 360). 110 objects, M1..M110, none missing.
- Regenerate:

  ```sh
  curl -sSfo skysim/tools/_work/messier.raw.json \
    https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/messier.json
  python3 skysim/tools/normalize_messier.py
  ```

### `tests/refs-messier.json` — astropy alt/az oracle

- Derived: not upstream data. 8 Messier objects x 3 UTC epochs from Paris
  (lat 48.8566, lon 2.3522, height 35 m), `AltAz` frame, `pressure=0 hPa`
  (no refraction — `equatorialToHorizontal` applies none either, so both sides
  share one physical model). 24 rows.
- Computed from the ra/dec in `data/messier.json`, which is what makes it an
  independent check of the shipped catalog rather than of itself
  (`tests/messier.test.mjs` asserts the two agree before using them).
- Regenerate (needs the astropy venv at the repo root):

  ```sh
  .venv/bin/python skysim/tools/gen_refs_messier.py
  ```

### `data/stars.json`, `data/constellations*.json`, `tests/refs.json`, `tests/refs-solar.json`

Predate this round. `data/stars.json` and `tests/refs.json` come from
`tools/prep_science.py` (HYG + astropy); `tests/refs-solar.json` from
`tools/prep_solar.py`. The constellation files' provenance is **not recorded
anywhere in this repo and is unconfirmed** — it was not established while
writing this file and should not be assumed to match d3-celestial.

## Verification

The claims above that were checked directly, rather than carried over from
notes:

- `data/milkyway.json` sha256 matches a fresh fetch of upstream
  `data/mw.json` on `master` — the file is unmodified upstream data.
- The upstream `LICENSE` file and upstream `package.json` `license` field both
  say BSD-3-Clause.
- Upstream last-touch commits for both data paths came from the GitHub commits
  API for those paths.

Anything above marked "unconfirmed" is exactly that: it was not verified, and
is flagged rather than guessed.
