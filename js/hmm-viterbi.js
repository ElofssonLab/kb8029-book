// Viterbi decoding against a profile HMM, drawn as one matrix. Shipped as
// hmm.html; the book pages can load it too.
//
// Built to answer one question before any more is written: can the three
// state types be shown together without the picture teaching less than it
// shows? dp.html works because the matrix is a single grid you take in at a
// glance. A profile HMM has a match, an insert and a delete state at every
// position, which is three layers, and three grids side by side is the
// obvious design and probably the wrong one: the interesting thing is the
// moves BETWEEN layers, and those become arrows flying across a gap.
//
// So this lays the layers out as rows of one grid instead. Each profile
// position owns three consecutive rows, M then I then D, and the Viterbi path
// is a single trace through a single matrix, the way Session 4 taught it.
// Whether that reads was the question this was built to answer. It does.
//
// The profile is built from the five-sequence toy alignment the Session 5
// PSSM slides already use, so the second half of that session can become one
// worked example: count, add pseudocounts, take log-odds -- and then actually
// align something to the result, which the course currently never shows.
//
// Not wired into any page, any deck or the resources list. Nothing deploys.

// The alignment from tools/builders/make_session05_slide_figures.py, and the
// same +1 pseudocount the notebook uses.
const HMM_MSA = ["AGLSP", "AGLTP", "RGISP", "AALSQ", "AALSP"];
const HMM_PSEUDO = 1;

// The background the Session 5 figures use. It only names the residues that
// toy alignment can produce; anything else falls back to a flat 0.05, which
// is close enough to the real amino-acid background for a five-column toy and
// is stated here rather than hidden.
const HMM_BG = { A: 0.074, R: 0.042, G: 0.074, L: 0.076, S: 0.081,
                 T: 0.062, P: 0.050, Q: 0.037, I: 0.038, W: 0.013 };
const HMM_BG_DEFAULT = 0.05;
const HMM_AA = "ACDEFGHIKLMNPQRSTVWY";

// Transition probabilities. The toy alignment is gapless, so it contains no
// evidence about insertions or deletions at all and these cannot be counted
// from it -- they are the usual sensible defaults, fixed here and shown on
// the page rather than quietly assumed.
const HMM_T = { MM: 0.90, MI: 0.05, MD: 0.05, IM: 0.50, II: 0.50, DM: 0.60, DD: 0.40 };

const NEG = -Infinity;
function lg(p) { return p <= 0 ? NEG : Math.log(p) / Math.LN2; }
function bg(a) { return HMM_BG[a] === undefined ? HMM_BG_DEFAULT : HMM_BG[a]; }

// One log-odds emission vector per profile position: the PSSM the slides
// build, which is the point of reusing this alignment.
//
// Two pseudocount schemes, because the difference between them is a lesson
// rather than a detail.
//
//   "flat"  adds the same pseudocount to every residue, which is what the
//           Session 5 notebook does. On this alignment it misbehaves, and
//           instructively so: column 1 is A,A,R,A,A, so alanine is seen four
//           times out of five and gets (4+1)/(5+20) = 0.200 against a
//           background of 0.074, which is +1.43 bits. Tryptophan is never
//           seen at all, gets (0+1)/(5+20) = 0.040, and is divided by a
//           background of 0.013 because it is rare -- which is +1.62 bits.
//           An unobserved residue outscores the observed consensus, and
//           WWWWW then beats AGLSP. This is the Ala-vs-Trp pathology the
//           "Why pseudocounts matter" slide already describes.
//
//   "bg"    makes the pseudocount proportional to the background, which is
//           the standard fix and what real profile builders do. Every
//           unobserved residue then scores log2(a / (N + a)) whatever its
//           background frequency, so rarity no longer buys anything.
//
// "bg" is the default here: a decoding demo in which a run of tryptophans
// beats the motif teaches the wrong thing first.
function hmmProfile(msa, pseudo, scheme) {
  const L = msa[0].length, N = msa.length, cols = [];
  const flat = scheme === "flat";
  for (let j = 0; j < L; j++) {
    const count = {}, add = {};
    HMM_AA.split("").forEach(function (a) {
      add[a] = flat ? pseudo : pseudo * bg(a) * (HMM_AA.length / 1.0) / HMM_AA.length;
      count[a] = 0;
    });
    // Background-proportional: the mass added is `pseudo` in total, split in
    // proportion to the background, rather than `pseudo` per residue.
    if (!flat) {
      let z = 0;
      HMM_AA.split("").forEach(function (a) { z += bg(a); });
      HMM_AA.split("").forEach(function (a) { add[a] = pseudo * (bg(a) / z); });
    }
    for (let s = 0; s < N; s++) {
      const a = msa[s][j];
      if (count[a] === undefined) { count[a] = 0; add[a] = flat ? pseudo : 0; }
      count[a] += 1;
    }
    let denom = 0;
    HMM_AA.split("").forEach(function (a) { denom += count[a] + add[a]; });
    const e = {};
    HMM_AA.split("").forEach(function (a) {
      e[a] = lg(((count[a] + add[a]) / denom) / bg(a));
    });
    cols.push({ e: e, count: count, add: add,
                consensus: msa.map(function (s) { return s[j]; }) });
  }
  return cols;
}

