# Portfolio — Version 2

A static website (HTML, CSS, vanilla JavaScript). No build step, no dependencies.
Open `index.html` directly in a browser.

## Files

| File | What it is |
|---|---|
| `index.html` | Homepage: full-screen coordinate plane with the parabola y = x² − 2 |
| `about.html`, `experience.html`, `projects.html`, `achievements.html`, `skills.html`, `social-media.html`, `contact.html` | Inner pages (placeholder content) |
| `css/base.css` | **Colors, fonts and sizes** (CSS variables) + shared styles |
| `css/graph.css` | Homepage graph styles |
| `css/page.css` | Inner-page layout and reusable content blocks |
| `js/config.js` | **The seven navigation points, the equation, and framing settings** |
| `js/curve.js` | The shared mathematics (equation, point spacing, number formatting) |
| `js/graph.js` | Draws the graph and places labels (rarely needs editing) |
| `js/page.js` | Keeps inner-page coordinates in sync with `config.js` |

## The mathematics

- Curve: `y = a·x² + k` with `a = 1`, `k = −2` → **y = x² − 2**, vertex **(0, −2)**.
- The axes cross at the origin (0, 0); the vertex (About) is two units below it.
- The same equation and the same seven coordinates are used on every screen.
  Only the scale (pixels per unit), visible range and position adapt.
- Points are spaced at equal distances along the curve; each y is computed from
  the equation, so every point lies exactly on the parabola.

## Common edits

- **Rename a point / change its page:** `navPoints` in `js/config.js`
  (keep `vertex: true` on About).
- **Change a color or font:** variables at the top of `css/base.css`.
- **Change the curve:** `curve` in `js/config.js`. Inner pages show coordinates
  written in the HTML; `js/page.js` updates them automatically from the config.
- **Fill in a page:** replace bracketed `[placeholder]` text, remove the `ph`
  class and the `<span class="ph-tag">Placeholder</span>` badges when done.
  Reusable blocks are documented at the top of `css/page.css`.

## Preview

Double-click `index.html`, or run a local server in this folder:

    python -m http.server 8000

then open http://localhost:8000
