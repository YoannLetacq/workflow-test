"""Round-1 conductor prep: astropy alt/az references for Sun, Moon, and planets —
the oracle the solar-system pole must reproduce. Uses astropy's builtin ephemeris
(no download)."""
import json
from pathlib import Path
from astropy.coordinates import EarthLocation, AltAz, get_body, get_sun
from astropy.time import Time
import astropy.units as u

ROOT = Path(__file__).resolve().parent.parent
TESTS = ROOT / "skysim" / "tests"

sites = [("Paris", 48.8566, 2.3522), ("Sydney", -33.8688, 151.2093), ("Quito", 0.0, -78.5)]
epochs = ["2024-03-20T21:00:00", "2024-09-23T03:00:00", "2024-12-21T18:00:00"]
bodies = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]

refs = []
for sname, lat, lon in sites:
    loc = EarthLocation(lat=lat * u.deg, lon=lon * u.deg, height=0 * u.m)
    for iso in epochs:
        t = Time(iso, scale="utc")
        aa = AltAz(obstime=t, location=loc)
        for body in bodies:
            c = (get_sun(t) if body == "sun" else get_body(body, t, loc)).transform_to(aa)
            refs.append({
                "body": body, "site": sname, "lat": lat, "lon": lon, "utc": iso + "Z",
                "alt_expected": round(float(c.alt.deg), 4),
                "az_expected": round(float(c.az.deg), 4),
            })
(TESTS / "refs-solar.json").write_text(json.dumps(refs, indent=1))
print(f"solar refs: {len(refs)} cases (Sun/Moon/5 planets x {len(sites)} sites x {len(epochs)} epochs) -> {TESTS/'refs-solar.json'}")
# sanity: the Sun should be BELOW the horizon at the chosen night epochs for at least some sites
sun_paris = [r for r in refs if r["body"] == "sun" and r["site"] == "Paris" and r["utc"].startswith("2024-12-21")][0]
print(f"sanity: Sun alt at Paris 2024-12-21 18:00Z = {sun_paris['alt_expected']} (winter evening, expect below horizon <0)")
moon = [r for r in refs if r["body"] == "moon"][0]
print(f"sanity: a Moon case alt={moon['alt_expected']} az={moon['az_expected']}")
