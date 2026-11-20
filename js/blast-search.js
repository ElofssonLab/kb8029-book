// Interactive BLAST: the six steps of a protein or nucleotide search, run on
// a database small enough to watch.
//
// No external dependencies, the same rule as dp-matrix.js and quiz-widget.js
// in this directory. This file does depend on dp-matrix.js being loaded first,
// for BLOSUM62 and nothing else: a second copy of that table is a second thing
// to keep true, and the whole point of the course's widgets is that the
// lecture, the notes and the live page cannot disagree about a number.
//
// Usage, from a qmd page:
//
//   ```{=html}
//   <script src="js/dp-matrix.js"></script>
//   <script src="js/blast-search.js"></script>
//   <div id="blast"></div>
//   <script>
//   renderBLAST("blast", {
//     alphabet: "protein",   // "protein" | "dna"
//     word: 3,               // W. blastp 3, blastn 11, megablast 28
//     threshold: 11,         // T, protein only. blastp default
//     controls: true,
//     step: 0
//   });
//   </script>
//   ```
//
// A `{=html}` block is dropped from the PDF build, so the PDF simply does not
// show the widget. Put the static worked example in the prose, not in here.
//
// Why the defaults are what they are. They are not from memory: blastp 2.16.0
// prints them in the footer of every report it writes —
//
//     Matrix: BLOSUM62
//     Gap Penalties: Existence: 11, Extension: 1
//     Neighboring words threshold: 11
//     Window for multiple hits: 40
//
// — and the nucleotide word sizes (blastn 11, megablast 28) were checked
// behaviourally: two 135 nt sequences sharing exactly 15 identical bases are
// found by blastn and missed by megablast.
//
// The one deliberate simplification is the gap cost. Real BLAST uses an affine
// penalty (open 11, extend 1); the banded step here uses a single linear gap,
// because this widget is about WHICH CELLS GET COMPUTED, not about reproducing
// a bit score. The settings line says so on screen rather than hiding it.

// ------------------------------------------------------------------ the data
//
// Protein: a 50-residue window of human beta-globin against five globins and
// one control. The window is HBB 26-75; the others are the regions that align
// to it, found with a local alignment rather than by eye. The distant globins
// come from the Pfam Globin (PF00042) seed alignment the course already ships
// as book/notebooks/data/session04-globin-seed.sto, so this demo and the
// Session 4 sequence logo are drawn from the same source.
//
// Checked against real blastp before being written down here. With the
// defaults, blastp finds HBA_HUMAN (E = 2e-09), HBP2_CASGL (E = 6e-05) and
// MYG_GALGA (E = 0.67), and MISSES MYG_HUMAN entirely. Sensitise the search
// (blastp -word_size 2 -threshold 9) and myoglobin appears at E = 3e-06,
// a better hit than the plant globin the default search did find. That miss
// is the lesson, so it must keep working: see blSelfCheck at the bottom of
// this file.

const BL_PROTEIN = {
  query: { name: "HBB_HUMAN", seq: "GEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDG" },
  db: [
    { name: "HBA_HUMAN",  seq: "YGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHV",
      note: "human alpha-globin" },
    { name: "MYG_HUMAN",  seq: "QEVLIRLFKGHPETLEKFDKFKHLKSEAEMKASEDLKKHGATVLTALGGILKKKGH",
      note: "human myoglobin" },
    { name: "MYG_GALGA",  seq: "QNILLRLFEQYPESQSYFPKLKNKSLGELKDTADIKAQADTVLKALGNIVKKKGN",
      note: "chicken myoglobin" },
    { name: "HBP2_CASGL", seq: "LKFFLKIFEIAPSAQKLFSFLKDSNVPLERNPKLKSHAMSVFLMTCESAVQLRK",
      note: "a plant haemoglobin" },
    { name: "GLB_MYCTO",  seq: "RRFYAHWFALDASVRDLFPPDMGAQRAAFGQALHWVYGELVAQRAE",
      note: "a bacterial globin" },
    { name: "SHUFFLED",   seq: "EGFRHGSYVLKTSGLDLGDEKFGPPKDLFQKTARVSFLVGMAPWANGVVA",
      note: "the query, shuffled: a control, homologous to nothing" }
  ]
};

// Nucleotide: one synthetic sequence and copies of it mutated to an exact,
// stated identity. Synthetic on purpose. Real sequences would be better
// biology but worse teaching, because here the identity is known to the base,
// so the chance that any given W-mer survives unmutated is a number students
// can work out before running anything:
//
//     identity   P(11-mer exact)   P(28-mer exact)
//       0.95         0.57              0.24
//       0.88         0.25              0.028
//       0.80         0.086             0.002
//
// and the search then either finds the sequence or does not. Checked against
// the real programs: blastn (W=11) finds all three copies, megablast (W=28)
// finds the 95% and 88% copies and MISSES the 80% one. Generated once with a
// fixed seed and written down, so every student sees the same database.
const BL_DNA = {
    query: { name: "query", seq:
      "CACCCGGCGTAAGGGTATTCCGCCCCACAAAACCAGCGGAACGGCGTTACTGTCGATGCTGTTACGGCCAGCGAGACGTGGATGCCTTATCCCATGTTTGACGTCACAACGTGATTCTTTTTTACAAAGCGCGCGAAGTTATACTGCCGGAGACGGGGCCAATAACATCTCCTGGGGGGGGGTGTGCGTGGTGATTGAAC" },
    db: [
      { name: "copy_95", seq:
        "CACCCGGCGTAAAGGTATCCCGCCACACAAAACCAGCGTAACGGCGTTACTGTCGATGCTGTTACGGCCAGCGAGACGTGGAAGCCTTATCCCCTGTTTGAAGTCACAACGTGATTCTTTTTTACAAAGCGCGCGAACTTATACTGCCGAAGACGGGGCCAATAACCTCTCCTGGGGGGGGGTGTGCGTGGTGATTGAAC",
        note: "95% identical" },   // measured identity 0.950
      { name: "copy_88", seq:
        "CACCCGGCGTACAGGGATTCCGCCCCACAAGCCCCGTGGAACGGCGTTACTGTCGAGTCTGTTACGGCCAGCGACACGTGGATGCCTTATCCCATGTTTGATGTCACTTCGTGATTCTTTTTTACAAAGCGCGCGAAGCTACTCAGGAGAAGACGGGGCCTTTAACATCTCCTGGGGGGGGGTGTGCGTGGGGATTGGAC",
        note: "88% identical" },   // measured identity 0.880
      { name: "copy_80", seq:
        "CACCCGGCGTCAGGGTAGCAGGCGCCACAACACCAGCGAAACAGCGATACTGTCGATGCTGTGCCGGCCAGCGGGATGTGCATGCCTCACCCTATGTTTGACGTCACGACGTGAGTGTTTTTTACGGCGCGGGCTAAGTTATTCTGATCCAGCCGTGGCCAATAACATCTCGTGGGGCTAGGTGTGTGTGGTGATTTAGC",
        note: "80% identical" },   // measured identity 0.800
      { name: "unrelated", seq:
        "TTCCCCCAGTATCTCGTCCTCGAATGTAGATCGATCTAGCCCTCCAAACTTATACGATGCTCACTGTCGTACCTAAACGCCTCCGTCGAGCAGAAGCTTGTTTGACAGTTCGCGAGCCTGTATTGAGGTCGTGTCGTTCTGCGAGGCCGTCTGTAACAGCTCGTTGCAAGAAATGGGCATTCGTGCCTTTCGGCGTTCTT",
        note: "an independent random sequence" },   // measured identity 0.230
    ]
};

const BL_AA = "ACDEFGHIKLMNPQRSTVWY";
const BL_NT = "ACGT";

// --------------------------------------------------------------- the engine

function blDefaults(cfg) {
  const c = Object.assign({
    alphabet: "protein",
    word: null,          // null = the default for the alphabet
    threshold: null,     // null = the default for the alphabet
    window: null,        // two-hit window; 0 means extend from a single hit
    xdrop: 7,            // X for the ungapped extension
    band: 6,             // half-width of the gapped band
    gap: null,           // linear, see the note at the top
    step: 0,
    focus: 0,            // which database sequence the matrix shows
    dbsize: "this",      // which database size E is scaled against, see BL_DBSIZES
    controls: false,
    steps: true          // show the step switcher
  }, cfg || {});
  if (c.word === null) c.word = c.alphabet === "dna" ? 11 : 3;
  if (c.threshold === null) c.threshold = c.alphabet === "dna" ? null : 11;
  // The two-hit rule is a protein heuristic. blastn extends from a single hit,
  // and says so by omission: a blastp report ends with "Neighboring words
  // threshold: 11" and "Window for multiple hits: 40", and a blastn report has
  // neither line. Window 0 here means single-hit.
  if (c.window === null) c.window = c.alphabet === "dna" ? 0 : 40;
  // blastn's real penalties are open 5, extend 2; blastp's are 11 and 1. Both
  // are flattened to one linear number, for the reason given at the top.
  if (c.gap === null) c.gap = c.alphabet === "dna" ? -5 : -8;
  return c;
}

// Everything a student pastes or opens stays in this tab. The page is a
// static file on a CDN: there is no server to send a sequence to, and none of
// this touches the network. Worth saying on the page, because people are
// rightly cautious about pasting unpublished sequence into a web form.
function blData(cfg) {
  if (cfg.custom && cfg.custom.query) return cfg.custom;
  return cfg.alphabet === "dna" ? BL_DNA : BL_PROTEIN;
}

// Guards, not preferences. The neighbourhood of one protein word is a walk
// over 20^W words, so the lookup table costs 8000 x (L - 2) at W = 3; and the
// matrix is drawn cell by cell. Both are fine at lecture scale and neither is
// fine for a whole chromosome, so the limits are stated and enforced rather
// than left for the browser to discover.
const BL_LIMITS = { queryProtein: 400, queryDna: 3000, subject: 3000, seqs: 40, total: 40000 };

function blGuessAlphabet(seq) {
  const s = seq.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s.length) return "protein";
  // ACGTUN covers nucleotide sequence including ambiguity; anything else in
  // quantity means protein. A protein can be all-alanine, but not in practice.
  const nt = (s.match(/[ACGTUN]/g) || []).length;
  return nt / s.length > 0.9 ? "dna" : "protein";
}

// Accepts FASTA, multi-FASTA, or a bare sequence with no header at all, which
// is what people actually paste.
function blParseFasta(text) {
  const out = [];
  let cur = null;
  String(text).split(/\r?\n/).forEach(function (line) {
    if (/^\s*>/.test(line)) {
      cur = { name: line.replace(/^\s*>\s*/, "").split(/\s+/)[0] || ("seq" + (out.length + 1)), seq: "" };
      out.push(cur);
    } else if (/\S/.test(line)) {
      if (!cur) { cur = { name: "query", seq: "" }; out.push(cur); }
      cur.seq += line.replace(/[^A-Za-z*]/g, "");
    }
  });
  return out.filter(function (r) { return r.seq.length; })
            .map(function (r) { return { name: r.name.slice(0, 24), seq: r.seq.toUpperCase() }; });
}

// Returns an error string, or null when the set is usable.
function blCheck(records, alphabet) {
  if (!records.length) return "No sequence found. Paste FASTA, or just the residues.";
  const maxQ = alphabet === "dna" ? BL_LIMITS.queryDna : BL_LIMITS.queryProtein;
  if (records[0].seq.length > maxQ) {
    return "The query is " + records[0].seq.length + " residues. This runs in your browser, "
      + "so it is capped at " + maxQ + " for " + (alphabet === "dna" ? "nucleotides" : "protein")
      + ". Paste a domain rather than a whole sequence.";
  }
  if (records.length > BL_LIMITS.seqs) return "At most " + BL_LIMITS.seqs + " sequences.";
  let total = 0;
  for (let i = 0; i < records.length; i++) {
    if (records[i].seq.length > BL_LIMITS.subject) {
      return records[i].name + " is " + records[i].seq.length + " residues; the limit is "
        + BL_LIMITS.subject + ".";
    }
    total += records[i].seq.length;
  }
  if (total > BL_LIMITS.total) return "That is " + total + " residues in all; the limit is "
    + BL_LIMITS.total + ".";
  return null;
}
function blAlpha(cfg) { return cfg.alphabet === "dna" ? BL_NT : BL_AA; }

