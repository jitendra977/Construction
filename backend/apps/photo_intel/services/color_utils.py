"""
Small color helpers used by HeuristicAnalyzer — no external deps beyond Pillow.
"""
from __future__ import annotations

import colorsys
from collections import Counter
from typing import Dict, List


# Broad human-friendly color buckets (in HSV)
# Each bucket: (h_min, h_max, s_min, v_min, v_max, name)
_BUCKETS = [
    (0.00, 0.05, 0.35, 0.20, 1.00, "red"),
    (0.95, 1.00, 0.35, 0.20, 1.00, "red"),
    (0.05, 0.12, 0.35, 0.20, 1.00, "orange"),
    (0.12, 0.18, 0.25, 0.25, 1.00, "yellow"),
    (0.18, 0.45, 0.25, 0.20, 1.00, "green"),
    (0.45, 0.55, 0.25, 0.20, 1.00, "cyan"),
    (0.55, 0.72, 0.25, 0.20, 1.00, "blue"),
    (0.72, 0.90, 0.25, 0.20, 1.00, "purple"),
    (0.90, 0.95, 0.25, 0.20, 1.00, "pink"),
    # low-saturation buckets
    (0.00, 1.00, 0.00, 0.00, 0.20, "black"),
    (0.00, 1.00, 0.00, 0.80, 1.00, "white"),
    (0.00, 1.00, 0.00, 0.20, 0.50, "grey"),
    (0.02, 0.12, 0.10, 0.35, 0.75, "brown"),
    (0.08, 0.18, 0.10, 0.50, 0.90, "beige"),
]


def _classify_hsv(h: float, s: float, v: float) -> str:
    for h0, h1, s_min, v_min, v_max, name in _BUCKETS:
        if h0 <= h <= h1 and s >= s_min and v_min <= v <= v_max:
            return name
    return "grey"


def _downsample(img, size: int = 64):
    """Return (pixels, n) for a shrunk RGB image — cheap but representative."""
    small = img.resize((size, size))
    return list(small.getdata()), size * size


def hsv_histogram(img) -> Dict[str, float]:
    """
    Normalised histogram mapping bucket name → fraction of pixels (0..1).
    """
    pixels, n = _downsample(img)
    counts: Counter = Counter()
    for r, g, b in pixels:
        h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        counts[_classify_hsv(h, s, v)] += 1
    return {k: v / n for k, v in counts.items()}


def dominant_color_names(img, k: int = 3) -> List[str]:
    hist = hsv_histogram(img)
    ranked = sorted(hist.items(), key=lambda kv: kv[1], reverse=True)
    return [name for name, _ in ranked[:k]]
