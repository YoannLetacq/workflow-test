"""Conductor prep: build the star-catalog subset from HYG + astropy alt/az reference
fixtures. These are the scientific ground truth the pipeline builds against and the
tests verify. NOT part of the shipped app (dev-time oracle)."""
import csv, json, sys
from pathlib import Path

HYG = Path("/tmp/hyg.csv")
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "skysim" / "data"
TESTS = ROOT / "skysim" / "tests"
DATA.mkdir(parents=True, exist_ok=True)
TESTS.mkdir(parents=True, exist_ok=True)

# --- 1) catalog subset: naked-eye stars (mag <= 6.0) ---
stars = []
with open(HYG, newline="") as f:
    for row in csv.DictReader(f):
        try:
            mag = float(row["mag"])
        except (ValueError, KeyError):
            continue
        if mag > 6.0 or not row["ra"] or not row["dec"]:
            continue
        if row["id"] == "0":  # HYG row 0 is the Sun; exclude from the star field
            continue
        name = row.get("proper") or row.get("bf") or (("HIP" + row["hip"]) if row.get("hip") else "")
        ci = row.get("ci") or ""
        stars.append({
            "ra": round(float(row["ra"]) * 15.0, 6),   # HYG ra is in HOURS -> degrees
            "dec": round(float(row["dec"]), 6),
            "mag": round(mag, 3),
            "ci": float(ci) if ci not in ("", None) else None,
            "name": name,
        })
stars.sort(key=lambda s: s["mag"])
(DATA / "stars.json").write_text(json.dumps(stars, separators=(",", ":")))
print(f"catalog: {len(stars)} stars (mag<=6.0) -> {DATA/'stars.json'}")

# --- 2) astropy alt/az reference fixtures (the accuracy oracle) ---
from astropy.coordinates import EarthLocation, SkyCoord, AltAz
from astropy.time import Time
import astropy.units as u

# (name, ra_deg, dec_deg) — J2000 ICRS from HYG for a few well-known stars
targets = {
    "Polaris":     (37.954561, 89.264109),
    "Sirius":      (101.287155, -16.716116),
    "Vega":        (279.234735, 38.783689),
    "Betelgeuse":  (88.792939, 7.407064),
    "Arcturus":    (213.915300, 19.182410),
}
sites = [
    ("Paris",   48.8566,   2.3522),
    ("Sydney", -33.8688, 151.2093),
    ("Quito",    0.0000, -78.5000),
]
epochs = ["2024-03-20T21:00:00", "2024-09-23T03:00:00"]

refs = []
for sname, lat, lon in sites:
    loc = EarthLocation(lat=lat * u.deg, lon=lon * u.deg, height=0 * u.m)
    for iso in epochs:
        t = Time(iso, scale="utc")
        aa = AltAz(obstime=t, location=loc)
        for tname, (ra, dec) in targets.items():
            c = SkyCoord(ra=ra * u.deg, dec=dec * u.deg, frame="icrs").transform_to(aa)
            refs.append({
                "star": tname, "ra": ra, "dec": dec,
                "site": sname, "lat": lat, "lon": lon, "utc": iso + "Z",
                "alt_expected": round(float(c.alt.deg), 4),
                "az_expected": round(float(c.az.deg), 4),
            })
(TESTS / "refs.json").write_text(json.dumps(refs, indent=1))
print(f"refs: {len(refs)} astropy alt/az cases -> {TESTS/'refs.json'}")
# sanity: Polaris altitude ~ observer latitude (northern sites)
pol_paris = [r for r in refs if r["star"] == "Polaris" and r["site"] == "Paris"][0]
print(f"sanity: Polaris alt at Paris = {pol_paris['alt_expected']} (lat 48.86, expect ~48-49)")