// --------------------------------------------------------- is it significant?
//
// Karlin & Altschul (1990): the scores of local alignments between unrelated
// sequences follow an extreme-value distribution, and the number of alignments
// scoring at least S expected by chance in a search of a query of length m
// against a database of n residues is
//
//     E = K m n exp(-lambda S)
//
// lambda is not a constant of nature and not a number worth asserting: it is
// the unique positive root of
//
//     sum_ij p_i p_j exp(lambda s_ij) = 1
//
// over the scoring scheme in use and a background model, and the page solves it
// below rather than quoting it. For BLOSUM62 with the Robinson & Robinson
// background that root comes out at 0.3176, which is the value NCBI publishes
// for an ungapped BLOSUM62 search. The nucleotide schemes land a little above
// the published numbers (0.634 against 0.625 for +2/-3) because this solves the
// idealised equation and makes no finite-length correction.
//
// K has no such tidy root, so it is taken from the published tables and said to
// be. It only scales E linearly; lambda is in the exponent and is what the
// argument actually turns on.

// Robinson & Robinson (1991) amino-acid frequencies, the background BLAST uses.
const BL_BG_AA = {
  A: 0.07805, R: 0.05129, N: 0.04487, D: 0.05364, C: 0.01925, Q: 0.04264,
  E: 0.06295, G: 0.07377, H: 0.02199, I: 0.05142, L: 0.09019, K: 0.05744,
  M: 0.02243, F: 0.03856, P: 0.05203, S: 0.07120, T: 0.05841, W: 0.01330,
  Y: 0.03216, V: 0.06441
};

// Published K for the ungapped schemes this widget uses.
const BL_K = { protein: 0.134, dna: 0.410 };

// Database sizes to scale E against, so that "is it significant" can be asked
// of the same alignment at the scale it would really be searched at.
const BL_DBSIZES = [
  { key: "this", label: "this database" },
  { key: "swissprot", label: "Swiss-Prot (~2x10^8 residues)", n: 2.0e8 },
  { key: "uniprot", label: "UniProtKB (~9x10^10 residues)", n: 9.0e10 }
];

function blBackground(cfg) {
  if (cfg.alphabet === "dna") return { A: 0.25, C: 0.25, G: 0.25, T: 0.25 };
  return BL_BG_AA;
}

// The positive root of sum_ij p_i p_j exp(lambda s_ij) = 1, by bisection. The
// root exists only when the expected score per aligned pair is negative, which
// is what makes a local alignment meaningful at all: with a positive expected
// score the best alignment of two random sequences just grows with their
// length and no threshold separates signal from noise.
function blLambda(cfg) {
  const s = blScore(cfg);
  const p = blBackground(cfg);
  const letters = Object.keys(p);
  let expected = 0;
  letters.forEach(function (a) {
    letters.forEach(function (b) { expected += p[a] * p[b] * s(a, b); });
  });
  if (!(expected < 0)) return { lambda: null, expected: expected };
  function f(lam) {
    let t = 0;
    letters.forEach(function (a) {
      letters.forEach(function (b) { t += p[a] * p[b] * Math.exp(lam * s(a, b)); });
    });
    return t - 1;
  }
  let lo = 1e-9, hi = 5;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid; else hi = mid;
  }
  return { lambda: (lo + hi) / 2, expected: expected };
}

function blBits(S, lambda, K) { return (lambda * S - Math.log(K)) / Math.LN2; }
function blE(S, lambda, K, m, n) { return K * m * n * Math.exp(-lambda * S); }

// Effective lengths and search spaces span 7.5 to 7x10^11 in this one step, so
// neither commas everywhere nor exponents everywhere is readable.
function blLen(v) {
  if (v < 10) return v.toFixed(1);
  if (v < 1e6) return blNum(Math.round(v));
  return v.toExponential(1).replace("e+", "e");
}

function blFmtE(e) {
  if (!isFinite(e)) return "-";
  if (e >= 1000 || e < 0.01) return e.toExponential(1).replace("e+", "e").replace("e-", "e-");
  if (e >= 10) return e.toFixed(0);
  if (e >= 1) return e.toFixed(1);
  return e.toFixed(3);
}

// ---------------------------------------------------------------------------
// Where the E-value comes from.
//
// E = K m n exp(-lambda S) is easy to print and hard to believe. The claim
// underneath it is that the best ungapped score between two *random* sequences
// follows a known distribution, and that a real score means something only
// when it is read against that distribution. None of that has to be taken on
// trust: random pairs are cheap, so the page samples the null distribution
// itself and draws the predicted curve over the top of the samples. If the two
// ever stop agreeing, the picture says so without anyone having to notice.
//
// Two details decide whether the curve lands on the bars.
//
//   - Scores are integers, so the continuous curve is read across each score's
//     own interval, x-0.5 to x+0.5, rather than at the point.
//
//   - m and n are not the lengths BLAST uses. An alignment that starts in the
//     last few residues of either sequence has no room left to reach a high
//     score, so the usable search space is smaller than m*n. BLAST subtracts
//     ln(K m n)/H from each length; the result is the "effective search space"
//     printed in every report. Here that takes 50 x 311 down to about 32 x 293,
//     a factor of 1.6, and it is plainly visible as the gap between the plain
//     curve and the samples. The table keeps the plain formula, which is what
//     the step teaches and what the notes say it uses; the chart draws both,
//     because a curve that misses the data under it teaches the wrong lesson.

// Deterministic, so that the distribution is the same on every reload and a
// screenshot taken for the slides matches what the student sees. mulberry32.
function blRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Relative entropy of the scoring scheme, in nats: H = lambda * sum q_ij s_ij,
// with q_ij = p_i p_j exp(lambda s_ij) the target frequencies lambda implies.
// For BLOSUM62 on the Robinson & Robinson background this comes out at 0.401,
// which is the H NCBI publishes beside lambda and K -- so getting it right is
// a second, independent check that the matrix and the background agree.
function blEntropy(cfg, lambda) {
  const s = blScore(cfg);
  const p = blBackground(cfg);
  const letters = Object.keys(p);
  let h = 0;
  letters.forEach(function (a) {
    letters.forEach(function (b) {
      h += p[a] * p[b] * Math.exp(lambda * s(a, b)) * s(a, b);
    });
  });
  return h * lambda;
}

// The effective search space: both lengths shortened by ln(K m n)/H, which
// depends on the lengths, so it is iterated to a fixed point. Floored at 1/K,
// as BLAST floors it, so a very short query cannot drive a length negative.
function blEffective(m, n, K, H) {
  if (!(H > 0)) return { m: m, n: n };
  let mE = m, nE = n;
  for (let i = 0; i < 10; i++) {
    const cut = Math.log(K * mE * nE) / H;
    if (!isFinite(cut) || cut <= 0) break;
    mE = Math.max(1 / K, m - cut);
    nE = Math.max(1 / K, n - cut);
  }
  return { m: mE, n: nE };
}

// The best ungapped score between two sequences is the best-scoring segment on
// some one diagonal, so each diagonal is a one-dimensional maximum-subarray
// problem and Kadane's scan settles it in a single pass. This is deliberately
// the honest best rather than what the search would have found: a null
// distribution built from seeded hits would be a distribution of what BLAST
// happens to look at, not of what the score could have been.
function blMaxSegment(A, B, S) {
  const la = A.length, lb = B.length;
  let best = 0;
  for (let d = -(la - 1); d < lb; d++) {
    let run = 0;
    let i = d < 0 ? -d : 0, j = d < 0 ? 0 : d;
    for (; i < la && j < lb; i++, j++) {
      run += S[A[i]][B[j]];
      if (run < 0) run = 0;
      else if (run > best) best = run;
    }
  }
  return best;
}

// How much scanning one sample costs is m*n, and a nucleotide query is four
// times the length of the protein one, so the number of pairs is set by a
// budget of cells rather than written down. About 0.3 s of work either way.
//
// The budget has to be a ceiling and not just a target, because the "search
// your own sequence" panel accepts a 400-residue query against 40,000 residues
// of database. That is 16 million cells per pair: a floor of 500 pairs would
// ask the browser for eight billion cell operations and freeze the tab for
// minutes. Past the ceiling the panel samples nothing and says so, which is
// better than a page that appears to have crashed.
const BL_SAMPLE_CELLS = 3.2e7;
const BL_SAMPLE_CEILING = 1.6e8;   // a hard stop, even when more pairs are asked for
const BL_SAMPLE_FLOOR = 500;       // below this a histogram is too ragged to read
const BL_SAMPLE_MIN = 150;         // below this, do not draw at all
const BL_SAMPLE_SEED = 20260419;
const BL_SAMPLE_CACHE = {};

function blSampleTrials(m, n, mult) {
  const cells = Math.max(1, m * n);
  const k = mult || 1;
  let t = Math.round(BL_SAMPLE_CELLS * k / cells);
  if (t < BL_SAMPLE_FLOOR) t = BL_SAMPLE_FLOOR;
  t = Math.min(t, Math.floor(BL_SAMPLE_CEILING / cells));
  return Math.max(0, Math.min(8000, t));
}

function blSampleKey(cfg, m, n, mult) {
  return [cfg.alphabet, m, n, BL_SAMPLE_SEED, blSampleTrials(m, n, mult)].join(":");
}

function blSampleReady(cfg, m, n, mult) {
  return !!BL_SAMPLE_CACHE[blSampleKey(cfg, m, n, mult)];
}

// Random sequences of the same two lengths, drawn letter by letter from the
// same background the lambda above was solved against. Shuffling the real
// query would be the other obvious choice, and is the control the SHUFFLED
// database entry already provides; the background is used here instead so that
// any disagreement between samples and curve is a disagreement about the
// theory and not about composition.
function blSampleNull(cfg, m, n, mult) {
  const key = blSampleKey(cfg, m, n, mult);
  if (BL_SAMPLE_CACHE[key]) return BL_SAMPLE_CACHE[key];
  const trials = blSampleTrials(m, n, mult);
  if (trials < 1) return { trials: 0, counts: {}, max: 0, ms: 0 };
  const p = blBackground(cfg);
  const letters = Object.keys(p);
  const sc = blScore(cfg);
  const S = letters.map(function (a) {
    return letters.map(function (b) { return sc(a, b); });
  });
  const cum = [];
  let acc = 0;
  letters.forEach(function (L) { acc += p[L]; cum.push(acc); });
  const rnd = blRng(BL_SAMPLE_SEED);
  function draw(len) {
    const out = new Int32Array(len);
    for (let i = 0; i < len; i++) {
      const u = rnd();
      let k = 0;
      while (k < cum.length - 1 && u > cum[k]) k++;
      out[i] = k;
    }
    return out;
  }
  const counts = {};
  let max = 0;
  const t0 = Date.now();
  for (let t = 0; t < trials; t++) {
    const v = blMaxSegment(draw(m), draw(n), S);
    counts[v] = (counts[v] || 0) + 1;
    if (v > max) max = v;
  }
  const res = { trials: trials, counts: counts, max: max, ms: Date.now() - t0 };
  BL_SAMPLE_CACHE[key] = res;
  return res;
}

// How many of the sampled pairs reached at least this score.
function blAtLeast(samples, x) {
  let t = 0;
  Object.keys(samples.counts).forEach(function (k) {
    if (Number(k) >= x) t += samples.counts[k];
  });
  return t;
}

function blScore(cfg) {
  if (cfg.alphabet === "dna") {
    // blastn's defaults: +2 for a match, -3 for a mismatch.
    return function (x, y) { return x === y ? 2 : -3; };
  }
  const B = (typeof BLOSUM62 !== "undefined") ? BLOSUM62 : (window.BLOSUM62 || null);
  if (!B) throw new Error("blast-search.js needs dp-matrix.js loaded first (for BLOSUM62)");
  return function (x, y) {
    const row = B[x] || B["X"];
    const v = row[y];
    return v === undefined ? B["X"]["X"] : v;
  };
}

// Every overlapping word of the query, with the position it came from.
function blWords(seq, W) {
  const out = [];
  for (let i = 0; i + W <= seq.length; i++) out.push({ pos: i, word: seq.slice(i, i + W) });
  return out;
}

// Step 2, and the only step that distinguishes BLAST from FASTA.
//
// For protein, every W-letter word scoring at least T against this one, which
// for W = 3 means walking all 8000 three-letter words. For DNA there is no
// neighbourhood: blastn wants exact matches, so the "neighbourhood" of a word
// is the word. Saying that out loud is the point, so it returns the same
// shape either way rather than being special-cased by the caller.
function blNeighbourhood(word, T, cfg) {
  const s = blScore(cfg);
  if (cfg.alphabet === "dna") return [{ word: word, score: word.length * 2, self: true }];
  const alpha = BL_AA, W = word.length, out = [];
  const buf = new Array(W);
  (function rec(k, score) {
    // The best any remaining position can add is 11 (W-W in BLOSUM62), so a
    // partial word that cannot reach T even at its best is abandoned here
    // rather than enumerated. Without this, W = 5 is 3.2 million words.
    if (score + (W - k) * 11 < T) return;
    if (k === W) { if (score >= T) out.push({ word: buf.join(""), score: score, self: buf.join("") === word }); return; }
    for (let a = 0; a < alpha.length; a++) {
      buf[k] = alpha[a];
      rec(k + 1, score + s(word[k], alpha[a]));
    }
  })(0, 0);
  out.sort(function (x, y) { return y.score - x.score || (x.word < y.word ? -1 : 1); });
  return out;
}

