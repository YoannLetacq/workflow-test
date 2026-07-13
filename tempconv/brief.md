# Brief — tempconv (temperature converter: library + CLI + tests + docs)
Shared contract (fixed): tempconv/core.py exposes `convert(value: float, src: str, dst: str) -> float`
where units are one of "C","F","K" (case-insensitive), result rounded to 2 decimals; unknown unit raises ValueError.
Deliver: library + CLI + green pytest + README, committed. Use the venv at tempconv/.venv.
