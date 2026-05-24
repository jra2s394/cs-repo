"""
report_charts.py  —  Slabstack CS report chart helpers
---------------------------------------------------------------------------
Matplotlib chart functions that match the report theme (navy/teal palette,
transparent background, no chart junk). Reports call these to produce PNGs,
then embed them with report-theme.js `chartImage()` / `centeredImage()`.

    from report_charts import bar, stacked_bar_h, PALETTE
    bar(["2024", "2025", "2026"], [14.2, 10.1, 8.8],
        "assets/speed.png", value_suffix="h")

Requires:  pip install matplotlib pillow
---------------------------------------------------------------------------
"""
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

# Brand palette — keep in sync with COLORS in report-theme.js
PALETTE = {
    "navy":    "#1B2A4A",
    "teal":    "#007B7F",
    "teal_lt": "#5BB0B2",
    "gray_lt": "#E4E7EC",
    "gray_tx": "#5A6472",
    "green":   "#2E7D32",
    "amber":   "#D9A441",
}

_BASE_RC = {
    "font.family": "DejaVu Sans",
    "font.size": 11,
    "axes.edgecolor": "#CFD4DC",
    "axes.labelcolor": PALETTE["gray_tx"],
    "xtick.color": PALETTE["gray_tx"],
    "ytick.color": PALETTE["gray_tx"],
    "text.color": PALETTE["navy"],
}


def _apply_rc():
    plt.rcParams.update(_BASE_RC)


def _is_dark(hex_color: str) -> bool:
    """Return True if the hex colour is dark enough to require white label text."""
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) < 140


def bar(labels, values, out_path, colors=None, value_suffix="",
        figsize=(7.0, 3.0), annotations=None, dpi=200):
    """Vertical bar chart, transparent background, value labels on top.

    labels       : list[str]   — x-axis categories
    values       : list[float] — bar heights
    out_path     : str         — PNG output path
    colors       : list[str]   — per-bar colours (defaults to teal/navy mix)
    value_suffix : str         — appended to each value label (e.g. "h", "%")
    annotations  : dict {index: "note"} — small italic note above a bar
    """
    _apply_rc()
    if colors is None:
        colors = [PALETTE["teal"]] * len(values)
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    bars = ax.bar(labels, values, color=colors, width=0.62, zorder=3)

    if values:
        hi, lo = max(values), min(values)
        span = hi if hi > 0 else abs(lo) if lo < 0 else 1
        y_min = min(0, lo) - span * 0.05
        y_max = max(0, hi) + span * 0.22
    else:
        span, y_min, y_max = 1, 0, 1.22

    for b, v in zip(bars, values):
        if v >= 0:
            ax.text(b.get_x() + b.get_width() / 2, v + span * 0.03,
                    f"{v}{value_suffix}", ha="center", va="bottom",
                    fontsize=10.5, fontweight="bold", color=PALETTE["navy"])
        else:
            ax.text(b.get_x() + b.get_width() / 2, v - span * 0.03,
                    f"{v}{value_suffix}", ha="center", va="top",
                    fontsize=10.5, fontweight="bold", color=PALETTE["navy"])
    if annotations:
        for idx, note in annotations.items():
            if not isinstance(idx, int) or not (0 <= idx < len(values)):
                print(f"Warning: annotation index {idx} out of range, skipping", file=sys.stderr)
                continue
            ax.text(idx, values[idx] + span * 0.11, note, ha="center",
                    fontsize=8.5, style="italic", color=PALETTE["gray_tx"])
    ax.set_ylim(y_min, y_max)
    ax.set_yticks([])
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.spines["bottom"].set_color("#CFD4DC")
    ax.tick_params(axis="x", length=0, labelsize=10)
    ax.margins(x=0.04)
    plt.tight_layout(pad=0.4)
    plt.savefig(out_path, transparent=True, bbox_inches="tight")
    plt.close()
    return out_path


def stacked_bar_h(segments, out_path, figsize=(7.4, 1.15), dpi=200):
    """Single horizontal stacked bar — good for distributions.

    segments : list[(label, value, color)]   — values should sum to 100
    """
    _apply_rc()
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    left = 0
    for label, val, color in segments:
        ax.barh(0, val, left=left, color=color, height=0.62, zorder=3)
        txt = "white" if _is_dark(color) else PALETTE["navy"]
        ax.text(left + val / 2, 0, f"{val}%", ha="center", va="center",
                fontsize=10, fontweight="bold", color=txt)
        ax.text(left + val / 2, -0.62, label, ha="center", va="center",
                fontsize=8.5, color=PALETTE["gray_tx"])
        left += val
    ax.set_xlim(0, 100)
    ax.set_ylim(-1.0, 0.5)
    ax.axis("off")
    plt.tight_layout(pad=0.2)
    plt.savefig(out_path, transparent=True, bbox_inches="tight")
    plt.close()
    return out_path