// The lookup table BLAST actually builds: every neighbourhood word of every
// query word, pointing back at the query positions that produced it.
function blLookup(cfg) {
  const q = blData(cfg).query.seq;
  const table = new Map();
  let generated = 0;
  blWords(q, cfg.word).forEach(function (w) {
    const nb = blNeighbourhood(w.word, cfg.threshold, cfg);
    generated += nb.length;
    nb.forEach(function (n) {
      if (!table.has(n.word)) table.set(n.word, []);
      table.get(n.word).push({ qpos: w.pos, score: n.score });
    });
  });
  return { table: table, generated: generated, distinct: table.size };
}

// Step 3: where in a subject does any lookup word occur?
function blScan(cfg, subject, lookup) {
  const hits = [];
  for (let j = 0; j + cfg.word <= subject.length; j++) {
    const w = subject.slice(j, j + cfg.word);
    const qs = lookup.table.get(w);
    if (!qs) continue;
    qs.forEach(function (q) {
      hits.push({ qpos: q.qpos, spos: j, word: w, score: q.score });
    });
  }
  // diag is (subject position - query position): one number per diagonal of
  // the alignment matrix, which is what "on the same diagonal" means.
  hits.forEach(function (h) { h.diag = h.spos - h.qpos; });
  return hits;
}

// Step 4: BLAST2's two-hit rule. A seed is only extended if a second,
// non-overlapping hit sits on the same diagonal within `window` residues.
// This is what made gapped BLAST faster than the 1990 version despite doing
// more work per seed: most isolated hits are noise and are never extended.
function blTwoHit(cfg, hits) {
  const byDiag = new Map();
  hits.forEach(function (h) {
    if (!byDiag.has(h.diag)) byDiag.set(h.diag, []);
    byDiag.get(h.diag).push(h);
  });
  const seeds = [];
  if (!cfg.window) {
    // Single-hit extension: every word hit is a seed in its own right.
    hits.forEach(function (h) { seeds.push({ first: h, second: h, diag: h.diag, single: true }); });
    return { seeds: seeds, byDiag: byDiag, single: true };
  }
  byDiag.forEach(function (list, diag) {
    list.sort(function (a, b) { return a.qpos - b.qpos; });
    // Two hits, not two CONSECUTIVE hits. Word hits cluster: a conserved
    // stretch gives overlapping hits one residue apart, and comparing only
    // neighbours in the list then finds nothing, because everything overlaps.
    // NCBI's rule is a second non-overlapping hit on the same diagonal within
    // the window, so each hit is checked against the ones that follow it.
    for (let i = 0; i < list.length; i++) {
      for (let k = i + 1; k < list.length; k++) {
        const apart = list[k].qpos - list[i].qpos;
        if (apart < cfg.word) continue;     // overlapping: one hit, not two
        if (apart > cfg.window) break;      // sorted, so nothing further qualifies
        seeds.push({ first: list[i], second: list[k], diag: diag });
        break;                              // one seed per left-hand hit
      }
    }
  });
  return { seeds: seeds, byDiag: byDiag };
}

// Step 5: extend along the diagonal without gaps, stopping when the running
// score falls X below the best seen. Returns the HSP and the trail, so the
// drop-off can be drawn rather than asserted.
function blExtend(cfg, query, subject, qpos, spos) {
  const s = blScore(cfg);
  const W = cfg.word;
  let score = 0;
  for (let k = 0; k < W; k++) score += s(query[qpos + k], subject[spos + k]);

  const trail = [];
  function walk(dir) {
    let i = dir < 0 ? qpos - 1 : qpos + W, j = dir < 0 ? spos - 1 : spos + W;
    let run = score, best = score, bestI = i - dir, bestJ = j - dir, steps = 0;
    while (i >= 0 && j >= 0 && i < query.length && j < subject.length) {
      run += s(query[i], subject[j]);
      steps++;
      trail.push({ i: i, j: j, run: run, dir: dir });
      if (run > best) { best = run; bestI = i; bestJ = j; }
      if (best - run >= cfg.xdrop) break;
      i += dir; j += dir;
    }
    return { best: best, i: bestI, j: bestJ, steps: steps };
  }
  const left = walk(-1), right = walk(1);
  const qs = Math.min(qpos, left.i + (left.steps ? 0 : 1));
  const ss = Math.min(spos, left.j + (left.steps ? 0 : 1));
  const qe = Math.max(qpos + W - 1, right.i);
  const se = Math.max(spos + W - 1, right.j);
  let total = 0;
  for (let k = 0; k <= qe - qs; k++) total += s(query[qs + k], subject[ss + k]);
  return { qs: qs, qe: qe, ss: ss, se: se, score: total, trail: trail };
}

// Step 6: Smith-Waterman, but only inside a band around the HSP's diagonal.
// Counts every cell it touches, because the count is the whole argument.
function blBanded(cfg, query, subject, hsp) {
  const s = blScore(cfg);
  const n = query.length, m = subject.length;
  const diag = hsp.ss - hsp.qs;
  const V = [], cells = [];
  for (let i = 0; i <= n; i++) V.push(new Array(m + 1).fill(0));
  let computed = 0, best = 0, bi = 0, bj = 0;
  for (let i = 1; i <= n; i++) {
    const lo = Math.max(1, i + diag - cfg.band), hi = Math.min(m, i + diag + cfg.band);
    for (let j = lo; j <= hi; j++) {
      const d = V[i - 1][j - 1] + s(query[i - 1], subject[j - 1]);
      const u = V[i - 1][j] + cfg.gap;
      const l = V[i][j - 1] + cfg.gap;
      const v = Math.max(0, d, u, l);
      V[i][j] = v;
      computed++;
      cells.push({ i: i, j: j });
      if (v > best) { best = v; bi = i; bj = j; }
    }
  }
  // Traceback, diagonal first, stopping at the first zero.
  const path = [];
  let i = bi, j = bj;
  while (i > 0 && j > 0 && V[i][j] > 0) {
    path.push({ i: i, j: j });
    const d = V[i - 1][j - 1] + s(query[i - 1], subject[j - 1]);
    if (V[i][j] === d) { i--; j--; }
    else if (V[i][j] === V[i - 1][j] + cfg.gap) i--;
    else j--;
  }
  path.reverse();
  return { V: V, cells: cells, computed: computed, score: best, path: path, full: n * m };
}

// The same search, one notch more sensitive: T lowered for protein, the word
// shortened for nucleotides. Run alongside the real one so the widget can show
// what the current settings MISS. Without this the speed-up looks free, and it
// is not: with blastp's own defaults this database loses human myoglobin, a
// textbook homolog of the query, which a search at T = 9 finds easily.
function blSensitive(cfg) {
  const c = blDefaults(Object.assign({}, cfg));
  if (c.alphabet === "dna") c.word = 11;
  else { c.word = 3; c.threshold = 9; }
  return c;
}

// The whole pipeline for one subject, so the tally and the drawing agree.
function blRun(cfg, subject, lookup) {
  const q = blData(cfg).query.seq;
  const hits = blScan(cfg, subject, lookup);
  const two = blTwoHit(cfg, hits);
  let hsp = null, band = null;
  if (two.seeds.length) {
    // Extend from the best-scoring surviving seed.
    let bestSeed = two.seeds[0];
    two.seeds.forEach(function (sd) {
      if (sd.first.score + sd.second.score > bestSeed.first.score + bestSeed.second.score) bestSeed = sd;
    });
    hsp = blExtend(cfg, q, subject, bestSeed.first.qpos, bestSeed.first.spos);
    band = blBanded(cfg, q, subject, hsp);
  }
  return {
    hits: hits, two: two, hsp: hsp, band: band,
    full: q.length * subject.length,
    computed: band ? band.computed : 0
  };
}

function blAlignmentText(cfg, query, subject, band) {
  if (!band || !band.path.length) return "";
  const s = blScore(cfg);
  let a = "", mid = "", b = "";
  let pi = band.path[0].i - 1, pj = band.path[0].j - 1;
  band.path.forEach(function (p, k) {
    if (k === 0) { a += query[p.i - 1]; b += subject[p.j - 1]; }
    else if (p.i === pi + 1 && p.j === pj + 1) { a += query[p.i - 1]; b += subject[p.j - 1]; }
    else if (p.i === pi + 1) { a += query[p.i - 1]; b += "-"; }
    else { a += "-"; b += subject[p.j - 1]; }
    const x = a[a.length - 1], y = b[b.length - 1];
    if (x === "-" || y === "-") mid += " ";
    else if (x === y) mid += x;
    else mid += s(x, y) > 0 ? "+" : " ";
    pi = p.i; pj = p.j;
  });
  return a + "\n" + mid + "\n" + b;
}

// ------------------------------------------------------------------- styling

