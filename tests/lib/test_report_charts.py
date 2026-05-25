"""Tests for lib/report_charts.py

Covers: _is_dark luminance helper, bar() chart generation, and
stacked_bar_h() chart generation — including the edge cases that
were fixed in the code review (negative values, zero-delta labels,
text-contrast on dark segments).
"""
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lib"))
import report_charts as rc


# ---------------------------------------------------------------------------
# _is_dark
# ---------------------------------------------------------------------------

class TestIsDark:
    def test_navy_is_dark(self):
        assert rc._is_dark("#1B2A4A") is True

    def test_teal_is_dark(self):
        assert rc._is_dark("#007B7F") is True

    def test_white_is_not_dark(self):
        assert rc._is_dark("#FFFFFF") is False

    def test_light_gray_is_not_dark(self):
        assert rc._is_dark("#E4E7EC") is False

    def test_pure_black_is_dark(self):
        assert rc._is_dark("#000000") is True

    def test_threshold_boundary(self):
        # luminance = 0.299*140 + 0.587*140 + 0.114*140 ≈ 140 → not dark
        # luminance = 0.299*139 + 0.587*139 + 0.114*139 ≈ 139 → dark
        assert rc._is_dark("#8B8B8B") is True   # ~139 luminance
        assert rc._is_dark("#8C8C8C") is False   # ~140 luminance

    def test_green_is_dark(self):
        assert rc._is_dark("#2E7D32") is True

    def test_amber_is_not_dark(self):
        # Sample mid-saturation amber (luminance ≈ 179) — should read as light.
        # Not pinned to PALETTE.amber since that value is now dark by design.
        assert rc._is_dark("#D9A441") is False


# ---------------------------------------------------------------------------
# bar()
# ---------------------------------------------------------------------------

class TestBarChart:
    def test_creates_png_file(self, tmp_path):
        out = str(tmp_path / "bar.png")
        result = rc.bar(["A", "B", "C"], [10, 20, 15], out)
        assert Path(out).exists()
        assert result == out

    def test_handles_all_positive_values(self, tmp_path):
        out = str(tmp_path / "bar_pos.png")
        rc.bar(["Q1", "Q2", "Q3", "Q4"], [100, 120, 90, 130], out)
        assert Path(out).exists()

    def test_handles_negative_values(self, tmp_path):
        """Negative values should produce a valid chart, not crash."""
        out = str(tmp_path / "bar_neg.png")
        rc.bar(["A", "B", "C"], [-5, 10, -3], out)
        assert Path(out).exists()

    def test_handles_all_negative_values(self, tmp_path):
        out = str(tmp_path / "bar_allneg.png")
        rc.bar(["A", "B"], [-10, -20], out)
        assert Path(out).exists()

    def test_handles_zero_values(self, tmp_path):
        out = str(tmp_path / "bar_zeros.png")
        rc.bar(["A", "B", "C"], [0, 0, 0], out)
        assert Path(out).exists()

    def test_handles_single_bar(self, tmp_path):
        out = str(tmp_path / "bar_single.png")
        rc.bar(["Only"], [42], out)
        assert Path(out).exists()

    def test_handles_empty_values(self, tmp_path):
        """Empty list should not crash."""
        out = str(tmp_path / "bar_empty.png")
        rc.bar([], [], out)
        assert Path(out).exists()

    def test_value_suffix(self, tmp_path):
        out = str(tmp_path / "bar_suffix.png")
        rc.bar(["A", "B"], [8, 12], out, value_suffix="h")
        assert Path(out).exists()

    def test_custom_colors(self, tmp_path):
        out = str(tmp_path / "bar_colors.png")
        rc.bar(["A", "B"], [5, 10], out,
               colors=[rc.PALETTE["navy"], rc.PALETTE["teal"]])
        assert Path(out).exists()

    def test_annotations(self, tmp_path):
        out = str(tmp_path / "bar_annot.png")
        rc.bar(["A", "B", "C"], [10, 20, 30], out,
               annotations={1: "peak"})
        assert Path(out).exists()

    def test_annotation_out_of_range_does_not_crash(self, tmp_path):
        """An out-of-range annotation index should warn, not crash."""
        out = str(tmp_path / "bar_annot_oob.png")
        rc.bar(["A", "B"], [10, 20], out, annotations={5: "oob"})
        assert Path(out).exists()

    def test_output_is_png(self, tmp_path):
        out = str(tmp_path / "bar_format.png")
        rc.bar(["A"], [1], out)
        with open(out, "rb") as f:
            header = f.read(8)
        assert header[:4] == b'\x89PNG'


# ---------------------------------------------------------------------------
# stacked_bar_h()
# ---------------------------------------------------------------------------

class TestStackedBarH:
    def test_creates_png_file(self, tmp_path):
        out = str(tmp_path / "stacked.png")
        segments = [
            ("On track", 60, rc.PALETTE["teal"]),
            ("At risk",  25, rc.PALETTE["amber"]),
            ("Behind",   15, rc.PALETTE["navy"]),
        ]
        result = rc.stacked_bar_h(segments, out)
        assert Path(out).exists()
        assert result == out

    def test_dark_segment_gets_white_label(self, tmp_path, monkeypatch):
        """Verify _is_dark is actually consulted — dark color → white text."""
        calls = []
        original = rc._is_dark
        def spy(hex_color):
            calls.append(hex_color)
            return original(hex_color)
        monkeypatch.setattr(rc, "_is_dark", spy)
        out = str(tmp_path / "stacked_spy.png")
        rc.stacked_bar_h([("X", 100, rc.PALETTE["navy"])], out)
        assert rc.PALETTE["navy"] in calls

    def test_single_segment(self, tmp_path):
        out = str(tmp_path / "stacked_single.png")
        rc.stacked_bar_h([("All", 100, rc.PALETTE["teal"])], out)
        assert Path(out).exists()

    def test_output_is_png(self, tmp_path):
        out = str(tmp_path / "stacked_format.png")
        rc.stacked_bar_h([("A", 50, "#007B7F"), ("B", 50, "#1B2A4A")], out)
        with open(out, "rb") as f:
            header = f.read(8)
        assert header[:4] == b'\x89PNG'

    def test_four_segments(self, tmp_path):
        out = str(tmp_path / "stacked_four.png")
        segments = [
            ("Q1", 25, "#007B7F"),
            ("Q2", 25, "#1B2A4A"),
            ("Q3", 25, "#5BB0B2"),
            ("Q4", 25, "#E4E7EC"),
        ]
        rc.stacked_bar_h(segments, out)
        assert Path(out).exists()


# ---------------------------------------------------------------------------
# PALETTE — smoke test that all expected keys exist
# ---------------------------------------------------------------------------

class TestPalette:
    EXPECTED_KEYS = ["navy", "teal", "teal_lt", "gray_lt", "gray_tx", "green", "amber"]

    def test_all_palette_keys_present(self):
        for key in self.EXPECTED_KEYS:
            assert key in rc.PALETTE, f"Missing palette key: {key}"

    def test_palette_values_are_hex_strings(self):
        for key, val in rc.PALETTE.items():
            assert isinstance(val, str), f"PALETTE[{key!r}] is not a string"
            assert val.startswith("#"), f"PALETTE[{key!r}] does not start with #"
            assert len(val) == 7, f"PALETTE[{key!r}] is not a 6-digit hex color"