// Viterbi over match, insert and delete states.
//
//   M(i,j) = e_M(j, x_i) + max( M(i-1,j-1)+MM, I(i-1,j-1)+IM, D(i-1,j-1)+DM )
//   I(i,j) = e_I(x_i)    + max( M(i-1,j)+MI,   I(i-1,j)+II )
//   D(i,j) =               max( M(i,j-1)+MD,   D(i,j-1)+DD )
//
// Insert states emit from the background, so their log-odds score is exactly
// zero. That is worth seeing: an inserted residue costs you the transition
// and nothing else, which is why a profile HMM can afford position-specific
// gaps at all.
function hmmViterbi(query, profile) {
  const n = query.length, L = profile.length;
  const M = [], I = [], D = [], bM = [], bI = [], bD = [];
  for (let i = 0; i <= n; i++) {
    M.push(new Array(L + 1).fill(NEG)); I.push(new Array(L + 1).fill(NEG));
    D.push(new Array(L + 1).fill(NEG));
    bM.push(new Array(L + 1).fill(null)); bI.push(new Array(L + 1).fill(null));
    bD.push(new Array(L + 1).fill(null));
  }
  M[0][0] = 0;                              // begin
  for (let j = 1; j <= L; j++) {            // leading deletions
    const from = j === 1 ? M[0][0] + lg(HMM_T.MD) : D[0][j - 1] + lg(HMM_T.DD);
    D[0][j] = from;
    bD[0][j] = j === 1 ? ["M", 0, 0] : ["D", 0, j - 1];
  }
  for (let i = 1; i <= n; i++) {
    // leading insertions, before the first match state
    I[i][0] = (i === 1 ? M[0][0] + lg(HMM_T.MI) : I[i - 1][0] + lg(HMM_T.II));
    bI[i][0] = i === 1 ? ["M", 0, 0] : ["I", i - 1, 0];
    for (let j = 1; j <= L; j++) {
      const em = profile[j - 1].e[query[i - 1]];
      const cands = [
        [M[i - 1][j - 1] + lg(HMM_T.MM), ["M", i - 1, j - 1]],
        [I[i - 1][j - 1] + lg(HMM_T.IM), ["I", i - 1, j - 1]],
        [D[i - 1][j - 1] + lg(HMM_T.DM), ["D", i - 1, j - 1]]
      ];
      let best = cands[0];
      cands.forEach(function (c) { if (c[0] > best[0]) best = c; });
      M[i][j] = best[0] === NEG ? NEG : best[0] + (em === undefined ? 0 : em);
      bM[i][j] = best[1];

      const ic = [
        [M[i - 1][j] + lg(HMM_T.MI), ["M", i - 1, j]],
        [I[i - 1][j] + lg(HMM_T.II), ["I", i - 1, j]]
      ];
      let ib = ic[0];
      ic.forEach(function (c) { if (c[0] > ib[0]) ib = c; });
      I[i][j] = ib[0];                      // insert emission is 0 by construction
      bI[i][j] = ib[1];

      const dc = [
        [M[i][j - 1] + lg(HMM_T.MD), ["M", i, j - 1]],
        [D[i][j - 1] + lg(HMM_T.DD), ["D", i, j - 1]]
      ];
      let db = dc[0];
      dc.forEach(function (c) { if (c[0] > db[0]) db = c; });
      D[i][j] = db[0];
      bD[i][j] = db[1];
    }
  }
  const grid = { M: M, I: I, D: D };
  const back = { M: bM, I: bI, D: bD };

  // End: the best way to have consumed the whole query and the whole profile.
  let state = "M", best = M[n][L];
  if (D[n][L] > best) { state = "D"; best = D[n][L]; }
  if (I[n][L] > best) { state = "I"; best = I[n][L]; }

  const path = [];
  let i = n, j = L;
  let guard = 0;
  while (guard++ < 10000 && !(state === "M" && i === 0 && j === 0)) {
    path.push({ state: state, i: i, j: j });
    const prev = back[state][i][j];
    if (!prev) break;
    state = prev[0]; i = prev[1]; j = prev[2];
  }
  path.reverse();
  return { grid: grid, path: path, score: best, n: n, L: L };
}