function blStyle() {
  if (document.getElementById("blast-search-style")) return;
  const style = document.createElement("style");
  style.id = "blast-search-style";
  style.textContent = `
    .bls { border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; padding: 1em 1.2em 1.2em; margin-bottom: 1.2em; }
    .bls h4 { margin: 0 0 0.2em; font-size: 1em; }
    .bls .bls-sub { color: rgba(0,0,0,0.6); font-size: 0.88em; margin: 0 0 0.9em; }
    .bls .bls-mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
    .bls .bls-steps { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 0.9em; }
    .bls .bls-steps button { border: 1px solid rgba(0,0,0,0.18); background: transparent; color: inherit;
      border-radius: 6px; font-size: 0.82em; padding: 5px 10px; cursor: pointer; }
    .bls .bls-steps button:hover { background: rgba(0,0,0,0.06); }
    .bls .bls-steps button.on { background: #0d6efd; color: #fff; border-color: #0d6efd; }
    .bls .bls-settings { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: flex-end;
      padding: 0.7em 0.9em; margin-bottom: 0.9em; border: 1px solid rgba(0,0,0,0.12);
      border-radius: 8px; background: rgba(0,0,0,0.02); }
    .bls .bls-settings label { display: block; font-size: 0.76em; color: rgba(0,0,0,0.6); margin-bottom: 2px; }
    .bls .bls-settings input, .bls .bls-settings select { font: inherit; font-size: 0.9em;
      padding: 4px 7px; border: 1px solid rgba(0,0,0,0.2); border-radius: 5px; background: #fff; color: inherit; }
    .bls .bls-settings input[type=number] { width: 4.6em; }
    .bls .bls-say { margin: 0.5em 0 0.8em; font-size: 0.92em; }
    .bls .bls-seq { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.86em;
      white-space: pre-wrap; word-break: break-all; line-height: 1.7; }
    .bls .bls-seq span.w { background: #cfe2ff; border-radius: 2px; }
    .bls .bls-seq span.hit { background: #ffd79a; border-radius: 2px; }
    .bls .bls-seq span.seed { background: #a8dab5; border-radius: 2px; font-weight: 600; }
    .bls .bls-chips { display: flex; flex-wrap: wrap; gap: 4px; margin: 0.4em 0 0.8em; }
    .bls .bls-chip { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.8em;
      border: 1px solid rgba(0,0,0,0.18); border-radius: 4px; padding: 2px 6px; cursor: pointer; background: #fff; }
    .bls .bls-chip:hover { background: rgba(0,0,0,0.06); }
    .bls .bls-chip.on { background: #0d6efd; color: #fff; border-color: #0d6efd; }
    .bls table.bls-nb { border-collapse: collapse; font-size: 0.85em; margin: 0.3em 0 0.6em; }
    .bls table.bls-nb td, .bls table.bls-nb th { border: 1px solid rgba(0,0,0,0.15); padding: 3px 9px; text-align: left; }
    .bls table.bls-nb th { background: rgba(0,0,0,0.05); }
    .bls table.bls-nb td.n { text-align: right; font-variant-numeric: tabular-nums; }
    .bls table.bls-nb tr.self td { background: #cfe2ff; font-weight: 600; }
    .bls .bls-db { width: 100%; border-collapse: collapse; font-size: 0.86em; margin-bottom: 0.6em; }
    .bls .bls-db td, .bls .bls-db th { border-bottom: 1px solid rgba(0,0,0,0.1); padding: 5px 8px; text-align: left; }
    .bls .bls-db th { font-size: 0.8em; color: rgba(0,0,0,0.6); font-weight: 600; }
    .bls .bls-db td.n { text-align: right; font-variant-numeric: tabular-nums; }
    .bls .bls-db tr.dead td { color: rgba(0,0,0,0.38); }
    .bls .bls-db tr.focus td { background: #e7f1ff; }
    .bls .bls-db tr.pick { cursor: pointer; }
    .bls .bls-db tr.pick:hover td { background: rgba(0,0,0,0.04); }
    .bls .bls-gridwrap { overflow-x: auto; margin: 0.4em 0 0.3em; }
    .bls .bls-grid { display: grid; gap: 0; width: max-content; }
    .bls .bls-grid i { width: var(--bl-cell); height: var(--bl-cell); display: block;
      background: rgba(0,0,0,0.025); outline: 0.5px solid rgba(0,0,0,0.05); }
    .bls .bls-grid b.bls-lab { font-family: ui-monospace, Menlo, Consolas, monospace;
      font-weight: 400; font-size: 8px; line-height: var(--bl-cell); height: var(--bl-cell);
      color: rgba(0,0,0,0.55); text-align: center; overflow: visible; white-space: nowrap; }
    .bls .bls-grid b.bls-rowlab { width: 15px; text-align: right; padding-right: 3px; }
    .bls .bls-grid i.band { background: #dbeafe; }
    .bls .bls-grid i.hit { background: #f0a030; }
    .bls .bls-grid i.seed { background: #198754; }
    .bls .bls-grid i.hsp { background: #0d6efd; }
    .bls .bls-grid i.path { background: #0f5132; }
    .bls .bls-axis { font-size: 0.74em; color: rgba(0,0,0,0.55); margin-bottom: 0.7em; }
    .bls .bls-align { font-family: ui-monospace, Menlo, Consolas, monospace; white-space: pre; overflow-x: auto;
      background: rgba(0,0,0,0.04); border-radius: 6px; padding: 0.7em 0.9em; margin: 0.5em 0; font-size: 0.86em; }
    .bls .bls-tally { border-top: 1px solid rgba(0,0,0,0.12); margin-top: 0.9em; padding-top: 0.7em; font-size: 0.88em; }
    .bls .bls-bar { height: 10px; border-radius: 5px; background: rgba(0,0,0,0.08); overflow: hidden; margin: 0.4em 0; }
    .bls .bls-bar span { display: block; height: 100%; background: #0d6efd; }
    .bls .bls-big { font-size: 1.05em; font-weight: 600; }
    .bls .bls-note { font-size: 0.84em; color: rgba(0,0,0,0.6); margin-top: 0.4em; }
    .bls .bls-own { border: 1px solid rgba(0,0,0,0.12); border-radius: 8px;
      padding: 0.6em 0.9em; margin-bottom: 0.9em; background: rgba(0,0,0,0.02); }
    .bls .bls-own summary { cursor: pointer; font-size: 0.9em; font-weight: 600; }
    .bls .bls-own .bls-note { margin: 0.5em 0; }
    .bls .bls-ta { width: 100%; font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 0.82em; padding: 7px 9px; border: 1px solid rgba(0,0,0,0.2);
      border-radius: 6px; background: #fff; color: inherit; resize: vertical; }
    .bls .bls-file { font-size: 0.82em; max-width: 15em; }
    .bls .bls-msg { font-size: 0.85em; }
    .bls .bls-msg.ok { color: #0f5132; }
    .bls .bls-msg.bad { color: #b02a37; }
    .bls .bls-warn { background: #fff3cd; border-radius: 6px; padding: 0.6em 0.9em; font-size: 0.88em; margin: 0.5em 0; }
    .bls .bls-evd { margin: 0.9em 0 0.2em; }
    .bls .bls-evd svg { width: 100%; height: auto; display: block;
      background: rgba(0,0,0,0.015); border-radius: 6px; }
    .bls .bls-evd .bls-key { font-size: 0.8em; color: rgba(0,0,0,0.65);
      margin: 0.45em 0 0.2em; }
    .bls .bls-evd .bls-key i { display: inline-block; width: 1.6em; height: 0.55em;
      vertical-align: middle; margin-right: 0.4em; border-radius: 2px; }
    .bls .bls-evd button { margin-top: 0.5em; }
  `;
  document.head.appendChild(style);
}

function blEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function blNum(n) { return n.toLocaleString("en-GB"); }

// A subject-by-query grid, with both sequences written along the edges.
// Marks is a map "i,j" -> class name; later classes win, which is how the
// path draws over the band.
//
// The cell size follows the subject length, because a 200-base nucleotide
// search and a 50-residue protein one both have to fit on a slide. Residue
// letters are only drawn when the cells are wide enough to hold them;
// below that the edges carry a position every ten instead, which is still
// enough to say where on the sequence a hit falls.
const BL_COLOUR = { band: "#dbeafe", hit: "#f0a030", seed: "#198754",
                    hsp: "#0d6efd", path: "#0f5132" };
const BL_DOM_CELLS = 9000;   // above this, one <i> per cell stops being sane

// The same picture on a canvas. Used only for pasted sequences large enough
// that a DOM grid would be tens of thousands of elements; the built-in
// databases stay on the DOM path, which is what the slide figures screenshot.
function blGridCanvas(cfg, qseq, sseq, marks) {
  const n = qseq.length, m = sseq.length;
  const size = Math.max(1, Math.min(6, Math.floor(1300 / m)));
  const wrap = blEl("div", "bls-gridwrap");
  const c = document.createElement("canvas");
  c.width = m * size;
  c.height = n * size;
  c.style.maxWidth = "100%";
  const x = c.getContext("2d");
  x.fillStyle = "#f7f7f7";
  x.fillRect(0, 0, c.width, c.height);
  marks.forEach(function (cls, key) {
    const parts = key.split(",");
    x.fillStyle = BL_COLOUR[cls] || "#999";
    x.fillRect((+parts[1] - 1) * size, (+parts[0] - 1) * size, size, size);
  });
  x.strokeStyle = "rgba(0,0,0,0.15)";
  x.strokeRect(0.5, 0.5, c.width - 1, c.height - 1);
  wrap.appendChild(c);
  return wrap;
}

function blGrid(cfg, qseq, sseq, marks) {
  const n = qseq.length, m = sseq.length;
  if (n * m > BL_DOM_CELLS) return blGridCanvas(cfg, qseq, sseq, marks);
  const size = m > 140 ? 5 : (m > 90 ? 7 : 11);
  const letters = size >= 9;
  const labW = 15;

  const wrap = blEl("div", "bls-gridwrap");
  const g = blEl("div", "bls-grid");
  g.style.gridTemplateColumns = labW + "px repeat(" + m + ", " + size + "px)";
  g.style.setProperty("--bl-cell", size + "px");

  function edge(text, cls) { return blEl("b", "bls-lab " + cls, text); }

  // Top edge: the subject.
  g.appendChild(edge("", "bls-corner"));
  for (let j = 0; j < m; j++) {
    g.appendChild(edge(letters ? sseq[j] : ((j + 1) % 10 === 0 ? String(j + 1) : ""), "bls-collab"));
  }
  // Each row: the query residue, then the cells.
  for (let i = 1; i <= n; i++) {
    g.appendChild(edge(letters ? qseq[i - 1] : (i % 10 === 0 ? String(i) : ""), "bls-rowlab"));
    for (let j = 1; j <= m; j++) {
      const cell = blEl("i");
      const k = marks.get(i + "," + j);
      if (k) cell.className = k;
      g.appendChild(cell);
    }
  }
  wrap.appendChild(g);
  return wrap;
}

// ------------------------------------------------------------------ the page

function blSvg(tag, attrs) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
  return e;
}

const BL_EVD = { bar: "#9db8d2", bars: "#6b8fb5", fit: "#0d6efd",
                 plain: "rgba(0,0,0,0.5)", mark: "#146c43",
                 tail: "rgba(20,108,67,0.10)" };

// The null distribution, with the curve the formula predicts drawn over it and
// the score in question marked on the same axis. Drawn as SVG at a fixed
// viewBox and scaled by CSS, so it is right in a 730px chapter column, right
// on a slide, and right while the box it lives in is still display:none.
function blEvdChart(samples, opt) {
  const W = 760, H = 250, L = 50, R = 14, T = 16, B = 40;
  const lo = opt.lo, hi = opt.hi, span = Math.max(1, hi - lo);
  const px = function (v) { return L + (v - lo) / span * (W - L - R); };

  function dens(v, mm, nn) {
    const F = function (z) {
      return Math.exp(-opt.K * mm * nn * Math.exp(-opt.lambda * z));
    };
    return F(v + 0.5) - F(v - 0.5);
  }

  let top = 0;
  Object.keys(samples.counts).forEach(function (k) {
    top = Math.max(top, samples.counts[k] / samples.trials);
  });
  for (let v = lo; v <= hi; v++) top = Math.max(top, dens(v, opt.effM, opt.effN));
  top = (top || 1) * 1.18;
  const py = function (p) { return T + (1 - p / top) * (H - T - B); };

  const svg = blSvg("svg", {
    viewBox: "0 0 " + W + " " + H,
    preserveAspectRatio: "xMidYMid meet"
  });
  svg.appendChild(blSvg("title", {})).textContent =
    "The best ungapped score reached by " + blNum(samples.trials)
    + " random sequence pairs, with the Karlin-Altschul curve over it and "
    + opt.markName + "'s score of " + opt.mark + " marked.";

  // the tail being asked about: everything at or above the marked score
  if (opt.mark !== null && opt.mark - 0.5 < hi) {
    const x0 = px(Math.max(lo, opt.mark - 0.5));
    svg.appendChild(blSvg("rect", {
      x: x0, y: T, width: Math.max(0, px(hi) - x0), height: H - T - B,
      fill: BL_EVD.tail
    }));
  }

  // axes
  svg.appendChild(blSvg("line", {
    x1: L, y1: py(0), x2: W - R, y2: py(0), stroke: "rgba(0,0,0,0.45)"
  }));
  // A nucleotide hit scores in the hundreds and a protein window in the tens,
  // so a fixed tick spacing either labels nothing or draws an unreadable smear.
  let tick = 1;
  const ticks = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000];
  for (let i = 0; i < ticks.length; i++) {
    tick = ticks[i];
    if (span / tick <= 12) break;
  }
  for (let v = Math.ceil(lo / tick) * tick; v <= hi; v += tick) {
    svg.appendChild(blSvg("line", {
      x1: px(v), y1: py(0), x2: px(v), y2: py(0) + 4, stroke: "rgba(0,0,0,0.45)"
    }));
    const lab = blSvg("text", {
      x: px(v), y: py(0) + 17, "text-anchor": "middle",
      "font-size": "12", fill: "rgba(0,0,0,0.6)"
    });
    lab.textContent = String(v);
    svg.appendChild(lab);
  }
  const xlab = blSvg("text", {
    x: (L + W - R) / 2, y: H - 6, "text-anchor": "middle",
    "font-size": "12.5", fill: "rgba(0,0,0,0.7)"
  });
  xlab.textContent = "best ungapped score between two random sequences";
  svg.appendChild(xlab);
  const ylab = blSvg("text", {
    x: -(T + (H - T - B) / 2), y: 14, transform: "rotate(-90)",
    "text-anchor": "middle", "font-size": "12.5", fill: "rgba(0,0,0,0.7)"
  });
  ylab.textContent = "share of pairs";
  svg.appendChild(ylab);

  // the samples
  const bw = Math.max(1.5, (W - L - R) / span - 1.5);
  Object.keys(samples.counts).forEach(function (k) {
    const v = Number(k), p = samples.counts[k] / samples.trials;
    if (v < lo - 1 || v > hi + 1) return;
    svg.appendChild(blSvg("rect", {
      x: px(v) - bw / 2, y: py(p), width: bw, height: Math.max(0, py(0) - py(p)),
      fill: v >= opt.mark ? BL_EVD.bars : BL_EVD.bar
    }));
  });

  // the two curves
  function curve(mm, nn, colour, dash) {
    const pts = [];
    for (let v = lo; v <= hi; v += 0.25) pts.push(px(v) + "," + py(dens(v, mm, nn)));
    const pl = blSvg("polyline", {
      points: pts.join(" "), fill: "none", stroke: colour, "stroke-width": "2"
    });
    if (dash) pl.setAttribute("stroke-dasharray", dash);
    svg.appendChild(pl);
  }
  curve(opt.m, opt.n, BL_EVD.plain, "5 4");
  curve(opt.effM, opt.effN, BL_EVD.fit, null);

  // The score being asked about. A nucleotide HSP can score 350 against a
  // random range that stops at 27, and stretching the axis to reach it would
  // squash the whole distribution into one spike. Past a point the mark is
  // therefore left at the edge and labelled as off the scale, which is the
  // same thing the picture is there to say.
  if (opt.mark !== null) {
    const off = opt.mark > hi;
    const mx = off ? W - R : px(opt.mark);
    svg.appendChild(blSvg("line", {
      x1: mx, y1: T - 4, x2: mx, y2: py(0),
      stroke: BL_EVD.mark, "stroke-width": "2"
    }));
    if (off) {
      svg.appendChild(blSvg("path", {
        d: "M" + (mx - 11) + "," + (T + 4) + "h9l-3.5,-3.5M" + (mx - 2) + "," + (T + 4)
           + "l-3.5,3.5",
        fill: "none", stroke: BL_EVD.mark, "stroke-width": "1.6"
      }));
    }
    const atEnd = off || mx > W - 190;
    const t = blSvg("text", {
      x: atEnd ? mx - (off ? 15 : 6) : mx + 6, y: T + 8,
      "text-anchor": atEnd ? "end" : "start",
      "font-size": "12.5", "font-weight": "600", fill: BL_EVD.mark
    });
    t.textContent = opt.markName + " scores " + opt.mark
      + (off ? ", off this scale" : "");
    svg.appendChild(t);
  }
  return svg;
}

