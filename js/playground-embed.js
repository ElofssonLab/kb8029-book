/* Embed the Neural Network Playground inside a "Try it" box.
 *
 * Sessions 7 and 9 argue with the playground, and the argument is almost always
 * a comparison: XOR with and without a hidden layer, sigmoid against ReLU, the
 * same lambda through L2 and through L1. A plain <iframe> can only hold one of
 * those, which is why these boxes shipped as links first.
 *
 * So the frame is not a second copy of the links: it is where the links open.
 * Every playground link already written into the prose of a box keeps its text
 * and its href, and this file makes clicking one load it into the box's own
 * frame instead of opening a tab. The prose reads the same either way, and
 * with JavaScript off -- or in the PDF, where none of this exists -- the links
 * do what they have always done.
 *
 * Two things are worth knowing about the frame itself:
 *
 *   - The playground's own layout bottoms out near 1000px and the book's body
 *     column is about 730, so the frame is rendered at its natural width and
 *     scaled down with a CSS transform. The factor is computed from the
 *     container rather than written down, because the column is narrower on a
 *     laptop and narrower again on a phone, and a hard-coded factor would be
 *     wrong on both.
 *
 *   - Its height depends on what is in it: a network six layers deep is taller
 *     than one with a single hidden layer. The page is served from this site,
 *     so the frame is same-origin and can simply be measured once it has
 *     loaded. HEIGHT_FALLBACK is only for the case where that measurement is
 *     refused.
 */
