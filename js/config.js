/* =====================================================================
   GRAPH CONFIGURATION — the one file to edit for homepage content.
   ---------------------------------------------------------------------
   navPoints: the seven points, listed LEFT to RIGHT along the parabola.
     label   – text shown next to the point (also the accessible name)
     href    – page to open (relative path, works locally and online)
     vertex  – set true on exactly ONE point; it sits at the vertex.
   Points are spaced at equal distances along the curve and every
   y-value is computed from the equation, so points always lie on it.
   Colors and fonts live in css/base.css (CSS variables).
   ===================================================================== */
window.GRAPH_CONFIG = {
  navPoints: [
    { label: "Social Media", href: "social-media.html" },
    { label: "Skills",       href: "skills.html" },
    { label: "Experience",   href: "experience.html" },
    { label: "About",        href: "about.html", vertex: true },
    { label: "Projects",     href: "projects.html" },
    { label: "Achievements", href: "achievements.html" },
    { label: "Contact",      href: "contact.html" }
  ],

  /* The parabola y = a·x² + k. Same equation on every screen size.
     With a = 1 and k = -2 this is y = x² − 2, vertex at (0, −2). */
  curve: { a: 1, k: -2 },

  /* The outermost points sit at x = −pointsSpanX and x = +pointsSpanX.
     The same seven coordinates are used on every device. */
  pointsSpanX: 2,

  /* Framing: how the same graph is scaled and positioned per screen.
     padX / padTop / padBottom – space (px) kept free around the plotted points
     fill     – share of the remaining space the points may use (negative space)
     maxScale – largest size of one unit, in px (keeps big screens calm)
     labels   – "outside" puts labels outside the U first, "inside" inside it */
  frames: {
    wide:   { padX: 170, padTop: 64, padBottom: 96, fill: 0.84, maxScale: 150, labels: "outside" },
    narrow: { padX: 16,  padTop: 72, padBottom: 110, fill: 0.92, maxScale: 130, labels: "inside" }
  },
  narrowMaxWidth: 640,      // px; at or below this width (or on portrait screens) use "narrow"

  pointRadius: 6.5,         // px, regular points
  vertexRadius: 9,          // px, the vertex point
  hitRadius: 24,            // px, invisible tap/click area around each point
  labelGap: 14,             // px, distance from point center to its label
  curveClearance: 5,        // px, minimum space between labels and the curve
  edgeMargin: 14,           // px, keep labels this far from the screen edge
  drawDurationMs: 1400      // parabola draw animation on first load
};
