"""Temperature conversion between Celsius, Fahrenheit, and Kelvin."""


def convert(value: float, src: str, dst: str) -> float:
    """Convert a temperature value from unit src to unit dst.

    Units are C/F/K, case-insensitive. Result is rounded to 2 decimals.
    Raises ValueError on an unknown unit.
    """
    s, d = src.strip().upper(), dst.strip().upper()
    if s not in ("C", "F", "K"):
        raise ValueError(f"unknown unit: {src!r}")
    if d not in ("C", "F", "K"):
        raise ValueError(f"unknown unit: {dst!r}")

    # Normalize to Celsius, then to target.
    if s == "F":
        celsius = (value - 32) * 5 / 9
    elif s == "K":
        celsius = value - 273.15
    else:
        celsius = value

    if d == "F":
        result = celsius * 9 / 5 + 32
    elif d == "K":
        result = celsius + 273.15
    else:
        result = celsius

    return round(result, 2)


if __name__ == "__main__":
    assert convert(0, "C", "F") == 32, convert(0, "C", "F")
    assert convert(100, "C", "F") == 212, convert(100, "C", "F")
    assert convert(0, "C", "K") == 273.15, convert(0, "C", "K")
    print("core self-check OK")