function blKeyItem(colour, text, dashed) {
  const s = blEl("span", null);
  const swatch = blEl("i");
  swatch.style.background = dashed
    ? "repeating-linear-gradient(90deg," + colour + " 0 5px,transparent 5px 9px)"
    : colour;
  s.appendChild(swatch);
  s.appendChild(document.createTextNode(text));
  s.style.marginRight = "1.1em";
  return s;
}

// The whole picture, plus the sentence that turns it into a number. Sampling
// costs a few hundred milliseconds, which is not worth blocking a chapter page
// for, so the first draw is deferred and the result cached: switching steps
// back and forth redraws instantly and shows the same distribution.
function blEvdPanel(body, cfg, data, runs, opt) {
  const wrap = blEl("div", "bls-evd");
  body.appendChild(wrap);

  let mark = null, markName = null;
  const focus = runs[cfg.focus];
  if (focus && focus.hsp) {
    mark = focus.hsp.score;
    markName = data.db[cfg.focus].name;
  } else {
    runs.forEach(function (r, k) {
      if (r.hsp && (mark === null || r.hsp.score > mark)) {
        mark = r.hsp.score;
        markName = data.db[k].name;
      }
    });
  }
  if (mark === null) {
    wrap.appendChild(blEl("p", "bls-note",
      "Nothing aligned at these settings, so there is no score to place against the "
      + "null distribution. Lower the threshold and this picture comes back."));
    return;
  }

  // A sequence of your own can be far larger than the globins, and sampling it
  // honestly would cost more than the page is allowed to spend.
  if (blSampleTrials(opt.m, opt.dbN, cfg.evdMult || 1) < BL_SAMPLE_MIN) {
    wrap.appendChild(blEl("p", "bls-note",
      "No distribution is drawn for a search this size: " + blNum(opt.m) + " by "
      + blNum(opt.dbN) + " residues is " + blNum(opt.m * opt.dbN) + " cells per random "
      + "pair, and enough pairs to draw a readable histogram would lock the page up for "
      + "minutes. The E-values above are unaffected \u2014 they come from the formula, which "
      + "is the entire point of having one. Go back to the globins to see the picture."));
    return;
  }

  let mult = cfg.evdMult || 1;

  function draw() {
    const s = blSampleNull(cfg, opt.m, opt.dbN, mult);
    const sLo = Math.min.apply(null, Object.keys(s.counts).map(Number));
    const eff = blEffective(opt.m, opt.dbN, opt.K, blEntropy(cfg, opt.lambda));
    wrap.textContent = "";
    wrap.appendChild(blEvdChart(s, {
      lambda: opt.lambda, K: opt.K, m: opt.m, n: opt.dbN,
      effM: eff.m, effN: eff.n,
      lo: Math.max(0, Math.min(
        Math.min.apply(null, Object.keys(s.counts).map(Number)), mark) - 2),
      // Stretch the axis to reach the marked score only while that leaves the
      // distribution readable. A nucleotide HSP scores 350 where chance stops
      // at 27, and an axis running to 350 is one spike and a lot of white
      // space; past 60% of the sampled range the mark is left off the scale
      // and labelled as such instead.
      hi: (mark <= s.max + 0.6 * Math.max(5, s.max - sLo))
        ? Math.max(s.max, mark) + 2
        : s.max + Math.round(0.08 * Math.max(5, s.max - sLo)) + 2,
      mark: mark, markName: markName
    }));

    const key = blEl("div", "bls-key");
    key.appendChild(blKeyItem(BL_EVD.bar, blNum(s.trials) + " random pairs, scored here"));
    key.appendChild(blKeyItem(BL_EVD.fit, "K m n e^-lambda S, as the table computes it"));
    key.appendChild(blKeyItem(BL_EVD.plain, "the same, uncorrected: plain m x n", true));
    wrap.appendChild(key);

    // The arithmetic the picture is standing in for.
    const hit = blAtLeast(s, mark);
    const Eeff = blE(mark, opt.lambda, opt.K, eff.m, eff.n);
    const pEff = 1 - Math.exp(-Eeff);
    // In the tail the shares both round to 0.0% and say nothing, so out there the
    // comparison is made in counts -- which is what E is anyway: an expected
    // number of alignments per search, not a probability.
    const expect = s.trials * pEff;
    let said;
    if (hit === 0) {
      said = "Not one of the " + blNum(s.trials) + " random pairs reached " + mark
        + "; the best any of them managed was " + s.max + ". The curve agrees that none "
        + "should have: at that score it expects " + expect.toFixed(expect < 1 ? 2 : 1)
        + " of " + blNum(s.trials) + ". That is what a significant score looks like from "
        + "here, off the end of what chance produced, and E = " + blFmtE(Eeff)
        + " is how far off. Sampling more pairs is how to watch that number earn itself.";
    } else if (pEff < 0.01) {
      said = blNum(hit) + " of the " + blNum(s.trials) + " random pairs reached " + mark
        + " or more. The curve expects " + expect.toFixed(expect < 1 ? 2 : 1)
        + ". Counts, not percentages, are the honest comparison this far out, and a count "
        + "is what E is: " + blFmtE(Eeff) + " alignments this good per search of a "
        + "database this size.";
    } else {
      said = blNum(hit) + " of the " + blNum(s.trials) + " random pairs reached " + mark
        + " or more, which is " + (100 * hit / s.trials).toFixed(1) + "%. The curve, with "
        + "the effective lengths the table uses, says " + (100 * pEff).toFixed(1)
        + "%. That agreement is the "
        + "whole basis for the E-value: the distribution is predictable, so a score can be "
        + "read against it without anyone sampling anything.";
    }
    wrap.appendChild(blEl("p", "bls-note", said));

    wrap.appendChild(blEl("p", "bls-note",
      "The solid curve is the formula exactly as the table applies it, over the effective "
      + "search space " + blLen(eff.m) + " x " + blLen(eff.n) + ". The dashed one is "
      + "the same formula over the plain " + blNum(opt.m) + " x " + blNum(opt.dbN) + ", and it "
      + "sits above the samples: an alignment that would have to start near the end of either "
      + "sequence has no room left to score well, so counting those starts predicts more high "
      + "scores than chance delivers. Shortening both lengths by ln(K m n)/H is what a real "
      + "BLAST report calls its “effective search space”, and it is worth a factor of "
      + (opt.m * opt.dbN / (eff.m * eff.n)).toFixed(1) + " here. The dashed curve is drawn "
      + "only so that the correction can be seen; no number on this page is computed from it."));

    if (opt.scaled) {
      wrap.appendChild(blEl("p", "bls-note",
        "The picture is of this " + blNum(opt.dbN) + "-residue database, not of the one "
        + "selected above: the table rescales E to a larger n, but there is no sampling a "
        + "database of " + blNum(opt.n) + " residues in a browser."));
    }

    // Only offer more pairs when more pairs are actually available: at the
    // larger sizes the ceiling, not the multiplier, is what decides.
    if (blSampleTrials(opt.m, opt.dbN, mult * 5) > s.trials) {
      const more = blEl("button", "bls-secondary", "Sample five times as many pairs");
      more.onclick = function () {
        mult = mult * 5;
        cfg.evdMult = mult;   // so the larger sample survives a step change
        render();
      };
      wrap.appendChild(more);
    }
  }

  // Sampling costs a few hundred milliseconds. That is not worth blocking a
  // chapter page for, so an uncached draw is deferred and the result kept:
  // stepping away and back redraws at once, on the same distribution. The
  // redraw happens inside the box that is already in place, because building a
  // fresh panel would append it after the notes that follow it.
  function render() {
    if (blSampleReady(cfg, opt.m, opt.dbN, mult)) { draw(); return; }
    wrap.textContent = "";
    wrap.appendChild(blEl("p", "bls-note",
      "Sampling " + blNum(blSampleTrials(opt.m, opt.dbN, mult))
      + " random sequence pairs…"));
    window.setTimeout(draw, 0);
  }
  render();
}

const BL_STEPS = [
  "1 · Cut the query into words",
  "2 · Grow each word into a neighbourhood",
  "3 · Scan the database",
  "4 · Seeds worth extending",
  "5 · Extend without gaps",
  "6 · Fill a band, not a matrix",
  "7 · Is it significant?"
];

function renderBLAST(containerId, config) {
  const container = document.getElementById(containerId);
  if (!container) return;
  blStyle();
  const cfg = blDefaults(config);

  container.textContent = "";
  const root = blEl("div", "bls");
  const heading = blEl("h4");
  const sub = blEl("p", "bls-sub");
  root.appendChild(heading);
  root.appendChild(sub);
  if (cfg.controls) {
    root.appendChild(blSettings(cfg, function () { draw(); }));
    root.appendChild(blOwnSequence(cfg, function () { draw(); }));
  }

  let switcher = null;
  if (cfg.steps) {
    switcher = blEl("div", "bls-steps");
    BL_STEPS.forEach(function (label, k) {
      const b = blEl("button", null, label);
      b.dataset.step = k;
      b.onclick = function () { cfg.step = k; draw(); };
      switcher.appendChild(b);
    });
    root.appendChild(switcher);
  }

  const body = blEl("div", "bls-body");
  const tally = blEl("div", "bls-tally");
  root.appendChild(body);
  root.appendChild(tally);
  container.appendChild(root);

  // Which query word the neighbourhood panel is showing. Kept here rather
  // than in cfg: it is a view state, not a parameter of the search.
  let pickedWord = 0;

  function draw() {
    const data = blData(cfg);
    const q = data.query.seq;
    const lookup = blLookup(cfg);
    const runs = data.db.map(function (d) { return blRun(cfg, d.seq, lookup); });
    const refCfg = blSensitive(cfg);
    const sameAsRef = refCfg.word === cfg.word && refCfg.threshold === cfg.threshold;
    const refLookup = sameAsRef ? lookup : blLookup(refCfg);
    const refRuns = sameAsRef ? runs
      : data.db.map(function (d) { return blRun(refCfg, d.seq, refLookup); });

    heading.textContent = BL_STEPS[cfg.step];
    sub.textContent = blSettingsLine(cfg, data);
    if (switcher) {
      [].forEach.call(switcher.children, function (b) {
        b.classList.toggle("on", +b.dataset.step === cfg.step);
      });
    }
    if (cfg.focus >= data.db.length) cfg.focus = 0;

    body.textContent = "";
    const fns = [blStepWords, blStepNeighbourhood, blStepScan, blStepTwoHit, blStepExtend,
                 blStepBand, blStepEvalue];
    fns[cfg.step](body, cfg, data, lookup, runs, {
      refRuns: refRuns, refCfg: refCfg, sameAsRef: sameAsRef,
      picked: pickedWord,
      pick: function (k) { pickedWord = k; draw(); },
      focus: function (k) { cfg.focus = k; draw(); },
      redraw: function () { draw(); }
    });
    blTally(tally, cfg, data, runs, refRuns, sameAsRef);
  }
  draw();
}