// Read the alignment off the path: M consumes a query residue and a profile
// position, I consumes a residue only, D consumes a position only.
function hmmAlignment(query, profile, vit) {
  let q = "", s = "", p = "";
  vit.path.forEach(function (c) {
    if (c.state === "M") {
      q += query[c.i - 1]; p += profile[c.j - 1].consensus[0]; s += "M";
    } else if (c.state === "I") {
      q += query[c.i - 1]; p += "-"; s += "I";
    } else {
      q += "-"; p += profile[c.j - 1].consensus[0]; s += "D";
    }
  });
  return { query: q, profile: p, states: s };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { hmmProfile: hmmProfile, hmmViterbi: hmmViterbi,
                     hmmAlignment: hmmAlignment, HMM_MSA: HMM_MSA,
                     HMM_PSEUDO: HMM_PSEUDO, HMM_T: HMM_T };
}

// ---------------------------------------------------------------- the view

const HMM_STATES = ["M", "I", "D"];

function hmmStyle() {
  if (document.getElementById("hmm-style")) return;
  const s = document.createElement("style");
  s.id = "hmm-style";
  s.textContent = `
    .hmm { border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; padding: 1em 1.2em 1.2em; }
    .hmm table { border-collapse: collapse; font-variant-numeric: tabular-nums; font-size: 0.82em; }
    .hmm td, .hmm th { border: 1px solid rgba(0,0,0,0.12); padding: 3px 7px; text-align: center;
      min-width: 3.1em; font-weight: 400; }
    .hmm th { background: rgba(0,0,0,0.05); font-weight: 600; }
    .hmm th.lab { text-align: right; font-family: ui-monospace, Menlo, Consolas, monospace;
      min-width: 3.4em; }
    /* Each profile position owns three rows; shade alternate positions so the
       groups read as blocks rather than fifteen loose rows. */
    .hmm tr.g1 td, .hmm tr.g1 th.lab { background: rgba(0,0,0,0.035); }
    .hmm td.none { color: rgba(0,0,0,0.25); }
    /* These have to out-specify ".hmm tr.g1 td" above, which is (0,2,2):
       a bare ".hmm td.on" is (0,2,1) and loses, so the path vanished on every
       odd-numbered profile position. Matching the element count fixes it. */
    .hmm tr td.on { background: #a8dab5; font-weight: 600; }
    .hmm tr td.on.ins { background: #ffe08a; }
    .hmm tr td.on.del { background: #d9c7f0; }
    .hmm .key { font-size: 0.85em; color: rgba(0,0,0,0.6); margin: 0.6em 0 0; }
    .hmm .al { font-family: ui-monospace, Menlo, Consolas, monospace; white-space: pre;
      background: rgba(0,0,0,0.04); border-radius: 6px; padding: 0.7em 0.9em; margin: 0.7em 0 0; }
    .hmm .row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 0.8em; }
    .hmm input, .hmm select { font: inherit; font-size: 0.9em; padding: 4px 7px;
      border: 1px solid rgba(0,0,0,0.2); border-radius: 5px; }
    .hmm label { display: block; font-size: 0.76em; color: rgba(0,0,0,0.6); margin-bottom: 2px; }
    .hmm .sc { font-size: 1.02em; font-weight: 600; margin-top: 0.6em; }
  `;
  document.head.appendChild(s);
}

function hmmEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function renderHMM(containerId, opts) {
  const host = document.getElementById(containerId);
  if (!host) return;
  hmmStyle();
  const cfg = Object.assign({ query: "AGLSAP", scheme: "bg", pseudo: 5 }, opts || {});
  host.textContent = "";
  const root = hmmEl("div", "hmm");
  host.appendChild(root);

  const bar = hmmEl("div", "row");
  const qi = document.createElement("input");
  qi.type = "text"; qi.value = cfg.query; qi.size = 16;
  const sel = document.createElement("select");
  [["bg", "background-proportional"], ["flat", "flat +1 (the notebook's)"]].forEach(function (o) {
    const op = document.createElement("option"); op.value = o[0]; op.textContent = o[1];
    sel.appendChild(op);
  });
  sel.value = cfg.scheme;
  function field(t, c) { const w = hmmEl("div"); w.appendChild(hmmEl("label", null, t)); w.appendChild(c); return w; }
  bar.appendChild(field("Query", qi));
  bar.appendChild(field("Pseudocounts", sel));
  root.appendChild(bar);

  const out = hmmEl("div");
  root.appendChild(out);

  function draw() {
    const q = qi.value.toUpperCase().replace(/[^A-Z]/g, "") || "A";
    const scheme = sel.value;
    const prof = hmmProfile(HMM_MSA, scheme === "flat" ? 1 : cfg.pseudo, scheme);
    const vit = hmmViterbi(q, prof);
    const al = hmmAlignment(q, prof, vit);
    const on = {};
    vit.path.forEach(function (c) { on[c.state + "," + c.i + "," + c.j] = true; });

    out.textContent = "";
    const tab = hmmEl("table");
    const head = hmmEl("tr");
    head.appendChild(hmmEl("th", "lab", ""));
    head.appendChild(hmmEl("th", null, "–"));
    for (let i = 1; i <= q.length; i++) head.appendChild(hmmEl("th", null, q[i - 1] + String(i)));
    tab.appendChild(head);

    for (let j = 0; j <= vit.L; j++) {
      HMM_STATES.forEach(function (st) {
        if (j === 0 && st === "D") return;           // no delete before the profile starts
        const tr = hmmEl("tr", j % 2 ? "g1" : null);
        const name = j === 0 ? (st === "M" ? "begin" : st + "0")
                             : st + j + (st === "M" ? " " + prof[j - 1].consensus[0] : "");
        tr.appendChild(hmmEl("th", "lab", name));
        for (let i = 0; i <= q.length; i++) {
          const v = vit.grid[st][i][j];
          const td = hmmEl("td", null, v === -Infinity ? "·" : v.toFixed(1));
          if (v === -Infinity) td.className = "none";
          if (on[st + "," + i + "," + j]) {
            td.className = "on" + (st === "I" ? " ins" : st === "D" ? " del" : "");
          }
          tr.appendChild(td);
        }
        tab.appendChild(tr);
      });
    }
    out.appendChild(tab);
    out.appendChild(hmmEl("p", "key",
      "Rows are the profile, three to a position: match (green on the path), insert (yellow), "
      + "delete (purple). Columns are the query. One matrix, one trace — a move down three "
      + "rows is a step along the profile, a move right is a residue consumed."));
    out.appendChild(hmmEl("div", "sc", "Viterbi score: " + vit.score.toFixed(2) + " bits"));
    out.appendChild(hmmEl("div", "al",
      "query   " + al.query + "\nstates  " + al.states + "\nprofile " + al.profile));
  }
  qi.oninput = draw;
  sel.onchange = draw;
  draw();
}

if (typeof window !== "undefined") window.renderHMM = renderHMM;
