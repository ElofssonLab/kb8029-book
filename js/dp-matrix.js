// Interactive dynamic-programming alignment matrix.
//
// No external dependencies, by design — the same rule as quiz-widget.js in
// this directory. An external asset that fails to load silently is worse than
// a plain HTML/CSS/JS element that always works, and this one has to work in
// a lab room on whatever network the university gives us that morning.
//
// Usage, from a qmd page:
//
//   ```{=html}
//   <div id="nw-step"></div>
//   <script>
//   renderDP("nw-step", {
//     mode: "step",              // "step" | "guess" | "fill"
//     a: "TGCATTA",              // rows,    read top to bottom
//     b: "GCATTAC",              // columns, read left to right
//     scoring: "identity",       // "identity" | "blosum62"
//     match: 3, mismatch: -1,    // used when scoring is "identity"
//     gap: -2,
//     local: false               // false = Needleman-Wunsch, true = Smith-Waterman
//   });
//   </script>
//   ```
//
// A `{=html}` block is dropped from the PDF build, so the PDF simply does not
// show the widget. Put the static worked example in the prose, not in here.
//
// The recurrence is the one in Session 4; nothing here is adapted from anyone
// else's code. Lukas Kall's alignviz does the "step through it" part well but
// is a Streamlit server with no substitution matrix, which is why this exists.

// BLOSUM62, generated from Biopython's copy of the NCBI matrix.
const BLOSUM62_ALPHA = "ARNDCQEGHILKMFPSTWYVBZX*";
const BLOSUM62_ROWS = [
  "4,-1,-2,-2,0,-1,-1,0,-2,-1,-1,-1,-1,-2,-1,1,0,-3,-2,0,-2,-1,0,-4",
  "-1,5,0,-2,-3,1,0,-2,0,-3,-2,2,-1,-3,-2,-1,-1,-3,-2,-3,-1,0,-1,-4",
  "-2,0,6,1,-3,0,0,0,1,-3,-3,0,-2,-3,-2,1,0,-4,-2,-3,3,0,-1,-4",
  "-2,-2,1,6,-3,0,2,-1,-1,-3,-4,-1,-3,-3,-1,0,-1,-4,-3,-3,4,1,-1,-4",
  "0,-3,-3,-3,9,-3,-4,-3,-3,-1,-1,-3,-1,-2,-3,-1,-1,-2,-2,-1,-3,-3,-2,-4",
  "-1,1,0,0,-3,5,2,-2,0,-3,-2,1,0,-3,-1,0,-1,-2,-1,-2,0,3,-1,-4",
  "-1,0,0,2,-4,2,5,-2,0,-3,-3,1,-2,-3,-1,0,-1,-3,-2,-2,1,4,-1,-4",
  "0,-2,0,-1,-3,-2,-2,6,-2,-4,-4,-2,-3,-3,-2,0,-2,-2,-3,-3,-1,-2,-1,-4",
  "-2,0,1,-1,-3,0,0,-2,8,-3,-3,-1,-2,-1,-2,-1,-2,-2,2,-3,0,0,-1,-4",
  "-1,-3,-3,-3,-1,-3,-3,-4,-3,4,2,-3,1,0,-3,-2,-1,-3,-1,3,-3,-3,-1,-4",
  "-1,-2,-3,-4,-1,-2,-3,-4,-3,2,4,-2,2,0,-3,-2,-1,-2,-1,1,-4,-3,-1,-4",
  "-1,2,0,-1,-3,1,1,-2,-1,-3,-2,5,-1,-3,-1,0,-1,-3,-2,-2,0,1,-1,-4",
  "-1,-1,-2,-3,-1,0,-2,-3,-2,1,2,-1,5,0,-2,-1,-1,-1,-1,1,-3,-1,-1,-4",
  "-2,-3,-3,-3,-2,-3,-3,-3,-1,0,0,-3,0,6,-4,-2,-2,1,3,-1,-3,-3,-1,-4",
  "-1,-2,-2,-1,-3,-1,-1,-2,-2,-3,-3,-1,-2,-4,7,-1,-1,-4,-3,-2,-2,-1,-2,-4",
  "1,-1,1,0,-1,0,0,0,-1,-2,-2,0,-1,-2,-1,4,1,-3,-2,-2,0,0,0,-4",
  "0,-1,0,-1,-1,-1,-1,-2,-2,-1,-1,-1,-1,-2,-1,1,5,-2,-2,0,-1,-1,0,-4",
  "-3,-3,-4,-4,-2,-2,-3,-2,-2,-3,-2,-3,-1,1,-4,-3,-2,11,2,-3,-4,-3,-2,-4",
  "-2,-2,-2,-3,-2,-1,-2,-3,2,-1,-1,-2,-1,3,-3,-2,-2,2,7,-1,-3,-2,-1,-4",
  "0,-3,-3,-3,-1,-2,-2,-3,-3,3,1,-2,1,-1,-2,-2,0,-3,-1,4,-3,-2,-1,-4",
  "-2,-1,3,4,-3,0,1,-1,0,-3,-4,0,-3,-3,-2,0,-1,-4,-3,-3,4,1,-1,-4",
  "-1,0,0,1,-3,3,4,-2,0,-3,-3,1,-1,-3,-1,0,-1,-3,-2,-2,1,4,-1,-4",
  "0,-1,-1,-1,-2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-2,0,0,-2,-1,-1,-1,-1,-1,-4",
  "-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,1"
];