function blSettingsLine(cfg, data) {
  const bits = [];
  bits.push(cfg.alphabet === "dna" ? "blastn-style nucleotide search" : "blastp-style protein search");
  bits.push("word size W = " + cfg.word);
  if (cfg.alphabet !== "dna") bits.push("threshold T = " + cfg.threshold + " on BLOSUM62");
  else bits.push("exact words, +2 / −3");
  bits.push(cfg.window ? "two-hit window " + cfg.window : "single-hit extension");
  bits.push("X-drop " + cfg.xdrop);
  bits.push("band ±" + cfg.band + ", linear gap " + cfg.gap);
  return data.query.name + " against " + data.db.length + " sequences — " + bits.join(", ") + ".";
}

function blStepWords(body, cfg, data, lookup, runs, ui) {
  const q = data.query.seq;
  const words = blWords(q, cfg.word);
  body.appendChild(blEl("p", "bls-say",
    "A query of " + q.length + " residues contains " + words.length + " overlapping words of length "
    + cfg.word + ". Every one of them is a place the search could start. Click a word to carry it "
    + "into the next step."));

  const seq = blEl("div", "bls-seq");
  const picked = words[Math.min(ui.picked, words.length - 1)];
  for (let i = 0; i < q.length; i++) {
    const inWord = i >= picked.pos && i < picked.pos + cfg.word;
    const sp = blEl("span", inWord ? "w" : null, q[i]);
    seq.appendChild(sp);
  }
  body.appendChild(seq);

  const chips = blEl("div", "bls-chips");
  words.forEach(function (w, k) {
    const c = blEl("button", "bls-chip" + (k === ui.picked ? " on" : ""), w.word);
    c.title = "query position " + (w.pos + 1);
    c.onclick = function () { ui.pick(k); };
    chips.appendChild(c);
  });
  body.appendChild(chips);
  body.appendChild(blEl("p", "bls-note",
    "FASTA stops here: it looks these words up exactly, and nothing else. That is the whole "
    + "difference, and the next step is what BLAST does instead."));
}

function blStepNeighbourhood(body, cfg, data, lookup, runs, ui) {
  const q = data.query.seq;
  const words = blWords(q, cfg.word);
  const picked = words[Math.min(ui.picked, words.length - 1)];
  const nb = blNeighbourhood(picked.word, cfg.threshold, cfg);
  const space = Math.pow(cfg.alphabet === "dna" ? 4 : 20, cfg.word);

  if (cfg.alphabet === "dna") {
    body.appendChild(blEl("div", "bls-warn",
      "Nucleotide searches have no neighbourhood: blastn looks for exact matches only. A word "
      + "either matches or it does not, so this step collapses to one word, and the sensitivity "
      + "of the search is set entirely by W. That is why the nucleotide story is about word size "
      + "and the protein story is about the threshold."));
  }

  const chips = blEl("div", "bls-chips");
  words.forEach(function (w, k) {
    const c = blEl("button", "bls-chip" + (k === ui.picked ? " on" : ""), w.word);
    c.onclick = function () { ui.pick(k); };
    chips.appendChild(c);
  });
  body.appendChild(chips);

  body.appendChild(blEl("p", "bls-say",
    "Word " + picked.word + " at query position " + (picked.pos + 1) + ": "
    + blNum(nb.length) + " of the " + blNum(space) + " possible words score at least "
    + (cfg.threshold === null ? "an exact match" : "T = " + cfg.threshold)
    + ". BLAST puts all of them in its lookup table and searches for every one."));

  const tab = blEl("table", "bls-nb");
  const hr = blEl("tr");
  hr.appendChild(blEl("th", null, "word"));
  hr.appendChild(blEl("th", null, "score"));
  tab.appendChild(hr);
  nb.slice(0, 14).forEach(function (n) {
    const tr = blEl("tr", n.self ? "self" : null);
    tr.appendChild(blEl("td", "bls-mono", n.word));
    tr.appendChild(blEl("td", "n", String(n.score)));
    tab.appendChild(tr);
  });
  body.appendChild(tab);
  if (nb.length > 14) body.appendChild(blEl("p", "bls-note", "… and " + (nb.length - 14) + " more."));

  body.appendChild(blEl("p", "bls-note",
    "Across the whole query the lookup table holds " + blNum(lookup.generated) + " words ("
    + blNum(lookup.distinct) + " distinct) instead of the " + words.length
    + " a FASTA-style exact lookup would hold. Raise T and the table shrinks and the search "
    + "runs faster; lower it and the table grows and finds more. That trade is the whole of "
    + "BLAST's design, and step 3 shows what it costs."));
}

function blStepScan(body, cfg, data, lookup, runs, ui) {
  body.appendChild(blEl("p", "bls-say",
    "Every sequence in the database is read once, in windows of " + cfg.word
    + ", and each window is looked up in the table. A sequence with no hit at all is never "
    + "aligned: BLAST never computes a single matrix cell for it. That, and not the banding, "
    + "is where most of the speed comes from in a real search."));

  const tab = blEl("table", "bls-db");
  const hr = blEl("tr");
  const cols = ["sequence", "", "length", "word hits", "score"];
  if (!ui.sameAsRef) cols.push(ui.refCfg.alphabet === "dna"
    ? "score at W = " + ui.refCfg.word : "score at T = " + ui.refCfg.threshold);
  cols.forEach(function (h) { hr.appendChild(blEl("th", null, h)); });
  tab.appendChild(hr);
  data.db.forEach(function (d, k) {
    const r = runs[k], rr = ui.refRuns[k];
    const found = r.computed > 0, refFound = rr.computed > 0;
    const tr = blEl("tr", (found ? "" : "dead ") + "pick" + (k === cfg.focus ? " focus" : ""));
    tr.onclick = function () { ui.focus(k); };
    tr.appendChild(blEl("td", "bls-mono", d.name));
    tr.appendChild(blEl("td", null, d.note || ""));
    tr.appendChild(blEl("td", "n", String(d.seq.length)));
    tr.appendChild(blEl("td", "n", r.hits.length ? String(r.hits.length) : "none"));
    tr.appendChild(blEl("td", "n", found ? String(r.band.score) : "not aligned"));
    if (!ui.sameAsRef) {
      const cell = blEl("td", "n", refFound ? String(rr.band.score) : "not aligned");
      if (refFound && !found) { cell.style.color = "#b02a37"; cell.style.fontWeight = "600"; }
      tr.appendChild(cell);
    }
    tab.appendChild(tr);
  });
  body.appendChild(tab);

  const dead = runs.filter(function (r) { return r.computed === 0; }).length;
  const noHit = runs.filter(function (r) { return r.hits.length === 0; }).length;
  body.appendChild(blEl("p", "bls-note",
    dead + " of " + data.db.length + " sequences are never aligned"
    + (noHit ? " (" + noHit + " of them produced no word hit at all)" : "")
    + ". Click a row to follow one through the remaining steps. A score here is only a score: "
    + "whether it means anything is a separate question, which is what step 7 is for. The last "
    + "sequence in the database is there to make that point — loosen the search far enough and "
    + "even it aligns, just badly."));

  const d = data.db[cfg.focus], r = runs[cfg.focus];
  body.appendChild(blEl("p", "bls-say", "Hits in " + d.name + ":"));
  const marked = new Set();
  r.hits.forEach(function (h) {
    for (let k = 0; k < cfg.word; k++) marked.add(h.spos + k);
  });
  const seq = blEl("div", "bls-seq");
  for (let j = 0; j < d.seq.length; j++) {
    seq.appendChild(blEl("span", marked.has(j) ? "hit" : null, d.seq[j]));
  }
  body.appendChild(seq);
}

function blStepTwoHit(body, cfg, data, lookup, runs, ui) {
  const d = data.db[cfg.focus], r = runs[cfg.focus], q = data.query.seq;
  body.appendChild(blEl("p", "bls-say",
    cfg.window
      ? "Each hit is a dot in the query-by-subject matrix, exactly like the dot plots in Session 4. "
        + "Gapped BLAST only extends a hit when a second, non-overlapping hit lies on the same "
        + "diagonal within " + cfg.window + " residues, because an isolated hit is usually noise. "
        + "Orange: word hits. Green: hits that survive the two-hit rule."
      : "Each hit is a dot in the query-by-subject matrix, exactly like the dot plots in Session 4. "
        + "A nucleotide search has no two-hit rule: blastn extends from a single hit, so every dot "
        + "here is a seed. The two-hit rule is a protein heuristic, and a blastn report says so by "
        + "omission \u2014 it has neither a \u201cNeighboring words threshold\u201d line nor a "
        + "\u201cWindow for multiple hits\u201d line, while a blastp report has both."));

  const marks = new Map();
  r.hits.forEach(function (h) {
    for (let k = 0; k < cfg.word; k++) marks.set((h.qpos + k + 1) + "," + (h.spos + k + 1), "hit");
  });
  r.two.seeds.forEach(function (sd) {
    [sd.first, sd.second].forEach(function (h) {
      for (let k = 0; k < cfg.word; k++) marks.set((h.qpos + k + 1) + "," + (h.spos + k + 1), "seed");
    });
  });
  body.appendChild(blGrid(cfg, q, d.seq, marks));
  body.appendChild(blEl("div", "bls-axis",
    "rows: " + data.query.name + " (" + q.length + ")  ·  columns: " + d.name + " (" + d.seq.length + ")"));
  body.appendChild(blEl("p", "bls-note",
    r.hits.length + " word hits on " + r.two.byDiag.size + " diagonals; "
    + (cfg.window ? r.two.seeds.length + " survive the two-hit rule."
                  : "every one is a seed, since this is a single-hit search.")
    + (r.two.seeds.length ? "" : " Nothing survives, so this sequence is never aligned at all.")));
}

function blStepExtend(body, cfg, data, lookup, runs, ui) {
  const d = data.db[cfg.focus], r = runs[cfg.focus], q = data.query.seq;
  if (!r.hsp) {
    body.appendChild(blEl("p", "bls-say",
      d.name + " has no surviving seed, so there is nothing to extend. Pick another sequence in step 3."));
    return;
  }
  body.appendChild(blEl("p", "bls-say",
    "From the seed, walk out along the diagonal in both directions, adding substitution scores and "
    + "never opening a gap. Stop when the running score falls " + cfg.xdrop
    + " below the best seen so far — the X-drop. What is left is an HSP, a high-scoring segment pair."));

  const marks = new Map();
  r.hits.forEach(function (h) {
    for (let k = 0; k < cfg.word; k++) marks.set((h.qpos + k + 1) + "," + (h.spos + k + 1), "hit");
  });
  for (let k = 0; k <= r.hsp.qe - r.hsp.qs; k++) {
    marks.set((r.hsp.qs + k + 1) + "," + (r.hsp.ss + k + 1), "hsp");
  }
  body.appendChild(blGrid(cfg, q, d.seq, marks));
  body.appendChild(blEl("div", "bls-axis",
    "blue: the HSP, extended from the seed without gaps"));

  const a = q.slice(r.hsp.qs, r.hsp.qe + 1), b = d.seq.slice(r.hsp.ss, r.hsp.se + 1);
  const s = blScore(cfg);
  let mid = "";
  for (let k = 0; k < a.length; k++) {
    mid += a[k] === b[k] ? a[k] : (s(a[k], b[k]) > 0 ? "+" : " ");
  }
  const box = blEl("div", "bls-align", a + "\n" + mid + "\n" + b);
  body.appendChild(box);
  body.appendChild(blEl("p", "bls-note",
    "HSP score " + r.hsp.score + ", query " + (r.hsp.qs + 1) + "–" + (r.hsp.qe + 1)
    + ", subject " + (r.hsp.ss + 1) + "–" + (r.hsp.se + 1)
    + ". No gaps yet: every column here is one step down the diagonal."));
}

function blStepBand(body, cfg, data, lookup, runs, ui) {
  const d = data.db[cfg.focus], r = runs[cfg.focus], q = data.query.seq;
  if (!r.band) {
    body.appendChild(blEl("p", "bls-say",
      d.name + " never got a seed, so no matrix is ever built for it. Pick another sequence in step 3."));
    return;
  }
  body.appendChild(blEl("p", "bls-say",
    "Only now does BLAST do dynamic programming, and only in a band of ±" + cfg.band
    + " cells around the HSP's diagonal. The pale blue cells are computed; the white ones never are. "
    + "This is the same Smith-Waterman recurrence as Session 4, restricted."));

  const marks = new Map();
  r.band.cells.forEach(function (c) { marks.set(c.i + "," + c.j, "band"); });
  r.band.path.forEach(function (c) { marks.set(c.i + "," + c.j, "path"); });
  body.appendChild(blGrid(cfg, q, d.seq, marks));
  body.appendChild(blEl("div", "bls-axis", "pale blue: computed  ·  dark green: the alignment"));

  const txt = blAlignmentText(cfg, q, d.seq, r.band);
  if (txt) body.appendChild(blEl("div", "bls-align", txt));
  body.appendChild(blEl("p", "bls-note",
    "Score " + r.band.score + ". Computed " + blNum(r.band.computed) + " of "
    + blNum(r.band.full) + " cells for this sequence, which is "
    + Math.round(100 * r.band.computed / r.band.full) + "%."));
}

