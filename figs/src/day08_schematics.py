"""Schematic (non-data) figures for Day 8.

Run from anywhere:  python3 book/figs/src/day08_schematics.py
Writes day08-neuron-to-network.png, day08-connectivity.png and
day08-architectures.png into book/figs/. All three are drawn from scratch
here (no third-party artwork), so they carry the book's own license.
"""
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle

OUT = Path(__file__).resolve().parents[1]

INK = "#222222"
MUTED = "#8a8a8a"
BLUE = "#2f6db5"      # inputs / dendrites
ORANGE = "#d9822b"    # summation / soma
GREEN = "#3c8d4f"     # output / axon
PURPLE = "#7a4fb0"
RED = "#c0392b"

plt.rcParams.update({"font.size": 10, "font.family": "DejaVu Sans"})


def arrow(ax, p, q, color=INK, lw=1.2, style="-|>", ms=10, **kw):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle=style, mutation_scale=ms,
                                 color=color, lw=lw, shrinkA=0, shrinkB=0, **kw))


def node(ax, xy, r=0.09, fc="white", ec=INK, lw=1.2, z=3):
    ax.add_patch(Circle(xy, r, fc=fc, ec=ec, lw=lw, zorder=z))


# ---------------------------------------------------------------------------
# 1. Biological neuron / network  vs.  artificial neuron / network
# ---------------------------------------------------------------------------
def branch(ax, start, angle, length, depth, color, lw, rng):
    if depth == 0 or length < 0.05:
        return
    end = (start[0] + length * np.cos(angle), start[1] + length * np.sin(angle))
    ax.plot([start[0], end[0]], [start[1], end[1]], color=color, lw=lw,
            solid_capstyle="round", zorder=2)
    for d in (-1, 1):
        branch(ax, end, angle + d * rng.uniform(0.35, 0.6), length * 0.65,
               depth - 1, color, lw * 0.7, rng)


def draw_bio_neuron(ax):
    rng = np.random.RandomState(3)
    soma = (0.0, 0.0)
    for ang in np.deg2rad([120, 150, 180, 210, 240]):
        s = (0.28 * np.cos(ang), 0.28 * np.sin(ang))
        branch(ax, s, ang, 0.55, 3, BLUE, 3.0, rng)
    ax.add_patch(Circle(soma, 0.32, fc="#f6d9b8", ec=ORANGE, lw=2, zorder=3))
    ax.add_patch(Circle((0.05, 0.03), 0.1, fc="#e0a86a", ec="none", zorder=4))
    # axon with myelin segments and terminals
    ax.plot([0.32, 2.3], [0, 0], color=GREEN, lw=3, zorder=2)
    for x in np.arange(0.55, 2.1, 0.42):
        ax.add_patch(FancyBboxPatch((x, -0.07), 0.3, 0.14,
                                    boxstyle="round,pad=0.0,rounding_size=0.07",
                                    fc="#cfe6d3", ec=GREEN, lw=1, zorder=3))
    for ang in np.deg2rad([-35, 0, 35]):
        e = (2.3 + 0.35 * np.cos(ang), 0.35 * np.sin(ang))
        ax.plot([2.3, e[0]], [0, e[1]], color=GREEN, lw=2)
        ax.add_patch(Circle(e, 0.05, fc=GREEN, ec="none", zorder=3))
    ax.text(-1.9, 0.0, "dendrites\n(collect\ninputs)", color=BLUE, ha="center", va="center", fontsize=9)
    ax.text(0.45, -0.75, "cell body\n(sums potentials)", color=ORANGE, ha="left", fontsize=9)
    ax.text(1.35, 0.25, "axon (fires if sum > threshold)", color=GREEN, ha="center", fontsize=9)
    ax.text(2.55, -0.62, "synapses to\nnext neurons", color=GREEN, ha="center", fontsize=9)
    ax.set_xlim(-2.4, 3.0)
    ax.set_ylim(-1.35, 1.35)