const BLOSUM62 = (function () {
  const t = {};
  for (let r = 0; r < BLOSUM62_ALPHA.length; r++) {
    const row = {};
    const vals = BLOSUM62_ROWS[r].split(",");
    for (let c = 0; c < BLOSUM62_ALPHA.length; c++) row[BLOSUM62_ALPHA[c]] = parseInt(vals[c], 10);
    t[BLOSUM62_ALPHA[r]] = row;
  }
  return t;
})();

// ---------------------------------------------------------------- the engine

function dpDefaults(cfg) {
  const c = Object.assign({
    mode: "step",
    // The Session 4 example, so the widget, the slide figures and the lecture
    // all open on the same matrix. Both are fragments of HEAGAWGHEE/PAWHEAE,
    // the textbook pair the local example further down uses in full.
    a: "AWGHE",
    b: "AWHEA",
    scoring: "identity",
    match: 1,
    mismatch: -1,
    gap: -1,
    local: false,
    questions: 5,
    showPointers: true,
    caption: null,
    controls: false,   // show the settings bar above the matrix
    modes: null        // several modes with a switcher, e.g. ["step","guess","fill"]
  }, cfg || {});
  c.a = String(c.a).toUpperCase().replace(/[^A-Z*]/g, "");
  c.b = String(c.b).toUpperCase().replace(/[^A-Z*]/g, "");
  return c;
}

function dpScorer(cfg) {
  if (cfg.scoring === "blosum62") {
    return function (x, y) {
      const row = BLOSUM62[x] || BLOSUM62["X"];
      const v = row[y];
      return v === undefined ? BLOSUM62["X"]["X"] : v;
    };
  }
  return function (x, y) { return x === y ? cfg.match : cfg.mismatch; };
}

// Fills V and the pointer table. V[i][j] indexes residue i of a and j of b,
// so row 0 and column 0 are the empty-prefix border.
function computeDP(cfg) {
  const s = dpScorer(cfg);
  const n = cfg.a.length, m = cfg.b.length;
  const V = [], ptr = [];
  for (let i = 0; i <= n; i++) { V.push(new Array(m + 1).fill(0)); ptr.push([]); for (let j = 0; j <= m; j++) ptr[i].push([]); }

  V[0][0] = 0;
  for (let j = 1; j <= m; j++) { V[0][j] = cfg.local ? 0 : j * cfg.gap; if (!cfg.local) ptr[0][j] = ["left"]; }
  for (let i = 1; i <= n; i++) { V[i][0] = cfg.local ? 0 : i * cfg.gap; if (!cfg.local) ptr[i][0] = ["up"]; }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = s(cfg.a[i - 1], cfg.b[j - 1]);
      const d = V[i - 1][j - 1] + sub;
      const u = V[i - 1][j] + cfg.gap;
      const l = V[i][j - 1] + cfg.gap;
      let best = Math.max(d, u, l);
      if (cfg.local) best = Math.max(0, best);
      const p = [];
      if (d === best) p.push("diag");
      if (u === best) p.push("up");
      if (l === best) p.push("left");
      V[i][j] = best;
      ptr[i][j] = p;
    }
  }
  return { V: V, ptr: ptr, n: n, m: m, score: dpScorer(cfg) };
}

// The three candidates for one interior cell, as numbers and as prose.
function dpCandidates(cfg, dp, i, j) {
  const sub = dp.score(cfg.a[i - 1], cfg.b[j - 1]);
  return {
    sub: sub,
    diag: dp.V[i - 1][j - 1] + sub,
    up: dp.V[i - 1][j] + cfg.gap,
    left: dp.V[i][j - 1] + cfg.gap
  };
}

function dpStartCell(cfg, dp) {
  if (!cfg.local) return [dp.n, dp.m];
  let bi = 0, bj = 0, best = -Infinity;
  for (let i = 0; i <= dp.n; i++) for (let j = 0; j <= dp.m; j++) {
    if (dp.V[i][j] > best) { best = dp.V[i][j]; bi = i; bj = j; }
  }
  return [bi, bj];
}

// Walks one optimal path back from the start cell. Where several predecessors
// tie it takes diagonal first, then up, then left: one path out of possibly
// many, which is the honest thing to show and worth saying out loud in class.
function dpTraceback(cfg, dp) {
  let [i, j] = dpStartCell(cfg, dp);
  const path = [[i, j]];
  let A = "", B = "";
  let guard = 0;
  while (guard++ < 10000) {
    if (cfg.local && dp.V[i][j] === 0) break;
    if (i === 0 && j === 0) break;
    const p = dp.ptr[i][j];
    let move;
    if (i > 0 && j > 0 && p.indexOf("diag") >= 0) move = "diag";
    else if (i > 0 && p.indexOf("up") >= 0) move = "up";
    else if (j > 0 && p.indexOf("left") >= 0) move = "left";
    else if (i === 0) move = "left";
    else move = "up";

    if (move === "diag") { A = cfg.a[i - 1] + A; B = cfg.b[j - 1] + B; i--; j--; }
    else if (move === "up") { A = cfg.a[i - 1] + A; B = "-" + B; i--; }
    else { A = "-" + A; B = cfg.b[j - 1] + B; j--; }
    path.push([i, j]);
  }
  const start = dpStartCell(cfg, dp);
  return { path: path, a: A, b: B, score: dp.V[start[0]][start[1]] };
}

