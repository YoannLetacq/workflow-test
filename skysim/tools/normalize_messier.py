"""Normalize d3-celestial messier.json GeoJSON into a flat [{id, name, type,
mag, ra_deg, dec_deg}] catalog. Convention verified against M31 (RA 10.68deg,
Dec +41.27deg): the GeoJSON stores [lon, lat] where lon is RA in degrees
folded into (-180, 180] (i.e. subtract 360 when RA > 180deg); lat is Dec
unchanged. Dev-time prep script, not shipped.

Fetch the input first (see skysim/data/SOURCES.md):
    curl -sSfo skysim/tools/_work/messier.raw.json \
      https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/messier.json
Then:  python3 skysim/tools/normalize_messier.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "skysim" / "tools" / "_work" / "messier.raw.json"
OUT_FILE = ROOT / "skysim" / "data" / "messier.json"

raw = json.loads(RAW.read_text())
feats = raw["features"]

norm = []
for f in feats:
    lon, lat = f["geometry"]["coordinates"]
    ra_deg = lon if lon >= 0 else lon + 360.0
    props = f["properties"]
    name = props.get("alt") or props.get("desig") or props.get("name")
    norm.append({
        "id": f["id"],
        "name": name,
        "type": props.get("type"),
        "mag": props.get("mag"),
        "ra_deg": round(ra_deg, 4),
        "dec_deg": round(lat, 4),
    })

norm.sort(key=lambda r: int(r["id"][1:]))
OUT_FILE.write_text(json.dumps(norm, indent=1))

ids = sorted(int(r["id"][1:]) for r in norm)
missing = [i for i in range(1, 111) if i not in ids]
print(f"normalized: {len(norm)} objects -> {OUT_FILE}")
print(f"missing M numbers: {missing}")

# spot check M31 against task-given reference (RA 10.68, Dec +41.27)
m31 = next(r for r in norm if r["id"] == "M31")
print(f"M31 check: ra={m31['ra_deg']} (expect ~10.68), dec={m31['dec_deg']} (expect ~41.27)")