def draw_art_neuron(ax):
    ys = [0.9, 0.3, -0.3, -0.9]
    labels = ["$x_1$", "$x_2$", "$x_3$", "$x_n$"]
    ws = ["$w_1$", "$w_2$", "$w_3$", "$w_n$"]
    for y, lab, w in zip(ys, labels, ws):
        node(ax, (-1.2, y), 0.14, fc="#dce8f6", ec=BLUE)
        ax.text(-1.2, y, lab, ha="center", va="center", fontsize=9)
        arrow(ax, (-1.05, y), (-0.27, y * 0.25), color=BLUE)
        ax.text(-0.7, y * 0.62 + 0.1, w, color=BLUE, fontsize=9, ha="center")
    ax.text(-1.2, -0.62, r"$\vdots$", ha="center", fontsize=10)
    node(ax, (0, 0), 0.28, fc="#f6d9b8", ec=ORANGE, lw=2)
    ax.text(0, 0, r"$\Sigma$", ha="center", va="center", fontsize=15)
    ax.text(0, -0.5, r"$z=\sum_i w_i x_i + b$", ha="center", fontsize=9, color=ORANGE)
    ax.add_patch(Rectangle((0.6, -0.25), 0.6, 0.5, fc="white", ec=INK, lw=1.2))
    xx = np.linspace(-1, 1, 50)
    ax.plot(0.62 + 0.28 * (xx + 1), 0.2 * np.tanh(3 * xx), color=INK, lw=1.3)
    ax.text(0.9, -0.45, "activation $f$", ha="center", fontsize=9)
    arrow(ax, (0.28, 0), (0.6, 0))
    arrow(ax, (1.2, 0), (1.8, 0), color=GREEN, lw=2)
    ax.text(1.95, 0, r"$y=f(z)$", va="center", color=GREEN, fontsize=10)
    ax.set_xlim(-2.4, 3.0)
    ax.set_ylim(-1.35, 1.35)


def draw_bio_network(ax):
    rng = np.random.RandomState(7)
    pts = rng.uniform([0, 0], [3, 2], (14, 2))
    edges = set()
    for i in range(len(pts)):
        d = np.linalg.norm(pts - pts[i], axis=1)
        for j in np.argsort(d)[1:4]:
            edges.add((i, int(j)))
    for i, j in edges:
        inhib = rng.rand() < 0.25
        arrow(ax, pts[i], pts[j], color=RED if inhib else MUTED, lw=1.0,
              style="-|>" if not inhib else "-[", ms=7,
              connectionstyle="arc3,rad=0.15")
    for p in pts:
        ax.add_patch(Circle(p, 0.09, fc="#f6d9b8", ec=ORANGE, lw=1.2, zorder=3))
    ax.text(1.5, -0.35, "sparse, recurrent (loops), excitatory (grey) and inhibitory (red)",
            ha="center", fontsize=8.5, color=INK)
    ax.set_xlim(-0.3, 3.3)
    ax.set_ylim(-0.6, 2.2)


def draw_ff_network(ax):
    layers = [4, 5, 3]
    xs = [0.3, 1.5, 2.7]
    pos = []
    for x, n in zip(xs, layers):
        ys = np.linspace(0.2, 1.8, n) if n > 1 else [1.0]
        pos.append([(x, y) for y in ys])
    for a, b in zip(pos[:-1], pos[1:]):
        for p in a:
            for q in b:
                ax.plot([p[0], q[0]], [p[1], q[1]], color=MUTED, lw=0.8, zorder=1)
    cols = [("#dce8f6", BLUE), ("#f6d9b8", ORANGE), ("#cfe6d3", GREEN)]
    for layer, (fc, ec) in zip(pos, cols):
        for p in layer:
            node(ax, p, 0.11, fc=fc, ec=ec)
    for x, lab in zip(xs, ["input", "hidden", "output"]):
        ax.text(x, 2.05, lab, ha="center", fontsize=9)
    ax.text(1.5, -0.35, "layered, one direction only, every unit in a layer\nconnected to every unit in the next",
            ha="center", fontsize=8.5)
    ax.set_xlim(-0.3, 3.3)
    ax.set_ylim(-0.6, 2.2)


