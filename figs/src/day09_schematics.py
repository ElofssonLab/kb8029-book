"""Schematic figure for Day 9: the architecture of Rost & Sander's PHD.

Run:  python3 book/figs/src/day09_schematics.py
Writes book/figs/day09-phd-architecture.png. Drawn from scratch from the
description in Rost & Sander (1993) J Mol Biol 232:584-599 and PNAS
90:7558-7562: profile input from a multiple sequence alignment, a
sequence-to-structure network, a structure-to-structure network, and a
jury that averages several independently trained networks.
"""
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle

OUT = Path(__file__).resolve().parents[1]
INK, MUTED = "#222222", "#8a8a8a"
BLUE, ORANGE, GREEN, PURPLE = "#2f6db5", "#d9822b", "#3c8d4f", "#7a4fb0"
SS_COL = {"H": "#c0392b", "E": "#2f6db5", "L": "#8a8a8a"}
plt.rcParams.update({"font.size": 10, "font.family": "DejaVu Sans"})


def arrow(ax, p, q, color=INK, lw=1.4):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=12, color=color, lw=lw))


def small_net(ax, x0, y0, n_in, n_hid, labels_out, w=1.6, h=1.6, color=ORANGE):
    xin, xh, xo = x0, x0 + w / 2, x0 + w
    yin = np.linspace(y0, y0 + h, n_in)
    yh = np.linspace(y0 + 0.2, y0 + h - 0.2, n_hid)
    yo = np.linspace(y0 + 0.35, y0 + h - 0.35, len(labels_out))
    for a in yin:
        for b in yh:
            ax.plot([xin, xh], [a, b], color=MUTED, lw=0.4, zorder=1)
    for a in yh:
        for b in yo:
            ax.plot([xh, xo], [a, b], color=MUTED, lw=0.4, zorder=1)
    for a in yin:
        ax.add_patch(Circle((xin, a), 0.05, fc="#dce8f6", ec=BLUE, lw=0.8, zorder=3))
    for a in yh:
        ax.add_patch(Circle((xh, a), 0.07, fc="#f6d9b8", ec=color, lw=1, zorder=3))
    for a, lab in zip(yo[::-1], labels_out):
        ax.add_patch(Circle((xo, a), 0.09, fc=SS_COL[lab], ec=INK, lw=0.8, zorder=3))
        ax.text(xo + 0.16, a, lab, va="center", fontsize=9, color=SS_COL[lab], weight="bold")
    return (xin, y0 + h / 2), (xo, y0 + h / 2)