function dpMidline(A, B) {
  let s = "";
  for (let k = 0; k < A.length; k++) {
    if (A[k] === "-" || B[k] === "-") s += " ";
    else if (A[k] === B[k]) s += "|";
    else s += ".";
  }
  return s;
}

// ------------------------------------------------------------- the rendering

function dpStyle() {
  if (document.getElementById("dp-matrix-style")) return;
  const style = document.createElement("style");
  style.id = "dp-matrix-style";
  // Neutral greys are rgba so the widget sits on any page background; the few
  // fixed colours are the ones quiz-widget.js already uses, for consistency.
  style.textContent = `
    .dpm { border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; padding: 1em 1.2em 1.2em; margin-bottom: 1.2em; }
    .dpm h4 { margin: 0 0 0.2em; font-size: 1em; }
    .dpm .dpm-sub { color: rgba(0,0,0,0.6); font-size: 0.88em; margin: 0 0 0.9em; }
    .dpm-scroll { overflow-x: auto; }
    .dpm table { border-collapse: collapse; font-variant-numeric: tabular-nums; margin: 0 0 0.8em; }
    .dpm td, .dpm th { border: 1px solid rgba(0,0,0,0.18); width: 3.3em; height: 2.9em; text-align: center;
      padding: 0; font-size: 0.92em; font-weight: 400; position: relative; }
    .dpm th { background: rgba(0,0,0,0.05); font-weight: 600; }
    .dpm td.dpm-empty { visibility: hidden; border: none; }
    .dpm td.dpm-border { background: rgba(0,0,0,0.03); color: rgba(0,0,0,0.65); }
    .dpm td.dpm-blank { color: transparent; }
    .dpm td.dpm-current { outline: 2px solid #0d6efd; outline-offset: -2px; background: #e7f1ff; }
    .dpm td.dpm-source { background: #fff3cd; }
    .dpm td.dpm-right { background: #eaf7ee; }
    .dpm td.dpm-wrong { background: #f8d7da; }
    /* After "reveal" every cell is marked right, so the traceback has to be a
       stronger green than a correct cell, and declared after it to win. */
    .dpm td.dpm-path { background: #a8dab5; font-weight: 600; }
    .dpm td input { width: 100%; height: 100%; border: none; background: transparent; text-align: center;
      font: inherit; font-variant-numeric: tabular-nums; color: inherit; padding: 0; }
    .dpm td input:focus { outline: 2px solid #0d6efd; outline-offset: -2px; }
    .dpm .dpm-ptr { position: absolute; top: 1px; left: 3px; font-size: 0.72em; line-height: 1;
      color: rgba(0,0,0,0.55); letter-spacing: -1px; }
    /* What a neighbour offers this cell: the badge sits on the neighbour, so
       the three alternatives and the winner are visible on the matrix itself
       and not only in the line of prose underneath. */
    .dpm .dpm-cand { position: absolute; right: 2px; bottom: 1px; font-size: 0.68em; line-height: 1.25;
      padding: 0 3px; border-radius: 3px; color: rgba(0,0,0,0.6); background: rgba(255,255,255,0.8); }
    .dpm .dpm-cand.dpm-cand-win { color: #0f5132; background: #a8dab5; font-weight: 600; }
    .dpm .dpm-settings { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: flex-end;
      padding: 0.7em 0.9em; margin-bottom: 0.9em; border: 1px solid rgba(0,0,0,0.12);
      border-radius: 8px; background: rgba(0,0,0,0.02); }
    .dpm .dpm-settings label { display: block; font-size: 0.76em; color: rgba(0,0,0,0.6); margin-bottom: 2px; }
    .dpm .dpm-settings input, .dpm .dpm-settings select { font: inherit; font-size: 0.9em;
      padding: 4px 7px; border: 1px solid rgba(0,0,0,0.2); border-radius: 5px;
      background: #fff; color: inherit; }
    .dpm .dpm-settings input[type=text] { width: 10em; font-family: ui-monospace, Menlo, Consolas, monospace; }
    .dpm .dpm-settings input[type=number] { width: 4.6em; }
    .dpm .dpm-settings .dpm-hidden { display: none; }
    .dpm .dpm-modes { display: inline-flex; border: 1px solid rgba(0,0,0,0.18); border-radius: 6px; overflow: hidden; }
    .dpm .dpm-modes button { border-radius: 0; background: transparent; color: inherit;
      font-size: 0.88em; padding: 5px 13px; }
    .dpm .dpm-modes button:hover { background: rgba(0,0,0,0.06); }
    .dpm .dpm-modes button.on { background: #0d6efd; color: #fff; }
    .dpm .dpm-modes button.on:hover { background: #0b5ed7; }
    .dpm .dpm-controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0.4em 0 0.8em; }
    .dpm button { padding: 6px 16px; border: none; border-radius: 6px; background: #0d6efd; color: white;
      cursor: pointer; font-size: 0.9em; }
    .dpm button:hover { background: #0b5ed7; }
    .dpm button:disabled { background: rgba(0,0,0,0.2); cursor: default; }
    .dpm button.dpm-secondary { background: rgba(0,0,0,0.08); color: inherit; }
    .dpm button.dpm-secondary:hover { background: rgba(0,0,0,0.14); }
    .dpm input[type=range] { flex: 1 1 180px; min-width: 140px; }
    .dpm .dpm-say { margin: 0.5em 0; font-size: 0.92em; min-height: 1.4em; }
    .dpm .dpm-feedback { margin-top: 0.6em; padding: 0.6em 0.9em; border-radius: 6px; display: none; font-size: 0.92em; }
    .dpm .dpm-feedback.correct { background: #d4edda; color: #155724; display: block; }
    .dpm .dpm-feedback.incorrect { background: #f8d7da; color: #721c24; display: block; }
    .dpm .dpm-align { font-family: ui-monospace, Menlo, Consolas, monospace; white-space: pre; overflow-x: auto;
      background: rgba(0,0,0,0.04); border-radius: 6px; padding: 0.7em 0.9em; margin-top: 0.6em; font-size: 0.9em; }
    .dpm .dpm-ask { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .dpm .dpm-ask input[type=number] { width: 5.5em; padding: 5px 8px; border: 1px solid rgba(0,0,0,0.25);
      border-radius: 6px; font: inherit; background: transparent; color: inherit; }
  `;
  document.head.appendChild(style);
}

function dpEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function dpArrows(p) {
  let s = "";
  if (p.indexOf("diag") >= 0) s += "↖";
  if (p.indexOf("up") >= 0) s += "↑";
  if (p.indexOf("left") >= 0) s += "←";
  return s;
}

// Builds the table once; every mode then just toggles classes and text.
function dpTable(cfg, dp, opts) {
  const table = dpEl("table");
  const head = dpEl("tr");
  head.appendChild(dpEl("td", "dpm-empty"));
  head.appendChild(dpEl("th", null, "–"));
  for (let j = 0; j < dp.m; j++) head.appendChild(dpEl("th", null, cfg.b[j]));
  table.appendChild(head);

  const cells = [];
  for (let i = 0; i <= dp.n; i++) {
    const tr = dpEl("tr");
    tr.appendChild(dpEl("th", null, i === 0 ? "–" : cfg.a[i - 1]));
    cells.push([]);
    for (let j = 0; j <= dp.m; j++) {
      const td = dpEl("td");
      td.dataset.i = i;
      td.dataset.j = j;
      if (i === 0 || j === 0) td.classList.add("dpm-border");
      if (opts && opts.inputs && i > 0 && j > 0) {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.inputMode = "numeric";
        inp.setAttribute("aria-label", "value for row " + i + ", column " + j);
        td.appendChild(inp);
      }
      cells[i].push(td);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  const wrap = dpEl("div", "dpm-scroll");
  wrap.appendChild(table);
  return { wrap: wrap, cells: cells };
}

function dpShowValue(cfg, dp, td, i, j, withPointers) {
  td.textContent = dpNum(dp.V[i][j]);
  td.classList.remove("dpm-blank");
  if (withPointers && i > 0 && j > 0 && dp.ptr[i][j].length) {
    const s = dpEl("span", "dpm-ptr", dpArrows(dp.ptr[i][j]));
    td.appendChild(s);
  }
}

// Puts each neighbour's offer on the neighbour, and marks the one that wins.
// In a local alignment the floor of zero is a fourth alternative, so it gets a
// badge of its own in the cell being decided.
function dpShowCandidates(cfg, dp, cells, i, j) {
  const c = dpCandidates(cfg, dp, i, j);
  const best = dp.V[i][j];
  function badge(td, value, text) {
    td.appendChild(dpEl("span", "dpm-cand" + (value === best ? " dpm-cand-win" : ""), text));
  }
  badge(cells[i - 1][j - 1], c.diag, dpNum(c.diag));
  badge(cells[i - 1][j], c.up, dpNum(c.up));
  badge(cells[i][j - 1], c.left, dpNum(c.left));
  if (cfg.local) badge(cells[i][j], 0, "0");
}

function dpSettingsLine(cfg) {
  const scheme = cfg.scoring === "blosum62"
    ? "BLOSUM62"
    : "match " + dpSigned(cfg.match) + ", mismatch " + dpSigned(cfg.mismatch);
  return (cfg.local ? "Smith–Waterman (local)" : "Needleman–Wunsch (global)") +
    " · " + scheme + " · gap " + dpSigned(cfg.gap);
}

function dpSigned(v) { return v >= 0 ? "+" + v : "−" + Math.abs(v); }
function dpNum(v) { return v < 0 ? "−" + Math.abs(v) : String(v); }

function dpRecurrence(cfg, dp, i, j) {
  const c = dpCandidates(cfg, dp, i, j);
  const parts = [
    "V(" + (i - 1) + "," + (j - 1) + ") + s(" + cfg.a[i - 1] + "," + cfg.b[j - 1] + ") = " +
      dpNum(dp.V[i - 1][j - 1]) + " + (" + dpNum(c.sub) + ") = " + dpNum(c.diag),
    "V(" + (i - 1) + "," + j + ") + gap = " + dpNum(dp.V[i - 1][j]) + " + (" + dpNum(cfg.gap) + ") = " + dpNum(c.up),
    "V(" + i + "," + (j - 1) + ") + gap = " + dpNum(dp.V[i][j - 1]) + " + (" + dpNum(cfg.gap) + ") = " + dpNum(c.left)
  ];
  if (cfg.local) parts.push("0");
  return "V(" + i + "," + j + ") = max( " + parts.join(";  ") + " ) = " + dpNum(dp.V[i][j]);
}

function dpAlignmentBox(cfg, dp) {
  const tb = dpTraceback(cfg, dp);
  const box = dpEl("div", "dpm-align");
  box.textContent = tb.a + "\n" + dpMidline(tb.a, tb.b) + "\n" + tb.b +
    "\n\nscore " + dpNum(tb.score);
  return { box: box, tb: tb };
}

// ------------------------------------------------------------------ the modes

function dpRenderStep(root, cfg, dp) {
  const total = dp.n * dp.m;
  const t = dpTable(cfg, dp, {});
  root.appendChild(t.wrap);

  const controls = dpEl("div", "dpm-controls");
  const back = dpEl("button", "dpm-secondary", "← Back");
  const next = dpEl("button", null, "Next cell →");
  const slider = document.createElement("input");
  slider.type = "range"; slider.min = 0; slider.max = total; slider.value = 0;
  slider.setAttribute("aria-label", "cells filled in");
  const all = dpEl("button", "dpm-secondary", "Fill all");
  controls.appendChild(back); controls.appendChild(next); controls.appendChild(slider); controls.appendChild(all);
  root.appendChild(controls);

  const say = dpEl("div", "dpm-say");
  root.appendChild(say);
  const out = dpEl("div");
  root.appendChild(out);

  function draw(k) {
    for (let i = 0; i <= dp.n; i++) for (let j = 0; j <= dp.m; j++) {
      const td = t.cells[i][j];
      td.className = (i === 0 || j === 0) ? "dpm-border" : "";
      td.textContent = "";
      if (i === 0 || j === 0) { dpShowValue(cfg, dp, td, i, j, false); continue; }
      const idx = (i - 1) * dp.m + (j - 1);
      if (idx < k) dpShowValue(cfg, dp, td, i, j, cfg.showPointers);
      else td.classList.add("dpm-blank");
    }
    if (k > 0 && k <= total) {
      const i = Math.floor((k - 1) / dp.m) + 1, j = ((k - 1) % dp.m) + 1;
      t.cells[i][j].classList.add("dpm-current");
      t.cells[i - 1][j - 1].classList.add("dpm-source");
      t.cells[i - 1][j].classList.add("dpm-source");
      t.cells[i][j - 1].classList.add("dpm-source");
      dpShowCandidates(cfg, dp, t.cells, i, j);
      say.textContent = "Each neighbour offers a value; the biggest wins. " + dpRecurrence(cfg, dp, i, j);
    } else if (k === 0) {
      say.textContent = "The border is the cost of opening with gaps" +
        (cfg.local ? ", which is zero in a local alignment." : ".") + " Press Next cell.";
    }
    out.textContent = "";
    if (k === total) {
      say.textContent = "The matrix is full. The best score is in " +
        (cfg.local ? "the largest cell" : "the bottom-right cell") + ".";
      const a = dpAlignmentBox(cfg, dp);
      a.tb.path.forEach(function (p) { t.cells[p[0]][p[1]].classList.add("dpm-path"); });
      out.appendChild(a.box);
    }
    back.disabled = (k === 0);
    next.disabled = (k === total);
    slider.value = k;
  }

  back.onclick = function () { draw(Math.max(0, +slider.value - 1)); };
  next.onclick = function () { draw(Math.min(total, +slider.value + 1)); };
  all.onclick = function () { draw(total); };
  slider.oninput = function () { draw(+slider.value); };
  draw(0);
}

function dpRenderGuess(root, cfg, dp) {
  const total = dp.n * dp.m;
  const t = dpTable(cfg, dp, {});
  root.appendChild(t.wrap);

  // Pick the cells to ask about: spread over the matrix, never the first row
  // or column of the interior, where the answer is nearly free.
  const pool = [];
  for (let i = 1; i <= dp.n; i++) for (let j = 1; j <= dp.m; j++) if (i + j > 2) pool.push((i - 1) * dp.m + (j - 1));
  for (let x = pool.length - 1; x > 0; x--) { const y = Math.floor(Math.random() * (x + 1)); const tmp = pool[x]; pool[x] = pool[y]; pool[y] = tmp; }
  const asked = pool.slice(0, Math.max(1, Math.min(cfg.questions, pool.length))).sort(function (p, q) { return p - q; });

  const ask = dpEl("div", "dpm-ask");
  const label = dpEl("span");
  const input = document.createElement("input");
  input.type = "number"; input.setAttribute("aria-label", "your value for this cell");
  const check = dpEl("button", null, "Check");
  const reveal = dpEl("button", "dpm-secondary", "Show me");
  ask.appendChild(label); ask.appendChild(input); ask.appendChild(check); ask.appendChild(reveal);
  root.appendChild(ask);

  const fb = dpEl("div", "dpm-feedback");
  root.appendChild(fb);
  const out = dpEl("div");
  root.appendChild(out);

  let qi = 0, answered = false, right = 0;

  function paint(upto) {
    for (let i = 0; i <= dp.n; i++) for (let j = 0; j <= dp.m; j++) {
      const td = t.cells[i][j];
      td.className = (i === 0 || j === 0) ? "dpm-border" : "";
      td.textContent = "";
      if (i === 0 || j === 0) { dpShowValue(cfg, dp, td, i, j, false); continue; }
      const idx = (i - 1) * dp.m + (j - 1);
      if (idx < upto) dpShowValue(cfg, dp, td, i, j, false);
      else td.classList.add("dpm-blank");
    }
  }

  function pose() {
    const k = asked[qi];
    const i = Math.floor(k / dp.m) + 1, j = (k % dp.m) + 1;
    paint(k);
    t.cells[i][j].classList.add("dpm-current");
    t.cells[i - 1][j - 1].classList.add("dpm-source");
    t.cells[i - 1][j].classList.add("dpm-source");
    t.cells[i][j - 1].classList.add("dpm-source");
    label.textContent = "Question " + (qi + 1) + " of " + asked.length +
      ": what goes in V(" + i + "," + j + ")?";
    input.value = ""; input.disabled = false;
    check.textContent = "Check"; check.disabled = false;
    fb.className = "dpm-feedback"; fb.textContent = "";
    out.textContent = "";
    answered = false;
    reveal.style.display = "";
  }

  function grade(giveUp) {
    const k = asked[qi];
    const i = Math.floor(k / dp.m) + 1, j = (k % dp.m) + 1;
    const want = dp.V[i][j];
    const got = parseInt(input.value, 10);
    const ok = !giveUp && got === want;
    if (ok) right++;
    fb.className = "dpm-feedback " + (ok ? "correct" : "incorrect");
    fb.textContent = (ok ? "Yes. " : (giveUp ? "" : "Not quite. ")) + dpRecurrence(cfg, dp, i, j) +
      (dp.ptr[i][j].length > 1 ? "  Two predecessors tie here, so more than one alignment is optimal." : "");
    dpShowValue(cfg, dp, t.cells[i][j], i, j, true);
    dpShowCandidates(cfg, dp, t.cells, i, j);
    t.cells[i][j].classList.remove("dpm-current");
    t.cells[i][j].classList.add(ok ? "dpm-right" : "dpm-wrong");
    input.disabled = true;
    answered = true;
    reveal.style.display = "none";
    if (qi < asked.length - 1) { check.textContent = "Next question →"; check.disabled = false; }
    else {
      check.textContent = "Done";
      check.disabled = true;
      label.textContent = right + " of " + asked.length + " right.";
      paint(total);
      const a = dpAlignmentBox(cfg, dp);
      a.tb.path.forEach(function (p) { t.cells[p[0]][p[1]].classList.add("dpm-path"); });
      out.appendChild(a.box);
    }
  }

  check.onclick = function () {
    if (!answered) { if (input.value.trim() === "") { input.focus(); return; } grade(false); }
    else { qi++; pose(); }
  };
  reveal.onclick = function () { if (!answered) grade(true); };
  input.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); check.click(); } };
  pose();
}

