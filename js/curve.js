/* =====================================================================
   curve.js — the mathematics shared by the homepage and inner pages.
   Parabola: y = a·x² + k   (vertex at (0, k))
   ===================================================================== */
(function () {
  "use strict";

  // y-value of the parabola at x.
  function f(curve, x) { return curve.a * x * x + curve.k; }

  // Arc length along y = a·x² + k from the vertex to x (signed).
  // (k only shifts the curve vertically, so it does not change lengths.)
  function arcLength(a, x) {
    var u = 2 * a * Math.abs(x);
    var s = (u * Math.sqrt(1 + u * u) + Math.asinh(u)) / (4 * a);
    return x < 0 ? -s : s;
  }

  // Inverse of arcLength for s >= 0 (bisection).
  function xAtArc(a, s) {
    var lo = 0, hi = 1;
    while (arcLength(a, hi) < s) hi *= 2;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (arcLength(a, mid) < s) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // Coordinates of the navigation points: equal spacing along the curve
  // on each side of the vertex, outermost points at x = ±pointsSpanX.
  function computePoints(config) {
    var list = config.navPoints;
    var curve = config.curve;
    var v = -1;
    for (var i = 0; i < list.length; i++) if (list[i].vertex) v = i;
    if (v === -1) v = Math.floor(list.length / 2);

    var edgeArc = arcLength(curve.a, config.pointsSpanX);
    var nLeft = v, nRight = list.length - 1 - v;

    return list.map(function (item, i) {
      var x = 0;
      if (i < v) x = -xAtArc(curve.a, edgeArc * (v - i) / nLeft);
      if (i > v) x = xAtArc(curve.a, edgeArc * (i - v) / nRight);
      return {
        index: i,
        label: item.label,
        href: item.href,
        isVertex: i === v,
        side: i < v ? "left" : i > v ? "right" : "vertex",
        x: x,
        y: f(curve, x) // the point lies exactly on the curve
      };
    });
  }

  // "−1.5" style number: up to 2 decimals, real minus sign, no "-0".
  function formatNumber(n) {
    var r = Math.round(n * 100) / 100;
    if (r === 0) r = 0;
    return String(r).replace("-", "−");
  }

  // "y = x² − 2", "y = ½x² + 1", ...
  function equationText(curve) {
    var a = curve.a, k = curve.k;
    var coef = a === 1 ? "" : a === -1 ? "−" : a === 0.5 ? "½" : formatNumber(a);
    var text = "y = " + coef + "x²";
    if (k < 0) text += " − " + formatNumber(-k);
    if (k > 0) text += " + " + formatNumber(k);
    return text;
  }

  function pointText(p) {
    return "(" + formatNumber(p.x) + ", " + formatNumber(p.y) + ")";
  }

  window.CurveMath = {
    f: f,
    arcLength: arcLength,
    xAtArc: xAtArc,
    computePoints: computePoints,
    formatNumber: formatNumber,
    equationText: equationText,
    pointText: pointText
  };
})();
