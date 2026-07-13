# tempconv

Temperature unit conversion between Celsius, Fahrenheit, and Kelvin — a small Python
library with a CLI.

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

## CLI usage

```bash
python -m tempconv.cli <value> <src> <dst>
```

Example — convert 100 °C to °F:

```bash
$ python -m tempconv.cli 100 C F
212.0
```

Units are `C`, `F`, `K` (case-insensitive). An unknown unit exits non-zero with an
`error:` message on stderr.

## API

```python
from tempconv import convert

convert(value: float, src: str, dst: str) -> float
```

Convert `value` from unit `src` to unit `dst`. Units are one of `"C"`, `"F"`, `"K"`
(case-insensitive). The result is rounded to 2 decimals. Raises `ValueError` on an
unknown unit.

```python
>>> convert(100, "C", "F")
212.0
>>> convert(0, "C", "K")
273.15
```