function dpRenderFill(root, cfg, dp) {
  const t = dpTable(cfg, dp, { inputs: true });
  root.appendChild(t.wrap);
  for (let i = 0; i <= dp.n; i++) for (let j = 0; j <= dp.m; j++) {
    if (i === 0 || j === 0) dpShowValue(cfg, dp, t.cells[i][j], i, j, false);
  }

  const controls = dpEl("div", "dpm-controls");
  const check = dpEl("button", null, "Check the matrix");
  const reveal = dpEl("button", "dpm-secondary", "Reveal the answers");
  const clear = dpEl("button", "dpm-secondary", "Clear");
  controls.appendChild(check); controls.appendChild(reveal); controls.appendChild(clear);
  root.appendChild(controls);

  const fb = dpEl("div", "dpm-feedback");
  root.appendChild(fb);
  const out = dpEl("div");
  root.appendChild(out);

  function each(fn) {
    for (let i = 1; i <= dp.n; i++) for (let j = 1; j <= dp.m; j++) fn(t.cells[i][j], i, j, t.cells[i][j].querySelector("input"));
  }

  function finish() {
    const a = dpAlignmentBox(cfg, dp);
    a.tb.path.forEach(function (p) { t.cells[p[0]][p[1]].classList.add("dpm-path"); });
    out.textContent = "";
    out.appendChild(a.box);
  }

  check.onclick = function () {
    let wrong = 0, blank = 0;
    each(function (td, i, j, inp) {
      td.classList.remove("dpm-right", "dpm-wrong");
      const raw = inp.value.trim().replace("−", "-");
      if (raw === "") { blank++; return; }
      if (parseInt(raw, 10) === dp.V[i][j]) td.classList.add("dpm-right");
      else { td.classList.add("dpm-wrong"); wrong++; }
    });
    out.textContent = "";
    if (blank === 0 && wrong === 0) {
      fb.className = "dpm-feedback correct";
      fb.textContent = "Every cell is right. The traceback is below.";
      finish();
    } else {
      fb.className = "dpm-feedback incorrect";
      fb.textContent = (wrong ? wrong + " cell" + (wrong === 1 ? "" : "s") + " wrong" : "Nothing wrong yet") +
        (blank ? ", " + blank + " still empty" : "") +
        ". Work left to right, top to bottom: a cell only needs the three above and to its left.";
    }
  };

  reveal.onclick = function () {
    each(function (td, i, j, inp) { inp.value = dpNum(dp.V[i][j]); td.classList.remove("dpm-wrong"); td.classList.add("dpm-right"); });
    fb.className = "dpm-feedback correct";
    fb.textContent = "Filled in. Compare it with what you had.";
    finish();
  };

  clear.onclick = function () {
    each(function (td, i, j, inp) { inp.value = ""; td.classList.remove("dpm-right", "dpm-wrong", "dpm-path"); });
    for (let i = 0; i <= dp.n; i++) for (let j = 0; j <= dp.m; j++) t.cells[i][j].classList.remove("dpm-path");
    fb.className = "dpm-feedback"; fb.textContent = "";
    out.textContent = "";
  };
}

