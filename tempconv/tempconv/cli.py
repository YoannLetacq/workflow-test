"""CLI: python -m tempconv.cli <value> <src> <dst>."""

import argparse
import sys

from tempconv.core import convert


def main(argv=None):
    p = argparse.ArgumentParser(prog="tempconv.cli", description="Convert a temperature value between C/F/K.")
    p.add_argument("value", type=float, help="temperature value")
    p.add_argument("src", help="source unit (C/F/K)")
    p.add_argument("dst", help="destination unit (C/F/K)")
    args = p.parse_args(argv)

    try:
        print(convert(args.value, args.src, args.dst))
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
