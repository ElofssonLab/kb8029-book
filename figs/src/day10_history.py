"""History figures for Day 10, drawn from numbers verified against the primary
papers and assessment reports (citations on book/day10.qmd).

Run:  python3 book/figs/src/day10_history.py
Writes day10-imagenet-history.png, day10-casp-contacts.png,
day10-ss-accuracy.png and day10-cnn-biology-timeline.png into book/figs/.
"""
from pathlib import Path

import matplotlib.pyplot as plt

OUT = Path(__file__).resolve().parents[1]
INK, MUTED = "#222222", "#8a8a8a"
BLUE, ORANGE, GREEN, PURPLE, RED = "#2f6db5", "#d9822b", "#3c8d4f", "#7a4fb0", "#c0392b"
plt.rcParams.update({"font.size": 10, "font.family": "DejaVu Sans"})


def imagenet():
    # Russakovsky et al. 2015 IJCV Tables 5-8 (winning entry, provided data); ResNet: He et al. 2016
    data = [(2010, 28.2, "NEC\n(hand-crafted\nfeatures)"), (2011, 25.8, "XRCE\n(hand-crafted)"),
            (2012, 16.4, "AlexNet\n(8 layers)"), (2013, 11.7, "Clarifai\n(ZFNet-style)"),
            (2014, 6.7, "GoogLeNet\n(22 layers)"), (2015, 3.57, "ResNet\n(152 layers)")]
    fig, ax = plt.subplots(figsize=(8, 4.4))
    years = [d[0] for d in data]
    errs = [d[1] for d in data]
    colors = [MUTED, MUTED, ORANGE, ORANGE, ORANGE, ORANGE]
    ax.bar(years, errs, color=colors, width=0.6)
    for yr, e, lab in data:
        ax.text(yr, e + 0.8, f"{e:g}%", ha="center", fontsize=9, weight="bold")
        ax.text(yr, -1.5, lab, ha="center", va="top", fontsize=8)
    ax.axhline(5.1, color=BLUE, ls="--", lw=1.2)
    ax.text(2015.55, 5.1, "one trained\nhuman (5.1%)", color=BLUE, fontsize=8, ha="left", va="center")
    ax.set_xlim(2009.5, 2016.6)
    ax.set_ylim(0, 32)
    ax.set_xticks(years)
    ax.set_xticklabels([])
    ax.tick_params(axis="x", length=0)
    ax.set_ylabel("top-5 classification error (%)")
    ax.set_title("ImageNet (ILSVRC) winners: grey = before CNNs, orange = CNNs", fontsize=10)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.text(0.5, -0.12, "2012: 16.4% with the provided training data (15.3% with extra data); runner-up 26.2%.",
             ha="center", fontsize=8, color=MUTED)
    fig.savefig(OUT / "day10-imagenet-history.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def casp_contacts():
    # Best group, precision of the top-L/5 long-range contacts, free-modelling targets (CASP assessment papers)
    rounds = [("CASP9\n2010", 21, "coevolution\nbarely usable"), ("CASP10\n2012", 19, "DCA / PSICOV\nera"),
              ("CASP11\n2014", 27, "shallow network\non coevolution\n(MetaPSICOV)"),
              ("CASP12\n2016", 47, "deep residual\nCNN\n(RaptorX-Contact)"),
              ("CASP13\n2018", 70, "deep ResNets\neverywhere;\nAlphaFold 1\n(distances)")]
    fig, ax = plt.subplots(figsize=(8, 4.4))
    x = range(len(rounds))
    cols = [MUTED, MUTED, PURPLE, ORANGE, ORANGE]
    ax.bar(x, [r[1] for r in rounds], color=cols, width=0.6)
    for k, (name, v, note) in enumerate(rounds):
        label = f">{v}%" if k == 4 else f"{v}%"
        ax.text(k, v + 1.5, label, ha="center", weight="bold", fontsize=9)
    ax.set_xticks(list(x))
    ax.set_xticklabels([f"{r[0]}\n\n{r[2]}" for r in rounds], fontsize=8.5, va="top")
    ax.set_ylim(0, 85)
    ax.set_ylabel("precision of top-L/5 long-range contacts (%)")
    ax.set_title("Best contact predictor in each CASP (free-modelling targets)", fontsize=10)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.text(0.5, -0.2, "CASP14 (2020): top-5 average 64%, no further gain; AlphaFold 2 made contact "
             "prediction a by-product of full 3D prediction.", ha="center", fontsize=8, color=MUTED)
    fig.savefig(OUT / "day10-casp-contacts.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def ss_accuracy():
    # Q3 as reported by each paper (different test sets; see page caption)
    pts = [(1974, 55, "Chou-Fasman", MUTED), (1978, 65, "GOR", MUTED), (1993, 70.8, "PHD", BLUE),
           (1999, 77.4, "PSIPRED", BLUE), (2012, 82.0, "SPINE X", PURPLE), (2016, 84, "DeepCNF", ORANGE),
           (2019, 85, "NetSurfP-2.0", ORANGE), (2019, 87, "SPOT-1D", ORANGE)]
    fig, ax = plt.subplots(figsize=(8, 4.2))
    ax.axhspan(88, 90, color=GREEN, alpha=0.15)
    ax.text(1975, 89, "estimated ceiling (88-90%)", va="center", fontsize=8, color=GREEN)
    ax.plot([p[0] for p in pts], [p[1] for p in pts], color="#cccccc", zorder=1)
    ax.vlines(1999, 76.5, 78.3, color=BLUE, lw=2)
    for yr, q, name, c in pts:
        ax.scatter(yr, q, color=c, s=45, zorder=3)
        dx, dy, ha, va = {"NetSurfP-2.0": (0.8, -0.6, "left", "top"), "SPOT-1D": (0.8, 0.3, "left", "bottom"),
                          "DeepCNF": (-0.8, 0.4, "right", "bottom"), "SPINE X": (0, -1.2, "center", "top")}.get(name, (0, 1.2, "center", "bottom"))
        ax.text(yr + dx, q + dy, name, ha=ha, va=va, fontsize=8)
    ax.set_xlim(1970, 2023)
    ax.set_ylim(50, 92)
    ax.set_ylabel("three-state accuracy Q3 (%)")
    ax.set_title("Secondary-structure prediction: linear scores (grey), shallow networks on profiles (blue),\n"
                 "deep CNN / CNN+LSTM models (orange)", fontsize=10)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.savefig(OUT / "day10-ss-accuracy.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def timeline():
    lanes = {
        "Images (general)": (BLUE, [(1989, "LeNet: zip codes"), (2012, "AlexNet wins ImageNet"),
                                    (2015, "ResNet")]),
        "Biomedical images": (RED, [(2012, "EM neurons (ISBI)\nmitosis (ICPR)"), (2015, "U-Net"),
                                    (2016, "diabetic\nretinopathy"), (2017, "skin cancer;\nCAMELYON16")]),
        "DNA": (GREEN, [(2015, "DeepBind,\nDeepSEA"), (2016, "Basset,\nDanQ"), (2018, "Basenji"),
                        (2021, "Enformer\n(Transformer)")]),
        "Proteins": (ORANGE, [(2011, "coevolution\n(EVfold, DCA)"), (2015, "MetaPSICOV"),
                              (2016, "DeepCNF (SS)"), (2017, "RaptorX-Contact,\nDeepLoc"),
                              (2018, "AlphaFold 1"), (2020, "AlphaFold 2")]),
    }
    fig, ax = plt.subplots(figsize=(12, 5.6))
    for row, (lane, (color, events)) in enumerate(lanes.items()):
        y = 1.5 * (len(lanes) - 1 - row)
        ax.axhline(y, color=color, alpha=0.25, lw=6, zorder=0)
        ax.text(1986.2, y, lane, ha="right", va="center", fontsize=10, color=color, weight="bold")
        for k, (yr, lab) in enumerate(events):
            ax.scatter(yr, y, color=color, s=60, zorder=3)
            off = [0.2, -0.2, 0.55, -0.55][k % 4] if lane == "Proteins" else (0.2 if k % 2 == 0 else -0.2)
            ax.text(yr, y + off, lab, ha="center", va="bottom" if off > 0 else "top", fontsize=7.5)
    ax.axvline(2012, color=MUTED, ls=":", lw=1)
    ax.set_xlim(1987, 2022.5)
    ax.set_ylim(-1.2, 1.5 * (len(lanes) - 1) + 0.7)
    ax.set_yticks([])
    ax.set_xticks(range(1990, 2023, 5))
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.set_title("How CNNs spread into biology (dotted line: 2012)", fontsize=11)
    fig.savefig(OUT / "day10-cnn-biology-timeline.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    imagenet()
    casp_contacts()
    ss_accuracy()
    timeline()
    print("wrote 4 figures to", OUT)