// ------------------------------------------------- settings, when asked for

const DP_ALPHABETS = { dna: "ACGT", protein: "ACDEFGHIKLMNPQRSTVWY" };

function dpPick(alpha) { return alpha[Math.floor(Math.random() * alpha.length)]; }

// Anything outside ACGT in either sequence means we are looking at protein.
// BLOSUM62 settles it on its own, since there is no DNA reading of it.
function dpGuessAlphabet(cfg) {
  if (cfg.scoring === "blosum62") return "protein";
  return /[^ACGT]/.test(cfg.a + cfg.b) ? "protein" : "dna";
}

function dpRandomSeq(alpha, n) {
  let s = "";
  for (let i = 0; i < n; i++) s += dpPick(alpha);
  return s;
}

// The second sequence is a mutated copy of the first, not an independent draw.
// Two random strings align into noise, which teaches nothing; a copy with a few
// substitutions and indels gives a matrix with a path worth tracing.
function dpMutate(seq, alpha) {
  let out = "";
  for (let i = 0; i < seq.length; i++) {
    const r = Math.random();
    if (r < 0.10) continue;                              // deletion
    if (r < 0.18) out += dpPick(alpha) + seq[i];         // insertion
    else if (r < 0.36) out += dpPick(alpha);             // substitution
    else out += seq[i];
  }
  return out || seq;
}