def main():
    fig, ax = plt.subplots(figsize=(13, 5.2))
    ax.set_xlim(-0.3, 14.2)
    ax.set_ylim(-2.0, 3.9)
    ax.set_aspect("equal")
    ax.axis("off")

    # 1. multiple sequence alignment -> profile window
    rng = np.random.RandomState(0)
    aas = "ACDEFGHIKLMNPQRSTVWY"
    seqs = ["".join(rng.choice(list(aas), 11)) for _ in range(6)]
    for r, s in enumerate(seqs):
        for c, ch in enumerate(s):
            fc = "#f3e3a6" if 3 <= c <= 7 else "white"
            ax.add_patch(Rectangle((c * 0.22, 2.6 - r * 0.28), 0.22, 0.28, fc=fc, ec="#cccccc", lw=0.4))
            ax.text(c * 0.22 + 0.11, 2.74 - r * 0.28, ch, ha="center", va="center", fontsize=6.5, family="monospace")
    ax.add_patch(Rectangle((3 * 0.22, 2.6 - 5 * 0.28), 5 * 0.22, 6 * 0.28, fill=False, ec=ORANGE, lw=2))
    ax.text(1.2, 3.25, "Multiple sequence alignment\n(the protein + its homologs)", ha="center", fontsize=9)
    ax.text(1.2, 0.72, "window centred on\nresidue i", ha="center", fontsize=8.5, color=ORANGE)
    # profile matrix below
    prof = rng.dirichlet(np.ones(20) * 0.3, size=5).T
    ax.imshow(prof, extent=(0.66, 1.76, -1.3, 0.3), cmap="Greys", aspect="auto")
    ax.text(0.35, -0.5, "20\nfreq.", ha="center", va="center", fontsize=8)
    ax.text(1.21, -1.52, "profile (Day 5)", ha="center", fontsize=8.5, color=BLUE)
    arrow(ax, (1.21, 0.5), (1.21, 0.36), color=ORANGE)

    # 2. level 1 sequence-to-structure network
    i1, o1 = small_net(ax, 3.2, 0.0, 9, 5, ["H", "E", "L"])
    arrow(ax, (1.85, -0.5), (3.1, 0.8), color=BLUE)
    ax.text(4.0, 2.25, "Level 1: sequence-to-structure", ha="center", fontsize=10, weight="bold")
    ax.text(4.0, -0.55, "profile window -> hidden layer (Day 6)\n-> 3 outputs H / E / L (Day 8)",
            ha="center", va="top", fontsize=8.5)

    # 3. level 2 structure-to-structure network: input = window of level-1 outputs
    for k in range(7):
        for j, lab in enumerate("HEL"):
            ax.add_patch(Rectangle((6.35 + k * 0.17, 0.55 + j * 0.2), 0.17, 0.2,
                                   fc=SS_COL[lab], alpha=rng.uniform(0.15, 0.95), ec="white", lw=0.5))
    ax.text(6.95, 1.28, "level-1 outputs\nfor neighbours", ha="center", fontsize=8)
    arrow(ax, (o1[0] + 0.3, o1[1]), (6.3, 0.85))
    i2, o2 = small_net(ax, 7.9, 0.0, 7, 4, ["H", "E", "L"], w=1.4, color=PURPLE)
    arrow(ax, (7.58, 0.85), (7.85, 0.85))
    ax.text(8.2, 2.25, "Level 2: structure-to-structure", ha="center", fontsize=10, weight="bold")
    ax.text(8.6, -0.55, "smooths predictions:\nhelices and strands\nget realistic lengths",
            ha="center", va="top", fontsize=8.5)

    # 4. jury of several networks
    for k in range(4):
        ax.add_patch(FancyBboxPatch((10.35 + k * 0.12, 0.35 - k * 0.12), 1.0, 1.0,
                                    boxstyle="round,pad=0.02", fc="white", ec=INK, lw=1, zorder=2 + k))
    ax.text(10.99, 0.5, "net\n1..k", ha="center", va="center", fontsize=8.5, zorder=10)
    arrow(ax, (o2[0] + 0.3, o2[1]), (10.3, 0.85))
    ax.text(11.0, 2.25, "Level 3: jury", ha="center", fontsize=10, weight="bold")
    ax.text(11.0, -0.55, "average several\nindependently trained\nnetworks",
            ha="center", va="top", fontsize=8.5)

    # 5. output
    arrow(ax, (11.95, 0.85), (12.5, 0.85), color=GREEN, lw=2)
    ax.text(12.6, 1.15, "H / E / L\nfor residue i", va="center", fontsize=10, color=GREEN, weight="bold")
    ax.text(12.6, 0.3, "+ reliability index", va="center", fontsize=8.5, color=GREEN)
    ax.text(12.6, -0.3, "slide window to\nthe next residue", va="top", fontsize=8.5, color=MUTED)

    ax.text(7.0, -1.9, "Trained by backpropagation (Day 9); tested by cross-validation on sets purged of "
            "sequences similar to the training set (Day 8's homology partitioning).",
            ha="center", fontsize=9, color=INK, style="italic")
    fig.savefig(OUT / "day09-phd-architecture.png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("wrote", OUT / "day09-phd-architecture.png")


if __name__ == "__main__":
    main()
