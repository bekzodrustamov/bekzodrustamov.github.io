/* =====================================================================
   page.js — keeps the coordinates shown on inner pages in sync with
   js/config.js. Each page's <body data-page="..."> names its own file.
   The pages also work without this script (values are written in HTML).
   ===================================================================== */
(function () {
  "use strict";
  var config = window.GRAPH_CONFIG;
  var M = window.CurveMath;
  if (!config || !M) return;

  var page = document.body.getAttribute("data-page");
  var points = M.computePoints(config);
  var current = points.filter(function (p) { return p.href === page; })[0];

  document.querySelectorAll("[data-equation]").forEach(function (el) {
    el.textContent = M.equationText(config.curve);
  });
  if (current) {
    document.querySelectorAll("[data-coords]").forEach(function (el) {
      el.textContent = M.pointText(current);
    });
  }
})();