function dpField(labelText, control) {
  const wrap = dpEl("div");
  const id = "dpf" + Math.random().toString(36).slice(2, 9);
  control.id = id;
  const lab = dpEl("label", null, labelText);
  lab.setAttribute("for", id);
  wrap.appendChild(lab);
  wrap.appendChild(control);
  return wrap;
}

function dpInput(type, value) {
  const i = document.createElement("input");
  i.type = type;
  i.value = value;
  return i;
}

function dpSelect(options, value) {
  const sel = document.createElement("select");
  options.forEach(function (o) {
    const opt = document.createElement("option");
    opt.value = o[0];
    opt.textContent = o[1];
    sel.appendChild(opt);
  });
  sel.value = value;
  return sel;
}

// The bar above the matrix. Everything on it writes straight into cfg and then
// asks for a redraw, so there is one source of truth and no "apply" button to
// forget to press.
function dpSettings(cfg, redraw) {
  const bar = dpEl("div", "dpm-settings");
  const seqA = dpInput("text", cfg.a);
  const seqB = dpInput("text", cfg.b);
  // Read the alphabet off the sequences rather than off the scoring: the
  // lecture opens on protein letters scored by plain identity, and a box
  // reading "DNA" there would be wrong and would make New pair hand back DNA.
  const alpha = dpSelect([["dna", "DNA"], ["protein", "Protein"]],
                         dpGuessAlphabet(cfg));
  const len = dpInput("number", cfg.a.length);
  len.min = 2; len.max = 24;
  const fresh = dpEl("button", "dpm-secondary", "New pair");
  const scoring = dpSelect([["identity", "match / mismatch"], ["blosum62", "BLOSUM62"]], cfg.scoring);
  const match = dpInput("number", cfg.match);
  const mismatch = dpInput("number", cfg.mismatch);
  const gap = dpInput("number", cfg.gap);
  const kind = dpSelect([["global", "global (Needleman\u2013Wunsch)"],
                         ["local", "local (Smith\u2013Waterman)"]], cfg.local ? "local" : "global");

  const matchField = dpField("Match", match);
  const mismatchField = dpField("Mismatch", mismatch);

  function sync() {
    // BLOSUM62 supplies every pair score, so match and mismatch mean nothing.
    const bl = scoring.value === "blosum62";
    matchField.classList.toggle("dpm-hidden", bl);
    mismatchField.classList.toggle("dpm-hidden", bl);
  }

  function apply() {
    const next = dpDefaults({
      a: seqA.value || cfg.a,
      b: seqB.value || cfg.b,
      scoring: scoring.value,
      match: parseInt(match.value, 10),
      mismatch: parseInt(mismatch.value, 10),
      gap: parseInt(gap.value, 10),
      local: kind.value === "local",
      questions: cfg.questions,
      showPointers: cfg.showPointers,
      caption: cfg.caption,
      mode: cfg.mode,
      modes: cfg.modes,
      controls: cfg.controls
    });
    Object.keys(next).forEach(function (k) { cfg[k] = next[k]; });
    seqA.value = cfg.a;
    seqB.value = cfg.b;
    sync();
    redraw();
  }

  fresh.onclick = function () {
    const letters = DP_ALPHABETS[alpha.value];
    const n = Math.max(2, Math.min(24, parseInt(len.value, 10) || 8));
    seqA.value = dpRandomSeq(letters, n);
    seqB.value = dpMutate(seqA.value, letters);
    // A protein pair with match/mismatch scoring is a wasted demonstration,
    // and BLOSUM62 on four nucleotides is meaningless, so follow the alphabet.
    scoring.value = alpha.value === "protein" ? "blosum62" : "identity";
    if (alpha.value === "protein" && parseInt(gap.value, 10) > -4) gap.value = -8;
    if (alpha.value === "dna" && parseInt(gap.value, 10) < -4) gap.value = -2;
    apply();
  };
  [seqA, seqB, scoring, match, mismatch, gap, kind].forEach(function (el) { el.onchange = apply; });

  bar.appendChild(dpField("Sequence A (rows)", seqA));
  bar.appendChild(dpField("Sequence B (columns)", seqB));
  bar.appendChild(dpField("Alphabet", alpha));
  bar.appendChild(dpField("Length", len));
  bar.appendChild(dpField("\u00a0", fresh));
  bar.appendChild(dpField("Scoring", scoring));
  bar.appendChild(matchField);
  bar.appendChild(mismatchField);
  bar.appendChild(dpField("Gap", gap));
  bar.appendChild(dpField("Alignment", kind));
  sync();
  return bar;
}