function blStepEvalue(body, cfg, data, lookup, runs, ui) {
  const q = data.query.seq;
  const m = q.length;
  const dbN = data.db.reduce(function (t, d) { return t + d.seq.length; }, 0);
  const sol = blLambda(cfg);
  const K = BL_K[cfg.alphabet === "dna" ? "dna" : "protein"];

  body.appendChild(blEl("p", "bls-say",
    "Every score so far has been a score and nothing more. The question a report has to answer "
    + "is whether a score that size would have turned up anyway, and that depends on how much "
    + "database you searched. Karlin and Altschul: the number of alignments scoring at least S "
    + "expected by chance is E = K m n exp(-lambda S). Where that comes from is drawn below: the distribution is sampled from random pairs here, not asserted."));

  if (sol.lambda === null) {
    body.appendChild(blEl("p", "bls-note",
      "With this scoring scheme the expected score of an aligned pair is "
      + sol.expected.toFixed(3) + ", which is not negative, so there is no positive root and no "
      + "E-value. That is not a bug in the arithmetic: if random pairs score positively on "
      + "average, the best local alignment of two unrelated sequences just keeps growing with "
      + "their length, and no score threshold separates anything from anything."));
    return;
  }

  const chosen = BL_DBSIZES.filter(function (o) { return o.key === cfg.dbsize; })[0] || BL_DBSIZES[0];
  const n = chosen.n || dbN;

  // E is computed over the effective search space, the way BLAST computes it:
  // both lengths shortened by ln(K m n)/H, because an alignment that would
  // have to start near the end of either sequence has no room left to reach a
  // high score, so counting those starts predicts more high scores than chance
  // produces. Leaving the correction out overstates every E below by a factor
  // of about 1.6 on this database, and by much more when a short query is run
  // against a large one. The picture underneath draws both curves, and the
  // solid one -- the corrected one -- is the one this table uses.
  const H = blEntropy(cfg, sol.lambda);
  const eff = blEffective(m, n, K, H);
  const effThis = blEffective(m, dbN, K, H);
  const floored = eff.m <= 1 / K + 1e-9;

  const bar = blEl("div", "bls-settings");
  const sel = document.createElement("select");
  BL_DBSIZES.forEach(function (o) {
    const opt = document.createElement("option");
    opt.value = o.key;
    opt.textContent = o.key === "this" ? o.label + " (" + blNum(dbN) + " residues)" : o.label;
    sel.appendChild(opt);
  });
  sel.value = chosen.key;
  sel.onchange = function () { cfg.dbsize = sel.value; ui.redraw(); };
  bar.appendChild(blField("Searched against", sel));
  body.appendChild(bar);

  const tab = blEl("table", "bls-db");
  const hr = blEl("tr");
  ["sequence", "", "HSP score", "bits", "E-value"].forEach(function (h) {
    hr.appendChild(blEl("th", null, h));
  });
  tab.appendChild(hr);
  data.db.forEach(function (d, k) {
    const r = runs[k];
    const tr = blEl("tr", (r.hsp ? "" : "dead ") + "pick" + (k === cfg.focus ? " focus" : ""));
    tr.onclick = function () { ui.focus(k); };
    tr.appendChild(blEl("td", "bls-mono", d.name));
    tr.appendChild(blEl("td", null, d.note || ""));
    if (!r.hsp) {
      tr.appendChild(blEl("td", "n", "not aligned"));
      tr.appendChild(blEl("td", "n", "-"));
      tr.appendChild(blEl("td", "n", "-"));
    } else {
      const S = r.hsp.score;
      const e = blE(S, sol.lambda, K, eff.m, eff.n);
      tr.appendChild(blEl("td", "n", String(S)));
      tr.appendChild(blEl("td", "n", blBits(S, sol.lambda, K).toFixed(1)));
      const cell = blEl("td", "n", blFmtE(e));
      // The convention every report uses: 0.001 or below is worth reading.
      if (e <= 1e-3) { cell.style.color = "#146c43"; cell.style.fontWeight = "600"; }
      else if (e >= 1) { cell.style.color = "rgba(0,0,0,0.45)"; }
      tr.appendChild(cell);
    }
    tab.appendChild(tr);
  });
  body.appendChild(tab);

  if (chosen.n) {
    // Switching to a real database size makes every row insignificant, which
    // looks like a broken widget unless the reason is on the screen.
    const best = data.db.reduce(function (b, d, k) {
      const r = runs[k];
      return (r.hsp && (b === null || r.hsp.score > b)) ? r.hsp.score : b;
    }, null);
    body.appendChild(blEl("p", "bls-note",
      "Nothing above is significant any more, and not one alignment changed: the same best hit "
      + "at " + blBits(best, sol.lambda, K).toFixed(1) + " bits is now expected about "
      + blFmtE(blE(best, sol.lambda, K, eff.m, eff.n)) + " times by chance, because the "
      + "effective search space went from " + blLen(effThis.m * effThis.n)
      + " to " + blLen(eff.m * eff.n) + ". E is linear in the size of the haystack. "
      + "That is why a " + m + "-letter window is a demonstration and not a search: a real "
      + "query is a whole sequence and reaches several hundred bits, and every bit halves E."));
  }

  body.appendChild(blEl("p", "bls-note",
    "lambda = " + sol.lambda.toFixed(4) + ", solved here from the scoring scheme and the "
    + (cfg.alphabet === "dna" ? "flat 0.25 base composition" : "Robinson & Robinson amino-acid background")
    + ", not looked up; K = " + K + ", which is taken from the published tables. m = " + m
    + " (the query) and n = " + blNum(n) + ", shortened to an effective " + blLen(eff.m)
    + " x " + blLen(eff.n) + " by subtracting ln(K m n)/H from each, with "
    + "H = " + H.toFixed(3) + " nats the relative entropy of the scoring scheme. That is the "
    + "\u201ceffective search space\u201d line a real BLAST report prints, and it is what the "
    + "E-values above are computed over."
    + (floored
        ? " Here the correction is longer than the " + m + "-residue query, so the effective "
          + "query length is held at its floor of 1/K = " + (1 / K).toFixed(1)
          + ": a query this short against a database this large is almost all edge, and real "
          + "BLAST floors it the same way."
        : "")));

  // The distribution the formula is about, measured rather than claimed. Always
  // sampled at the real database size: the selector above can ask for 9e10
  // residues, and nothing samples that.
  blEvdPanel(body, cfg, data, runs, {
    lambda: sol.lambda, K: K, m: m, n: n, dbN: dbN, scaled: !!chosen.n
  });

  // Whichever two sequences share a score, say so: it is the point of the step.
  const byScore = {};
  data.db.forEach(function (d, k) {
    if (!runs[k].hsp) return;
    (byScore[runs[k].hsp.score] = byScore[runs[k].hsp.score] || []).push(d.name);
  });
  const tied = Object.keys(byScore).filter(function (sc) { return byScore[sc].length > 1; });
  if (tied.length) {
    body.appendChild(blEl("p", "bls-note",
      tied.map(function (sc) {
        return byScore[sc].join(" and ") + " both score " + sc;
      }).join("; ") + " — and so get the same E-value, whatever their history. A score cannot "
      + "tell a weak homologue from a sequence with no history at all, and neither can an "
      + "E-value; what the E-value can say is that neither of them is evidence."));
  }

  body.appendChild(blEl("p", "bls-note",
    "These E-values are for the ungapped HSP of step 5. The banded score of step 6 has no "
    + "closed-form lambda, because this page charges one linear gap where real BLAST charges an "
    + "affine one; production BLAST fits gapped parameters by simulation instead. Note too that "
    + "the query here is a " + m + (cfg.alphabet === "dna" ? "-base" : "-residue")
    + " window, so the bit scores are small — a full-length search reaches several hundred."));
}

function blTally(tally, cfg, data, runs, refRuns, sameAsRef) {
  tally.textContent = "";
  const q = data.query.seq;
  const full = data.db.reduce(function (t, d) { return t + q.length * d.seq.length; }, 0);
  const done = runs.reduce(function (t, r) { return t + r.computed; }, 0);
  const skipped = runs.filter(function (r) { return r.computed === 0; }).length;
  const pct = full ? (100 * done / full) : 0;

  tally.appendChild(blEl("div", "bls-big",
    "Matrix cells computed: " + blNum(done) + " of " + blNum(full)
    + " (" + (pct < 1 ? pct.toFixed(1) : Math.round(pct)) + "%)"));
  const bar = blEl("div", "bls-bar");
  const fill = blEl("span");
  fill.style.width = Math.max(0.6, pct) + "%";
  bar.appendChild(fill);
  tally.appendChild(bar);
  if (!sameAsRef) {
    const missed = [];
    data.db.forEach(function (d, k) {
      if (runs[k].computed === 0 && refRuns[k].computed > 0) {
        missed.push({ name: d.name, runs: runs[k] });
      }
    });
    if (missed.length) {
      // Name the stage that actually killed each one. They fail in two quite
      // different ways, and saying "no word scored high enough" about a
      // sequence that produced nine word hits would be teaching a falsehood.
      const noWord = missed.filter(function (d, i) { return d.runs.hits.length === 0; });
      const noPair = missed.filter(function (d, i) { return d.runs.hits.length > 0; });
      const warn = blEl("div", "bls-warn");
      const parts = ["The speed is not free. A more sensitive search aligns "
        + missed.map(function (d) { return d.name; }).join(", ") + ", and this one does not."];
      if (noWord.length) parts.push(noWord.map(function (d) { return d.name; }).join(", ")
        + ": not one word matched, so BLAST never looked at all.");
      if (noPair.length) parts.push(noPair.map(function (d) { return d.name; }).join(", ")
        + ": words did match"
        + (cfg.window
            ? ", but no two of them fell on the same diagonal within " + cfg.window
              + " residues, so the two-hit rule threw them away before any alignment was attempted."
            : ", but the extension never reached a score worth keeping."));
      warn.textContent = parts.join(" ");
      tally.appendChild(warn);
    }
  }
  tally.appendChild(blEl("div", "bls-note",
    "An exhaustive Smith-Waterman would compute every one of those " + blNum(full)
    + " cells. BLAST computed " + blNum(done) + ", and never built a matrix at all for "
    + skipped + " of the " + data.db.length + " sequences. Scale the database up to the "
    + "hundreds of millions of sequences at NCBI and that is the entire argument."));
}

// ------------------------------------------------------------------ settings

function blField(labelText, control) {
  const wrap = blEl("div");
  const id = "blf" + Math.random().toString(36).slice(2, 9);
  control.id = id;
  const lab = blEl("label", null, labelText);
  lab.setAttribute("for", id);
  wrap.appendChild(lab);
  wrap.appendChild(control);
  return wrap;
}

function blSettings(cfg, redraw) {
  const bar = blEl("div", "bls-settings");

  const alpha = document.createElement("select");
  [["protein", "Protein (blastp)"], ["dna", "Nucleotide (blastn)"]].forEach(function (o) {
    const opt = document.createElement("option");
    opt.value = o[0]; opt.textContent = o[1];
    alpha.appendChild(opt);
  });
  alpha.value = cfg.alphabet;

  const word = document.createElement("input");
  word.type = "number"; word.value = cfg.word; word.min = 2; word.max = 28;

  const thr = document.createElement("input");
  thr.type = "number"; thr.value = cfg.threshold === null ? 11 : cfg.threshold; thr.min = 0; thr.max = 30;
  const thrField = blField("Threshold T", thr);

  const preset = document.createElement("select");
  [["", "—"], ["blastp", "blastp (W 3, T 11)"], ["sensitive", "sensitive (W 3, T 9)"],
   ["blastn", "blastn (W 11)"], ["megablast", "megablast (W 28)"]].forEach(function (o) {
    const opt = document.createElement("option");
    opt.value = o[0]; opt.textContent = o[1];
    preset.appendChild(opt);
  });

  function sync() {
    thrField.style.display = alpha.value === "dna" ? "none" : "";
  }

  function apply() {
    cfg.alphabet = alpha.value;
    cfg.word = Math.max(2, Math.min(28, parseInt(word.value, 10) || 3));
    // 20^W words get enumerated for every query word, so W above 4 is not a
    // slow widget, it is a hung browser tab. The recursion prunes hard, but
    // the floor still has to be held here.
    if (cfg.alphabet === "protein" && cfg.word > 4) { cfg.word = 4; word.value = 4; }
    cfg.threshold = cfg.alphabet === "dna" ? null : (parseInt(thr.value, 10) || 0);
    cfg.focus = 0;
    sync();
    redraw();
  }

  preset.onchange = function () {
    const p = preset.value;
    if (p === "blastp")    { alpha.value = "protein"; word.value = 3;  thr.value = 11; }
    if (p === "sensitive") { alpha.value = "protein"; word.value = 3;  thr.value = 9; }
    if (p === "blastn")    { alpha.value = "dna";     word.value = 11; }
    if (p === "megablast") { alpha.value = "dna";     word.value = 28; }
    if (p) apply();
  };
  alpha.onchange = function () {
    word.value = alpha.value === "dna" ? 11 : 3;
    thr.value = 11;
    apply();
  };
  word.onchange = apply;
  thr.onchange = apply;

  bar.appendChild(blField("Preset", preset));
  bar.appendChild(blField("Alphabet", alpha));
  bar.appendChild(blField("Word size W", word));
  bar.appendChild(thrField);
  sync();
  return bar;
}