def fig_neuron_to_network():
    fig, axes = plt.subplots(2, 2, figsize=(11, 6.4),
                             gridspec_kw={"width_ratios": [1.25, 1]})
    draw_bio_neuron(axes[0, 0])
    draw_bio_network(axes[0, 1])
    draw_art_neuron(axes[1, 0])
    draw_ff_network(axes[1, 1])
    titles = ["A biological neuron", "A biological network",
              "An artificial neuron (Day 6's perceptron, smooth $f$)",
              "An artificial feed-forward network (Days 8-9)"]
    for ax, t in zip(axes.flat, titles):
        ax.set_title(t, fontsize=11, loc="left")
        ax.set_aspect("equal")
        ax.axis("off")
    fig.text(0.015, 0.73, "Biology", rotation=90, fontsize=12, color=MUTED, va="center")
    fig.text(0.015, 0.27, "Model", rotation=90, fontsize=12, color=MUTED, va="center")
    fig.tight_layout(rect=(0.03, 0, 1, 1))
    fig.savefig(OUT / "day08-neuron-to-network.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 2. Connectivity: fully connected vs. sparse vs. local + shared
# ---------------------------------------------------------------------------
def fig_connectivity():
    fig, axes = plt.subplots(1, 3, figsize=(11, 3.6))
    n_in, n_out = 7, 5
    xin, xout = 0.0, 1.6
    yin = np.linspace(0, 3, n_in)
    yout = np.linspace(0.3, 2.7, n_out)
    rng = np.random.RandomState(2)
    sparse_mask = rng.rand(n_out, n_in) < 0.3
    sparse_mask[np.arange(n_out), rng.randint(0, n_in, n_out)] = True
    kernel_cols = [BLUE, ORANGE, GREEN]
    specs = [
        ("Fully connected", lambda j, i: True, None),
        ("Sparsely connected", lambda j, i: sparse_mask[j, i], None),
        ("Local + shared weights", lambda j, i: 0 <= i - j <= 2, kernel_cols),
    ]
    for ax, (title, conn, kcols) in zip(axes, specs):
        count = 0
        for j, yo in enumerate(yout):
            for i, yi in enumerate(yin):
                if conn(j, i):
                    count += 1
                    color = kcols[i - j] if kcols else MUTED
                    ax.plot([xin, xout], [yi, yo], color=color, lw=1.2 if kcols else 0.9, zorder=1)
        for y in yin:
            node(ax, (xin, y), 0.11, fc="#dce8f6", ec=BLUE)
        for y in yout:
            node(ax, (xout, y), 0.11, fc="#f6d9b8", ec=ORANGE)
        n_params = 3 if kcols else count
        sub = (f"{count} connections, {n_params} distinct weights"
               if kcols else f"{count} connections = {count} weights")
        ax.set_title(title, fontsize=11)
        ax.text(0.8, -0.55, sub, ha="center", fontsize=9)
        ax.set_xlim(-0.4, 2.0)
        ax.set_ylim(-0.8, 3.3)
        ax.set_aspect("equal")
        ax.axis("off")
    axes[0].text(0.8, -1.0, "Days 8-9: nn.Linear", ha="center", fontsize=9, color=MUTED)
    axes[1].text(0.8, -1.0, "closer to real brains", ha="center", fontsize=9, color=MUTED)
    axes[2].text(0.8, -1.0, "Day 10: convolution (same 3 colours reused)", ha="center",
                 fontsize=9, color=MUTED)
    fig.tight_layout()
    fig.savefig(OUT / "day08-connectivity.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 3. Architecture roadmap for the rest of the course
# ---------------------------------------------------------------------------
def mini_mlp(ax):
    xs, ns = [0.2, 0.8, 1.4, 2.0], [4, 5, 5, 2]
    pos = [[(x, y) for y in np.linspace(0.3, 1.7, n)] for x, n in zip(xs, ns)]
    for a, b in zip(pos[:-1], pos[1:]):
        for p in a:
            for q in b:
                ax.plot(*zip(p, q), color=MUTED, lw=0.5, zorder=1)
    for layer in pos:
        for p in layer:
            node(ax, p, 0.07)


def mini_cnn(ax):
    rng = np.random.RandomState(0)
    ax.imshow(rng.rand(8, 8), extent=(0.1, 1.1, 0.5, 1.5), cmap="Greys", alpha=0.7)
    ax.add_patch(Rectangle((0.35, 0.87), 0.375, 0.375, fill=False, ec=ORANGE, lw=2))
    for k, x in enumerate([1.35, 1.5, 1.65]):
        ax.add_patch(Rectangle((x, 0.6 + 0.05 * k), 0.5, 0.75, fc="white", ec=INK, lw=0.9))
    arrow(ax, (0.73, 1.06), (1.4, 1.0), color=ORANGE)


def mini_rnn(ax):
    xs = [0.3, 0.9, 1.5, 2.1]
    for i, x in enumerate(xs):
        ax.add_patch(Rectangle((x - 0.17, 0.85), 0.34, 0.34, fc="#f6d9b8", ec=ORANGE))
        node(ax, (x, 0.35), 0.1, fc="#dce8f6", ec=BLUE)
        arrow(ax, (x, 0.45), (x, 0.85), color=BLUE)
        arrow(ax, (x, 1.19), (x, 1.6), color=GREEN)
        if i < len(xs) - 1:
            arrow(ax, (x + 0.17, 1.02), (xs[i + 1] - 0.17, 1.02), color=ORANGE)
        ax.text(x, 0.08, "MKVL"[i], ha="center", fontsize=9, family="monospace")


def mini_transformer(ax):
    toks = "MKVLA"
    xs = np.linspace(0.2, 2.0, len(toks))
    rng = np.random.RandomState(4)
    for i, xi in enumerate(xs):
        for j, xj in enumerate(xs):
            w = rng.rand() ** 2
            if i != j:
                ax.add_patch(FancyArrowPatch((xi, 0.45), (xj, 1.45), arrowstyle="-",
                                             lw=0.4 + 2.5 * w, color=PURPLE, alpha=0.25 + 0.6 * w,
                                             connectionstyle="arc3,rad=0.0"))
    for x, t in zip(xs, toks):
        node(ax, (x, 0.4), 0.1, fc="#dce8f6", ec=BLUE)
        node(ax, (x, 1.5), 0.1, fc="#f6d9b8", ec=ORANGE)
        ax.text(x, 0.1, t, ha="center", fontsize=9, family="monospace")


def mini_diffusion(ax):
    rng = np.random.RandomState(1)
    t = np.linspace(0, 2 * np.pi, 30)
    clean = np.c_[np.cos(t), np.sin(2 * t) * 0.5]
    for k, (x0, s) in enumerate([(0.35, 0.0), (1.1, 0.12), (1.85, 0.3)]):
        p = clean * 0.28 + rng.normal(0, s * 0.28, clean.shape)
        p = np.clip(p, -0.4, 0.4)
        ax.plot(x0 + p[:, 0], 1.0 + p[:, 1], "-o", ms=2, lw=0.8, color=GREEN if k == 0 else MUTED)
    arrow(ax, (1.65, 0.45), (0.55, 0.45), color=GREEN)
    ax.text(1.1, 0.2, "learn to remove noise", ha="center", fontsize=8)


def fig_architectures():
    specs = [
        (mini_mlp, "Feed-forward (MLP)", "Days 8-9",
         "fixed-size input\ne.g. localization, PHD"),
        (mini_cnn, "Convolutional (CNN)", "Day 10",
         "local patterns, shared weights\ne.g. contact maps"),
        (mini_rnn, "Recurrent (RNN/LSTM)", "Day 11",
         "reads a sequence in order\ne.g. signal peptides"),
        (mini_transformer, "Attention / Transformer", "Day 12",
         "every position looks at every other\ne.g. ESM, AlphaFold"),
        (mini_diffusion, "Generative (diffusion)", "Day 13",
         "generates new examples\ne.g. RFdiffusion design"),
    ]
    fig, axes = plt.subplots(1, 5, figsize=(14, 3.6))
    for ax, (draw, title, day, desc) in zip(axes, specs):
        draw(ax)
        ax.set_title(f"{title}\n{day}", fontsize=10.5)
        ax.text(1.1, -0.35, desc, ha="center", va="top", fontsize=8.5)
        ax.set_xlim(-0.1, 2.3)
        ax.set_ylim(-0.9, 1.9)
        ax.set_aspect("equal")
        ax.axis("off")
    fig.tight_layout()
    fig.savefig(OUT / "day08-architectures.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    fig_neuron_to_network()
    fig_connectivity()
    fig_architectures()
    print("wrote", *(OUT / f for f in ["day08-neuron-to-network.png", "day08-connectivity.png",
                                       "day08-architectures.png"]))
