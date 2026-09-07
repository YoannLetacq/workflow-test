"""Conductor prep R2: astropy alt/az oracle for 8 well-known Messier objects,
computed from the SHIPPED catalog (skysim/data/messier.json, produced by
normalize_messier.py). This cross-validates the RA/Dec normalization (a wrong
sign/fold would put objects absurdly off-sky) and doubles as the R2 test
oracle. Dev-time prep script, not shipped. Modeled on tools/prep_science.py.

Run:  .venv/bin/python skysim/tools/gen_refs_messier.py
"""
import json
from pathlib import Path

from astropy.coordinates import EarthLocation, SkyCoord, AltAz
from astropy.time import Time
import astropy.units as u

ROOT = Path(__file__).resolve().parents[2]
CATALOG_FILE = ROOT / "skysim" / "data" / "messier.json"
OUT_FILE = ROOT / "skysim" / "tests" / "refs-messier.json"

catalog = {r["id"]: r for r in json.loads(CATALOG_FILE.read_text())}

targets = ["M1", "M13", "M31", "M42", "M45", "M51", "M57", "M104"]
epochs = ["2026-07-13T23:00:00", "2026-01-15T22:00:00", "2026-04-01T03:00:00"]
site_name, lat, lon = "Paris", 48.8566, 2.3522

loc = EarthLocation(lat=lat * u.deg, lon=lon * u.deg, height=35 * u.m)
refs = []
for mid in targets:
    row = catalog[mid]
    ra, dec = row["ra_deg"], row["dec_deg"]
    for iso in epochs:
        t = Time(iso, scale="utc")
        aa = AltAz(obstime=t, location=loc, pressure=0 * u.hPa)
        c = SkyCoord(ra=ra * u.deg, dec=dec * u.deg, frame="icrs").transform_to(aa)
        refs.append({
            "id": mid,
            "name": row["name"],
            "ra_deg": ra,
            "dec_deg": dec,
            "site": site_name, "lat": lat, "lon": lon,
            "utc": iso + "Z",
            "alt_expected": round(float(c.alt.deg), 4),
            "az_expected": round(float(c.az.deg), 4),
        })

OUT_FILE.write_text(json.dumps(refs, indent=1))
print(f"refs: {len(refs)} astropy alt/az cases ({len(targets)} objects x {len(epochs)} epochs) "
      f"-> {OUT_FILE}")

for mid in ["M31", "M42"]:
    rows = [r for r in refs if r["id"] == mid]
    for r in rows:
        print(f"{mid} @ {r['utc']}: alt={r['alt_expected']:+.2f} az={r['az_expected']:.2f}")