// The lesson, as an assertion. Run with:
//
//     node -e 'global.BLOSUM62=require("./book/js/dp-matrix.js").BLOSUM62;
//              require("./book/js/blast-search.js").blSelfCheck()'
//
// Every number below was taken from the real programs, not from this code:
// blastp with its own defaults finds HBA_HUMAN, HBP2_CASGL and MYG_GALGA on
// this database and misses MYG_HUMAN; drop the threshold and myoglobin
// appears. blastn finds all three nucleotide copies and megablast misses the
// 80% one. If a change to the engine breaks any of that, the page starts
// teaching something false, so it should fail loudly here first.
function blSelfCheck() {
  const checks = [];
  function aligned(cfg) {
    const c = blDefaults(cfg);
    const data = blData(c);
    const lookup = blLookup(c);
    const out = {};
    data.db.forEach(function (d) { out[d.name] = blRun(c, d.seq, lookup).computed > 0; });
    return out;
  }
  function want(label, got, name, expect) {
    const ok = got[name] === expect;
    checks.push((ok ? "ok   " : "FAIL ") + label + ": " + name + " aligned=" + got[name]
      + " (expected " + expect + ")");
    return ok;
  }
  const def = aligned({ alphabet: "protein", word: 3, threshold: 11 });
  const sens = aligned({ alphabet: "protein", word: 3, threshold: 9 });
  const bn = aligned({ alphabet: "dna", word: 11 });
  const mb = aligned({ alphabet: "dna", word: 28 });
  let ok = true;
  ok = want("blastp defaults", def, "HBA_HUMAN", true) && ok;
  ok = want("blastp defaults", def, "HBP2_CASGL", true) && ok;
  ok = want("blastp defaults", def, "MYG_GALGA", true) && ok;
  ok = want("blastp defaults MISSES myoglobin", def, "MYG_HUMAN", false) && ok;
  ok = want("T=9 finds myoglobin", sens, "MYG_HUMAN", true) && ok;
  ok = want("blastn", bn, "copy_80", true) && ok;
  ok = want("megablast MISSES the 80% copy", mb, "copy_80", false) && ok;
  ok = want("megablast keeps the 88% copy", mb, "copy_88", true) && ok;
  ok = want("nothing finds the unrelated sequence", bn, "unrelated", false) && ok;

  // Step 7. lambda is solved, not quoted, so the solver is what has to be held
  // to the published value; and the point the step exists to make -- that a
  // real but weak homologue and a sequence with no history score the same and
  // so get the same E-value -- is an assertion about the data, not a turn of
  // phrase, so it is checked here too.
  function claim(label, cond) {
    checks.push((cond ? "ok   " : "FAIL ") + label);
    return cond;
  }
  const lamP = blLambda(blDefaults({ alphabet: "protein" })).lambda;
  const lamD = blLambda(blDefaults({ alphabet: "dna" })).lambda;
  ok = claim("lambda for BLOSUM62 solves to NCBI's published 0.3176 (got "
             + lamP.toFixed(4) + ")", Math.abs(lamP - 0.3176) < 5e-4) && ok;
  ok = claim("lambda for +2/-3 is near the published 0.625 (got "
             + lamD.toFixed(4) + ")", Math.abs(lamD - 0.625) < 0.02) && ok;

  const cE = blDefaults({ alphabet: "protein", word: 3, threshold: 9 });
  const lkE = blLookup(cE);
  const dataE = blData(cE);
  const mE = dataE.query.seq.length;
  const nE = dataE.db.reduce(function (t, d) { return t + d.seq.length; }, 0);
  const KE = BL_K.protein;
  const scoreOf = {};
  dataE.db.forEach(function (d) {
    const r = blRun(cE, d.seq, lkE);
    scoreOf[d.name] = r.hsp ? r.hsp.score : null;
  });
  // The table computes E over the effective search space, so the checks have to
  // as well, or they would be holding the page to arithmetic it does not do.
  const HP = blEntropy(cE, lamP);
  const effP = blEffective(mE, nE, KE, HP);
  function eOf(name) { return blE(scoreOf[name], lamP, KE, effP.m, effP.n); }
  ok = claim("HBA_HUMAN is significant on this database (E = " + blFmtE(eOf("HBA_HUMAN")) + ")",
             eOf("HBA_HUMAN") < 1e-3) && ok;
  ok = claim("the shuffled control is not (E = " + blFmtE(eOf("SHUFFLED")) + ")",
             eOf("SHUFFLED") > 1) && ok;
  ok = claim("MYG_GALGA and SHUFFLED score the same, so share an E-value",
             scoreOf.MYG_GALGA !== null && scoreOf.MYG_GALGA === scoreOf.SHUFFLED) && ok;
  ok = claim("a bigger database makes the same alignment less significant", (function () {
    const big = blEffective(mE, 9e10, KE, HP);
    return blE(scoreOf.HBA_HUMAN, lamP, KE, big.m, big.n) > eOf("HBA_HUMAN");
  })()) && ok;
  ok = claim("the correction is actually applied: E over the effective space is smaller "
             + "than E over the plain m x n (" + blFmtE(eOf("HBA_HUMAN")) + " vs "
             + blFmtE(blE(scoreOf.HBA_HUMAN, lamP, KE, mE, nE)) + ")",
             eOf("HBA_HUMAN") < blE(scoreOf.HBA_HUMAN, lamP, KE, mE, nE) * 0.9) && ok;

  // Step 7's picture claims that a sampled null distribution and the
  // Karlin-Altschul curve agree. If they ever stop agreeing, the chart teaches
  // that the theory is wrong without saying so, which is the worst way to be
  // wrong, so the agreement is asserted here.
  ok = claim("H for BLOSUM62 is NCBI's published 0.401 nats (got " + HP.toFixed(3) + ")",
             Math.abs(HP - 0.401) < 2e-3) && ok;
  ok = claim("effective lengths shrink " + mE + " x " + nE + " to "
             + effP.m.toFixed(0) + " x " + effP.n.toFixed(0),
             effP.m < mE && effP.n < nE && effP.m * effP.n > 0.4 * mE * nE) && ok;
  const cS = blDefaults({ alphabet: "protein" });
  const sampA = blSampleNull(cS, mE, nE, 1);
  const sampB = blSampleNull(cS, mE, nE, 1);
  ok = claim("the null sampler is seeded, so the picture is reproducible",
             sampA.trials === sampB.trials && sampA.max === sampB.max
             && blAtLeast(sampA, 30) === blAtLeast(sampB, 30)) && ok;
  const obs30 = blAtLeast(sampA, 30) / sampA.trials;
  const fit30 = 1 - Math.exp(-blE(30, lamP, KE, effP.m, effP.n));
  ok = claim("sampled pairs match the corrected curve at score 30 ("
             + (100 * obs30).toFixed(1) + "% sampled, "
             + (100 * fit30).toFixed(1) + "% predicted)",
             Math.abs(obs30 - fit30) / fit30 < 0.25) && ok;
  const plain30 = 1 - Math.exp(-blE(30, lamP, KE, mE, nE));
  ok = claim("the plain m x n curve sits above the samples, as the chart shows",
             plain30 > obs30 * 1.2) && ok;
  ok = claim("a sequence against itself scores its own self-score", (function () {
    const letters = Object.keys(blBackground(cS));
    const sc = blScore(cS);
    const S = letters.map(function (a) {
      return letters.map(function (b) { return sc(a, b); });
    });
    const seq = Int32Array.from([0, 1, 2, 3, 4]);
    let self = 0;
    seq.forEach(function (i) { self += S[i][i]; });
    return blMaxSegment(seq, seq, S) === self;
  })()) && ok;

  checks.forEach(function (c) { console.log(c); });
  console.log(ok ? "\nall checks passed" : "\nSELF-CHECK FAILED");
  if (!ok && typeof process !== "undefined") process.exitCode = 1;
  return ok;
}

// The panel that lets someone search their own sequence. Deliberately one
// box: people paste FASTA, multi-FASTA or bare residues, and expect it to
// work. The first record becomes the query and any others become the
// database, which is the mental model the NCBI form already teaches.
function blOwnSequence(cfg, redraw) {
  const box = blEl("details", "bls-own");
  const sum = document.createElement("summary");
  sum.textContent = "Search your own sequence";
  box.appendChild(sum);

  box.appendChild(blEl("p", "bls-note",
    "Paste a sequence, or several in FASTA. The first becomes the query; any others become "
    + "the database, and with only one the built-in set is kept. Nothing is uploaded: this "
    + "page is a static file and the search runs in this tab."));

  const ta = document.createElement("textarea");
  ta.className = "bls-ta";
  ta.rows = 5;
  ta.placeholder = ">my_query\nGEALGRLLVVYPWTQRFFESFGDLST...\n>a_relative\nYGAEALERMFLSFPTTKTYFPHF...";
  box.appendChild(ta);

  const row = blEl("div", "bls-controls");
  const file = document.createElement("input");
  file.type = "file";
  file.accept = ".fa,.fasta,.faa,.fna,.txt,.seq";
  file.className = "bls-file";
  const run = blEl("button", null, "Search it");
  const reset = blEl("button", "bls-secondary", "Back to the globins");
  const msg = blEl("span", "bls-msg");
  row.appendChild(file);
  row.appendChild(run);
  row.appendChild(reset);
  row.appendChild(msg);
  box.appendChild(row);

  file.onchange = function () {
    const f = file.files && file.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = function () { ta.value = String(r.result).slice(0, 2000000); apply(); };
    r.readAsText(f);
  };

  function apply() {
    const records = blParseFasta(ta.value);
    const alphabet = records.length ? blGuessAlphabet(records[0].seq) : "protein";
    const err = blCheck(records, alphabet);
    if (err) { msg.textContent = err; msg.className = "bls-msg bad"; return; }

    const query = records[0];
    const db = records.slice(1);
    cfg.alphabet = alphabet;
    // The word size and threshold follow the alphabet, or a protein default
    // would be used on nucleotides and find nothing.
    cfg.word = alphabet === "dna" ? 11 : 3;
    cfg.threshold = alphabet === "dna" ? null : 11;
    cfg.window = alphabet === "dna" ? 0 : 40;
    cfg.gap = alphabet === "dna" ? -5 : -8;
    cfg.custom = { query: query, db: db.length ? db : blData({ alphabet: alphabet }).db };
    cfg.focus = 0;
    msg.textContent = query.name + ", " + query.seq.length + " residues, read as "
      + (alphabet === "dna" ? "nucleotide" : "protein")
      + (db.length ? ", against your " + db.length + " sequences." : ", against the built-in set.");
    msg.className = "bls-msg ok";
    redraw();
  }

  run.onclick = apply;
  reset.onclick = function () {
    cfg.custom = null;
    ta.value = "";
    msg.textContent = "";
    msg.className = "bls-msg";
    redraw();
  };
  return box;
}

if (typeof window !== "undefined") {
  window.renderBLAST = renderBLAST;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    blDefaults: blDefaults, blWords: blWords, blNeighbourhood: blNeighbourhood,
    blLookup: blLookup, blScan: blScan, blTwoHit: blTwoHit, blExtend: blExtend,
    blBanded: blBanded, blRun: blRun, blSelfCheck: blSelfCheck,
    BL_PROTEIN: BL_PROTEIN, BL_DNA: BL_DNA
  };
}
