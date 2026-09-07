# skysim

A scientifically-accurate, Stellarium-like night sky in the browser — stars only,
no libraries beyond three.js (loaded from a CDN via import map).

## What it is

skysim renders the real naked-eye sky for a given location and moment in time.
The 5070 stars come from the [HYG catalog](https://www.astronexus.com/hyg)
(magnitude ≤ 6). For each star it computes horizontal coordinates (altitude/azimuth)
from its J2000 ICRS right ascension/declination using:

- **Local sidereal time** derived from the UTC Julian date (GMST → LST).
- **Equatorial precession** from J2000 to the date of observation (Meeus, ch. 21).

Stars are sized by magnitude (brighter = bigger) and colored from their B–V color
index. Azimuth follows the astronomical convention: measured from **North**,
increasing **Eastward** (0° = N, 90° = E, 180° = S, 270° = W).

## Accuracy

The astronomy core (`src/astro.js`) is verified against [astropy](https://www.astropy.org/):
`equatorialToHorizontal` reproduces the alt/az truth in `tests/refs.json` to
within **<0.01°** measured (worst-case ≈0.0085°, gated at 0.02°). Tests also
check the Polaris-altitude ≈ observer-latitude sanity case and that the star
catalog loads.

The solar-system core (`src/solar.js`) is verified against astropy's Sun/Moon/
planet ephemeris in `tests/refs-solar.json`: alt/az reproduce truth to within
**≈0.036°** worst-case (gated at 0.05°).

## Run it

It's a static ES-module app — serve the repo root over HTTP and open the app path:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/skysim/>.

> Opening `index.html` directly via `file://` will not work — ES modules and the
> `fetch` of `data/stars.json` require an HTTP origin.

## Controls

- **Drag** (mouse or one finger) — look around (azimuth / altitude).
- **Wheel** (or two-finger pinch) — zoom the field of view.
- On-screen inputs let you set **latitude / longitude** and **date / time**
  (with a few city presets), and show an FOV / LST / time HUD plus info on the
  selected star.

## Tests

```sh
node --test skysim/tests/
```

## Data

- `data/stars.json` — `[{ ra:deg, dec:deg (J2000 ICRS), mag, ci:B-V|null, name }]`
- `tests/refs.json` — astropy alt/az reference truth
- `data/messier.json`, `data/milkyway.json` — deep-sky catalog and Milky Way band

Upstream project, version, licence and the exact regeneration command for each
data file are recorded in [`data/SOURCES.md`](data/SOURCES.md); the generators
live in `tools/`. `data/stars.json` and `tests/refs.json` are provided as-is —
do not regenerate them.
