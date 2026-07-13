import pytest

from tempconv import convert


def test_freezing_c_to_f():
    assert convert(0, "C", "F") == 32


def test_boiling_c_to_f():
    assert convert(100, "C", "F") == 212


def test_freezing_c_to_k():
    assert convert(0, "C", "K") == 273.15


def test_freezing_f_to_c():
    assert convert(32, "F", "C") == 0


def test_identity_c_to_c():
    assert convert(37, "C", "C") == 37


def test_unknown_unit_raises():
    with pytest.raises(ValueError):
        convert(0, "C", "X")