// --------------------------------------------------------------- entry point

const DP_MODE_LABEL = { step: "Step through", guess: "Guess a cell", fill: "Fill it in" };
const DP_TITLES = {
  step: "Step through the matrix",
  guess: "What goes in this cell?",
  fill: "Fill the matrix yourself"
};

function renderDP(containerId, config) {
  const container = document.getElementById(containerId);
  if (!container) return;
  dpStyle();
  const cfg = dpDefaults(config);
  if (!cfg.a.length || !cfg.b.length) { container.textContent = "renderDP: both sequences must be non-empty."; return; }

  container.textContent = "";
  const root = dpEl("div", "dpm");
  const heading = dpEl("h4");
  const sub = dpEl("p", "dpm-sub");
  root.appendChild(heading);
  root.appendChild(sub);

  // The settings bar and the mode switcher are opt-in. Without them the markup
  // is what it has always been, which matters: the Session 4 slide frames are
  // screenshots driven by selectors into this DOM.
  if (cfg.controls) root.appendChild(dpSettings(cfg, function () { draw(); }));

  let switcher = null;
  if (cfg.modes && cfg.modes.length > 1) {
    switcher = dpEl("div", "dpm-modes");
    cfg.modes.forEach(function (m) {
      const b = dpEl("button", null, DP_MODE_LABEL[m] || m);
      b.dataset.mode = m;
      b.onclick = function () { cfg.mode = m; draw(); };
      switcher.appendChild(b);
    });
    const wrap = dpEl("div", "dpm-controls");
    wrap.appendChild(switcher);
    root.appendChild(wrap);
  }

  const body = dpEl("div", "dpm-body");
  root.appendChild(body);
  container.appendChild(root);

  function draw() {
    const dp = computeDP(cfg);
    heading.textContent = cfg.caption || DP_TITLES[cfg.mode] || DP_TITLES.step;
    sub.textContent = dpSettingsLine(cfg);
    if (switcher) {
      [].forEach.call(switcher.children, function (b) {
        b.classList.toggle("on", b.dataset.mode === cfg.mode);
      });
    }
    body.textContent = "";
    if (cfg.mode === "guess") dpRenderGuess(body, cfg, dp);
    else if (cfg.mode === "fill") dpRenderFill(body, cfg, dp);
    else dpRenderStep(body, cfg, dp);
  }
  draw();
}

if (typeof window !== "undefined") {
  window.renderDP = renderDP;
  // blast-search.js builds on these. Exported rather than copied: a second
  // BLOSUM62 in the tree is a second thing to keep true.
  window.BLOSUM62 = BLOSUM62;
  window.computeDP = computeDP;
  window.dpTraceback = dpTraceback;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { computeDP: computeDP, dpTraceback: dpTraceback, dpDefaults: dpDefaults, BLOSUM62: BLOSUM62 };
}
