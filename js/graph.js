/* =====================================================================
   graph.js — draws the coordinate plane, the parabola and the seven
   navigation points. Content and settings come from js/config.js,
   the mathematics from js/curve.js. You rarely need to edit this file.
   ===================================================================== */
(function () {
  "use strict";

  var config = window.GRAPH_CONFIG;
  var M = window.CurveMath;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var svg = document.getElementById("graph");
  var equationEl = document.getElementById("readout-equation");
  var pointEl = document.getElementById("readout-point");
  var readoutEl = document.getElementById("readout");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var currentPoints = [];

  /* ---------- helpers ---------- */

  function make(tag, attrs, parent, text) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }

  function round(n) { return Math.round(n * 100) / 100; }

  function rectsOverlap(r1, r2, pad) {
    return r1.x < r2.x + r2.w + pad && r1.x + r1.w + pad > r2.x &&
           r1.y < r2.y + r2.h + pad && r1.y + r1.h + pad > r2.y;
  }

  function bboxRect(node) {
    var b = node.getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }

  /* ---------- screen framing ----------
     The equation never changes; only scale (px per unit) and origin move. */

  function computeFrame(W, H) {
    var narrow = W <= config.narrowMaxWidth || H > W * 1.15;
    var fr = narrow ? config.frames.narrow : config.frames.wide;
    var xEdge = config.pointsSpanX;

    // Region that must be visible: all points, the vertex and the origin.
    var yLow = Math.min(config.curve.k, 0);
    var yHigh = Math.max(M.f(config.curve, xEdge), 0);

    var padTop = Math.min(fr.padTop, H * 0.12);
    var padBottom = Math.min(fr.padBottom, H * 0.18);
    var availW = W - 2 * fr.padX;
    var availH = H - padTop - padBottom;

    var s = Math.min(availW / (2 * xEdge), availH / (yHigh - yLow)) * fr.fill;
    s = Math.max(8, Math.min(s, fr.maxScale));

    var top = padTop + (availH - (yHigh - yLow) * s) / 2; // screen y of yHigh
    return {
      W: W, H: H, s: s, narrow: narrow, labels: fr.labels,
      ox: W / 2,              // screen x of the origin
      oy: top + yHigh * s     // screen y of the origin
    };
  }

  /* ---------- label placement ---------- */

  // Candidate label spots, named relative to the curve so that mirrored
  // points (left arm / right arm) can use the same placement:
  //   "out" = away from the parabola's axis, "in" = toward it (inside the U).
  var ORDER = {
    outside: ["out", "outDown", "outUp", "outBelow", "in", "inUp", "inAbove", "inDown", "above", "below"],
    inside:  ["in", "inUp", "inAbove", "inDown", "out", "outDown", "outUp", "outBelow", "above", "below"],
    vertex:  ["outDown", "outBelow", "inDown", "inBelow", "out", "in"]
  };

  function spotRect(name, p, w, h, gap) {
    var dir = p.side === "left" ? -1 : 1;    // +1: outward is to the right
    var d = gap * 0.72, px = p.px, py = p.py;
    function side(sign, offset) {            // x for a label beside the point
      return sign * dir > 0 ? px + offset : px - offset - w;
    }
    var x, y;
    switch (name) {
      case "out":      x = side(1, gap);  y = py - h / 2; break;
      case "in":       x = side(-1, gap); y = py - h / 2; break;
      case "outUp":    x = side(1, d);    y = py - d - h; break;
      case "outDown":  x = side(1, d);    y = py + d; break;
      case "inUp":     x = side(-1, d);   y = py - d - h; break;
      case "inDown":   x = side(-1, d);   y = py + d; break;
      // Labels stacked above/below the point, kept off the steep curve.
      case "inAbove":  x = side(-1, 4); y = py - gap - h - 4; break;
      case "outBelow": x = side(1, 0);  y = py + gap + 6; break;
      case "inBelow":  x = side(-1, 4); y = py + gap + 6; break;
      case "above":    x = px - w / 2;    y = py - gap - h; break;
      case "below":    x = px - w / 2;    y = py + gap; break;
    }
    return { name: name, x: x, y: y, w: w, h: h };
  }

  // Samples ~1px apart along the visible curve, used for collision tests.
  function sampleCurve(fr, xMax) {
    var a = config.curve.a, pts = [], x = -xMax;
    while (x <= xMax) {
      pts.push([fr.ox + x * fr.s, fr.oy - M.f(config.curve, x) * fr.s]);
      x += 1 / (fr.s * Math.sqrt(1 + 4 * a * a * x * x));
    }
    return pts;
  }

  function hitsCurve(rect, samples, pad) {
    for (var i = 0; i < samples.length; i++) {
      var q = samples[i];
      if (q[0] > rect.x - pad && q[0] < rect.x + rect.w + pad &&
          q[1] > rect.y - pad && q[1] < rect.y + rect.h + pad) return true;
    }
    return false;
  }

  // Penalty for one candidate; 0 means nothing is touched.
  function scoreRect(rect, ctx) {
    var m = config.edgeMargin, score = 0;
    if (rect.x < m || rect.y < m || rect.x + rect.w > ctx.W - m || rect.y + rect.h > ctx.H - m) score += 1000;
    ctx.placed.forEach(function (r) { if (rectsOverlap(rect, r, 8)) score += 500; });
    ctx.points.forEach(function (r) { if (rectsOverlap(rect, r, 3)) score += 300; });
    ctx.hard.forEach(function (r) { if (rectsOverlap(rect, r, 2)) score += 300; });
    if (hitsCurve(rect, ctx.samples, config.curveClearance)) score += 200;
    ctx.axes.forEach(function (r) { if (rectsOverlap(rect, r, 2)) score += 100; });
    ctx.soft.forEach(function (r) { if (rectsOverlap(rect, r, 3)) score += 20; });
    return score;
  }

  function setLabel(p, rect, ctx) {
    p.labelGroup.setAttribute("transform",
      "translate(" + round(rect.x - p.bb.x) + " " + round(rect.y - p.bb.y) + ")");
    p.labelRect = rect;
    ctx.placed.push(rect);
  }

  function gapFor(p) { return config.labelGap + (p.isVertex ? 16 : 0); } // vertex: clear its ring

  // Places the vertex label first, then each mirrored pair of points
  // (same distance from the vertex) with the same named spot, so the
  // layout stays symmetric. Picks the first spot that touches nothing.
  function placeLabels(points, fr, ctx) {
    points.forEach(function (p) { p.bb = p.labelGroup.getBBox(); });
    var v = points.filter(function (p) { return p.isVertex; })[0];
    var vi = v.index;

    var best = null;
    ORDER.vertex.some(function (name) {
      var r = spotRect(name, v, v.bb.width, v.bb.height, gapFor(v));
      var score = scoreRect(r, ctx);
      if (!best || score < best.score) best = { rect: r, score: score };
      return score === 0;
    });
    setLabel(v, best.rect, ctx);

    for (var k = 1; k < points.length; k++) {
      var pair = [points[vi - k], points[vi + k]].filter(Boolean);
      if (!pair.length) break;
      var bestPair = null;
      ORDER[fr.labels].some(function (name) {
        var rects = [], total = 0;
        pair.forEach(function (p) {
          var r = spotRect(name, p, p.bb.width, p.bb.height, gapFor(p));
          total += scoreRect(r, ctx);
          rects.push(r);
          ctx.placed.push(r);            // so the partner avoids it too
        });
        ctx.placed.length -= rects.length;
        if (!bestPair || total < bestPair.score) bestPair = { rects: rects, score: total };
        return total === 0;
      });
      // If no shared spot is perfect, fall back to the best spot for each point.
      if (bestPair.score > 0) {
        bestPair.rects = pair.map(function (p) {
          var b = null;
          ORDER[fr.labels].some(function (name) {
            var r = spotRect(name, p, p.bb.width, p.bb.height, gapFor(p));
            var sc = scoreRect(r, ctx);
            if (!b || sc < b.score) b = { rect: r, score: sc };
            return sc === 0;
          });
          ctx.placed.push(b.rect);
          return b.rect;
        });
        ctx.placed.length -= pair.length;
      }
      pair.forEach(function (p, j) { setLabel(p, bestPair.rects[j], ctx); });
    }
  }

  /* ---------- drawing ---------- */

  function render(animate) {
    var box = svg.getBoundingClientRect();
    var W = Math.max(1, Math.round(box.width));
    var H = Math.max(1, Math.round(box.height));
    var fr = computeFrame(W, H);
    var s = fr.s, ox = fr.ox, oy = fr.oy, curve = config.curve;
    function px(x) { return ox + x * s; }
    function py(y) { return oy - y * s; }

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.style.setProperty("--draw-duration", config.drawDurationMs + "ms");
    svg.classList.toggle("is-animated", !!animate && !reduceMotion.matches);
    svg.classList.toggle("is-narrow", fr.narrow);
    while (svg.lastChild && svg.lastChild.nodeName !== "title" && svg.lastChild.nodeName !== "desc") {
      svg.removeChild(svg.lastChild);
    }
    equationEl.textContent = M.equationText(curve);

    var decor = make("g", { "aria-hidden": "true" }, svg);
    var i;

    // Integer range visible on screen.
    var xFrom = Math.ceil(-ox / s), xTo = Math.floor((W - ox) / s);
    var yFrom = Math.ceil((oy - H) / s), yTo = Math.floor(oy / s);

    // Grid, one line per unit.
    var grid = make("g", { class: "grid" }, decor);
    for (i = xFrom; i <= xTo; i++) if (i !== 0) make("line", { x1: px(i), y1: 0, x2: px(i), y2: H }, grid);
    for (i = yFrom; i <= yTo; i++) if (i !== 0) make("line", { x1: 0, y1: py(i), x2: W, y2: py(i) }, grid);

    // Axes through the origin, arrowheads on the positive ends.
    var defs = make("defs", {}, decor);
    var marker = make("marker", { id: "arrow", viewBox: "0 0 10 10", refX: "9", refY: "5",
      markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
    make("path", { d: "M0 1 L9 5 L0 9", class: "axis-arrow" }, marker);
    var axes = make("g", { class: "axes" }, decor);
    make("line", { class: "x-axis", x1: 0, y1: oy, x2: W - 6, y2: oy, "marker-end": "url(#arrow)" }, axes);
    make("line", { class: "y-axis", x1: ox, y1: H, x2: ox, y2: 6, "marker-end": "url(#arrow)" }, axes);
    var axisNames = [
      make("text", { x: W - 14, y: oy - 12, class: "axis-name", "text-anchor": "end" }, decor, "x"),
      make("text", { x: ox + 12, y: 20, class: "axis-name" }, decor, "y"),
      make("text", { x: ox - 8, y: oy + 17, class: "tick-label origin-label", "text-anchor": "end" }, decor, "O")
    ];

    // Tick marks every unit, numbers every unit (or every 2 when crowded).
    var ticks = make("g", { class: "ticks" }, decor);
    var tickLabels = [];
    var step = s < 44 ? 2 : 1;
    for (i = xFrom; i <= xTo; i++) {
      if (i === 0 || px(i) > W - 28) continue;
      make("line", { x1: px(i), y1: oy - 4, x2: px(i), y2: oy + 4 }, ticks);
      if (i % step === 0) tickLabels.push(make("text", { x: px(i), y: oy + 18, "text-anchor": "middle", class: "tick-label" }, decor, M.formatNumber(i)));
    }
    for (i = yFrom; i <= yTo; i++) {
      if (i === 0 || py(i) < 34) continue;
      make("line", { x1: ox - 4, y1: py(i), x2: ox + 4, y2: py(i) }, ticks);
      if (i % step === 0) tickLabels.push(make("text", { x: ox - 9, y: py(i) + 4, "text-anchor": "end", class: "tick-label" }, decor, M.formatNumber(i)));
    }

    // The parabola: one exact quadratic Bézier between x = ±xVis.
    // For y = a·x² + k, the end tangents meet at (0, k − a·xVis²).
    var yScreenTop = (oy + 12) / s; // math y just above the top edge
    var xVis = Math.min(Math.sqrt((yScreenTop - curve.k) / curve.a), (ox + 12) / s);
    var yEnd = M.f(curve, xVis);
    make("path", {
      class: "curve",
      d: "M" + round(px(-xVis)) + " " + round(py(yEnd)) +
         " Q" + round(px(0)) + " " + round(py(curve.k - curve.a * xVis * xVis)) +
         " " + round(px(xVis)) + " " + round(py(yEnd)),
      pathLength: "1",
      "aria-hidden": "true"
    }, svg);

    // Navigation points (DOM order = left to right = Tab order).
    var points = M.computePoints(config);
    currentPoints = points;
    var layer = make("g", { class: "points" }, svg);
    var totalArc = 2 * M.arcLength(curve.a, xVis);

    points.forEach(function (p) {
      p.px = px(p.x);
      p.py = py(p.y);
      var r = p.isVertex ? config.vertexRadius : config.pointRadius;
      var link = make("a", {
        href: p.href,
        class: "nav-point" + (p.isVertex ? " is-vertex" : ""),
        "aria-label": p.label + (p.isVertex ? ", vertex of the parabola" : ""),
        "data-index": p.index
      }, layer);
      link.style.setProperty("--delay",
        Math.round(config.drawDurationMs * (M.arcLength(curve.a, p.x) + totalArc / 2) / totalArc) + "ms");

      make("circle", { class: "hit-area", cx: p.px, cy: p.py, r: config.hitRadius }, link);
      if (p.isVertex) make("circle", { class: "vertex-ring", cx: p.px, cy: p.py, r: r + 7 }, link);
      make("circle", { class: "focus-ring", cx: p.px, cy: p.py, r: r + (p.isVertex ? 12 : 6) }, link);
      make("circle", { class: "point", cx: p.px, cy: p.py, r: r }, link);

      p.labelGroup = make("g", { class: "label-group", "aria-hidden": "true" }, link);
      make("text", { class: "nav-label", x: 0, y: 0 }, p.labelGroup, p.label);
      if (p.isVertex) make("text", { class: "nav-sub", x: 0, y: 19 }, p.labelGroup, "vertex " + M.pointText(p));
    });

    // Obstacles for labels.
    var pointRects = points.map(function (p) {
      var r = (p.isVertex ? config.vertexRadius + 7 : config.pointRadius) + 2;
      return { x: p.px - r, y: p.py - r, w: 2 * r, h: 2 * r };
    });
    var hard = axisNames.map(bboxRect);
    var rb = readoutEl.getBoundingClientRect();
    if (rb.width) hard.push({ x: rb.left, y: rb.top, w: rb.width, h: rb.height });
    var ctx = {
      W: W, H: H,
      samples: sampleCurve(fr, xVis),
      placed: [],
      points: pointRects,
      hard: hard,
      axes: [ { x: 0, y: oy - 5, w: W, h: 10 }, { x: ox - 5, y: 0, w: 10, h: H } ],
      soft: tickLabels.map(bboxRect)
    };
    placeLabels(points, fr, ctx);

    // Remove tick numbers that would touch a label, a point or the curve.
    tickLabels.forEach(function (t) {
      var r = bboxRect(t);
      var clash = ctx.placed.some(function (l) { return rectsOverlap(r, l, 4); }) ||
                  pointRects.some(function (pr) { return rectsOverlap(r, pr, 3); }) ||
                  hitsCurve(r, ctx.samples, 2);
      if (clash) t.remove();
    });
  }

  /* ---------- interaction ---------- */

  function showReadout(link) {
    var p = currentPoints[Number(link.getAttribute("data-index"))];
    if (p) pointEl.textContent = p.label + " " + M.pointText(p);
  }
  function clearReadout() { pointEl.textContent = ""; }

  svg.addEventListener("pointerover", function (e) {
    var link = e.target.closest(".nav-point");
    if (link && e.pointerType === "mouse") showReadout(link);
  });
  svg.addEventListener("pointerout", function (e) {
    if (e.target.closest(".nav-point")) clearReadout();
  });
  svg.addEventListener("focusin", function (e) {
    var link = e.target.closest(".nav-point");
    if (link) showReadout(link);
  });
  svg.addEventListener("focusout", clearReadout);

  // Enter and Space both open the focused point's page.
  svg.addEventListener("keydown", function (e) {
    var link = e.target.closest(".nav-point");
    if (!link) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      window.location.href = link.getAttribute("href");
    }
  });

  /* ---------- start ---------- */

  var resizeQueued = false;
  window.addEventListener("resize", function () {
    if (resizeQueued) return;
    resizeQueued = true;
    window.requestAnimationFrame(function () {
      resizeQueued = false;
      render(false);
    });
  });

  // Wait briefly for web fonts so labels are measured in the right font.
  var started = false;
  function start() {
    if (started) return;
    started = true;
    render(true);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(start, 700);
    // If a font finishes loading later, re-measure labels once the
    // draw animation is over (so the animation is never interrupted).
    document.fonts.addEventListener("loadingdone", function () {
      setTimeout(function () { render(false); }, config.drawDurationMs + 400);
    });
  } else {
    start();
  }
})();