(function () {
  "use strict";

  // The playground's own layout reports a scrollWidth of 1001 at its minimum,
  // so a frame of exactly 1000 leaves a one-pixel horizontal scrollbar across
  // the bottom of every box. The few extra pixels cost about half a percent
  // of scale and remove it.
  var FRAME_W = 1020;
  var HEIGHT_FALLBACK = 620;   // only if the frame cannot be measured
  var MEASURE_H = 1600;        // certainly taller than any preset, for measuring
  var SELECTOR = 'a[href*="/playground/"]';

  function hideText(url) {
    // The surrounding article, header and footer belong to the standalone
    // page, not to a box inside a chapter that has already made the argument.
    if (url.indexOf("hideText") !== -1) return url;
    return url + (url.indexOf("#") === -1 ? "#" : "&") + "hideText=true";
  }

  /* The links in the prose are absolute (https://course.bioinfo.se/...), which
   * is what the PDF needs and what someone copying one out of the page wants.
   * The frame must not use them: an absolute link loads the deployed site,
   * which is a different origin from a local preview, so the frame cannot be
   * measured and a preview would silently embed production. Re-point it at
   * this site instead, keeping only the path and the preset. The link the
   * reader can click to open it full size stays absolute. */
  function sameOrigin(href) {
    try {
      var u = new URL(href, window.location.href);
      return u.pathname.replace(/^\//, "") + u.search + u.hash;
    } catch (e) {
      return href;
    }
  }

  function build(slot) {
    var box = slot.closest(".tryit") || slot.parentNode;
    // Links inside the folded answer are prose, not configurations to run.
    var answer = box.querySelector(".callout-style-simple");
    var links = [].filter.call(box.querySelectorAll(SELECTOR), function (a) {
      return !(answer && answer.contains(a)) && a.getAttribute("href").indexOf("#") !== -1;
    });
    if (!links.length) return;

    var wrap = document.createElement("div");
    wrap.className = "pg-frame";
    var frame = document.createElement("iframe");
    frame.title = "The Neural Network Playground, on this configuration";
    frame.loading = "lazy";
    frame.src = hideText(sameOrigin(links[0].getAttribute("href")));
    frame.width = FRAME_W;
    wrap.appendChild(frame);

    // Outside the frame's box, not inside it: the box is clipped to the scaled
    // height, so anything within it that is not the frame gets cut off.
    var foot = document.createElement("p");
    foot.className = "pg-foot";
    var open = document.createElement("a");
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.textContent = "open this one full size";
    open.href = links[0].getAttribute("href");
    foot.appendChild(document.createTextNode("The links above load here. "));
    foot.appendChild(open);

    slot.appendChild(wrap);
    slot.appendChild(foot);

    var naturalH = null;   // the frame's content height, measured once per preset
    var naturalW = FRAME_W;

    var nav = 0;

    function show(href) {
      // The playground reads its whole state at load and never again, so a
      // preset has to arrive as a real navigation. The presets differ only in
      // the hash, and a hash-only change does not reload, so each one gets a
      // query of its own to navigate against. (Bouncing through about:blank
      // instead races the second assignment and can leave the frame on an
      // empty document.)
      naturalH = null;     // a deeper network is a taller page
      naturalW = FRAME_W;
      var u = hideText(sameOrigin(href));
      var hash = u.indexOf("#");
      var path = hash === -1 ? u : u.slice(0, hash);
      var frag = hash === -1 ? "" : u.slice(hash);
      path += (path.indexOf("?") === -1 ? "?" : "&") + "e=" + (++nav);
      frame.src = path + frag;
      open.href = href;
    }

    links.forEach(function (a) {
      a.addEventListener("click", function (ev) {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return; // let them open a tab
        ev.preventDefault();
        show(a.getAttribute("href"));
        links.forEach(function (o) { o.classList.remove("pg-current"); });
        a.classList.add("pg-current");
        wrap.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    });
    links[0].classList.add("pg-current");

    /* The height of the content, as a distance within the frame's own layout.
     *
     * Not scrollHeight: that is never less than the frame's own height, and
     * this function is what decides that height, so using it makes each pass
     * grow the frame by the amount the last pass added. The gap between the
     * foot of #main-part and the top of <body> is a property of the content
     * alone, so it is the same whatever height the frame currently has, and
     * the measurement settles after one pass. */
    function measure() {
      try {
        var doc = frame.contentDocument;
        if (!doc || !doc.body) return null;
        var main = doc.querySelector("#main-part");
        if (!main) return null;
        // Measure against a frame that is certainly tall enough. At its
        // starting height the content overflows, so the frame shows its own
        // vertical scrollbar, which narrows the content and leaves a sliver of
        // horizontal scrollbar in the finished box.
        frame.style.height = MEASURE_H + "px";
        var h = main.getBoundingClientRect().bottom - doc.body.getBoundingClientRect().top;
        if (!(h > 100)) return null;
        // How wide the content actually wants to be. The playground has a
        // minimum width but its margins do not divide evenly into it, so a
        // frame sized by eye leaves a few pixels of horizontal scrollbar along
        // the bottom of the box. Measured once per preset and clamped, so a
        // surprising value cannot run away with the layout.
        var w = doc.documentElement.scrollWidth;
        if (w > FRAME_W && w <= FRAME_W + 120) naturalW = w + 2;
        return Math.ceil(h) + 10;
      } catch (e) {
        return null;   // not same-origin, or not loaded yet
      }
    }

    function fit() {
      var avail = slot.clientWidth;
      if (!avail) return;
      if (naturalH === null) naturalH = measure();
      var h = naturalH || HEIGHT_FALLBACK;
      var scale = Math.min(1, avail / naturalW);
      frame.width = naturalW;
      frame.style.height = h + "px";
      frame.style.transform = "scale(" + scale + ")";
      wrap.style.height = Math.ceil(h * scale) + "px";
    }

    /* The frame is sized to the widget, so everything the embedded page keeps
     * below it -- its own footer and attribution -- falls outside and would
     * otherwise leave the document scrollable, which shows as a vertical
     * scrollbar and, because that narrows the content, a sliver of horizontal
     * one as well. The page is same-origin and is our own copy, so the
     * scrollbars are simply turned off. Nothing is lost: the chapter credits
     * the Playground in its own prose, and "open this one full size" leads to
     * the whole page, footer and licence included. */
    function trim() {
      try {
        var doc = frame.contentDocument;
        if (!doc || !doc.documentElement) return;
        if (doc.getElementById("pg-embed-trim")) return;
        var css = doc.createElement("style");
        css.id = "pg-embed-trim";
        css.textContent = "html,body{overflow:hidden !important;}";
        (doc.head || doc.documentElement).appendChild(css);
      } catch (e) { /* not same-origin: leave the page alone */ }
    }

    frame.addEventListener("load", function () {
      fit(); trim(); window.setTimeout(function () { fit(); trim(); }, 250);
    });
    if (window.ResizeObserver) new ResizeObserver(fit).observe(slot);
    else window.addEventListener("resize", fit);
    fit();
  }

  function init() {
    [].forEach.call(document.querySelectorAll(".pg-embed"), build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
