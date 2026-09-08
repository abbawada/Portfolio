# Phase 6, QA and ship

## Remove one thing
The dashed running lane round the court. It read as a UI ring rather than
a track, and nothing pointed at it. Gone from the world and the map;
decisions.md item 6 records it.

## The swap
index.html is now the world. The old home is kept at
docs/circuit/index-classic.html for reference; circuit.html is a redirect
stub to index.html so any open link still lands. The head keeps the shipped
title, description and Open Graph tags verbatim, so search results and
link previews do not change. The four other pages stay as deep links, and
their name link returns to the world.

## Lighthouse, mobile preset, against tools/circuit/serve.py
The plain http.server sends no compression and no cache headers, which is
not what GitHub Pages does, so the measurement runs against a small local
server that gzips text and sets max-age=600 (port 8647).

| category | score |
| --- | --- |
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

| metric | value |
| --- | --- |
| First Contentful Paint | 0.9 s |
| Largest Contentful Paint | 1.2 s |
| Total Blocking Time | 20 ms |
| Cumulative Layout Shift | 0.001 |
| Speed Index | 0.9 s |
| longest task | 71 ms |

Report: docs/circuit/lighthouse-mobile.report.html and .json.

What it took, from a first run of 55: the Google Fonts stylesheet and
styles.css now load without blocking the first paint (media swap with a
noscript fallback; circuit.css carries the site tokens so the timing block
paints right without them); the three classic scripts are deferred; the
world builds in four stages on separate tasks with colour caching, and the
shaders compile off the main thread (renderer.compileAsync) before the loop
starts. The world still appears well inside two seconds on desktop; the
text on faces pops in after the fonts, as the brief allows.

## Regression on the final build (tools/circuit, real Chrome over CDP)
- perf: 60 fps desktop, 60 fps phone proxy with 4x CPU throttle, 40 draw
  calls, 6,331 triangles.
- navigation: keyboard drive intact, Enter to panel 801 ms, reduced motion
  65 ms, every check green in both modes (phase-3-report.json).
- shelves: all seven stops open with their content, the Betta spread mounts
  its capture graphic, no JS errors (phase-4-report.json).
- fallbacks and mobile: poster by query and with WebGL disabled, phone pan,
  pinch, tap, sheet, flip at 58.8 fps, reduced motion (phase-5-report.json).
- JS gzipped, everything the page can load including the shelf engine and
  the capture graphic: 213 KB, budget 350 KB.
- Screenshot: docs/circuit/phase-6.png.

## Before the push (Abba)
1. Open the preview on the LAN, drive a lap, open every stop, on the laptop
   and on the phone, and say yes or what to change. This is the gate.
2. Commit on branch circuit-v1 (the file list below), then publish with the
   usual squash flow when ready. Nothing here ran git.
3. Optional, not blocking: a resume PDF for the Contact stop (the second
   action is LinkedIn until then); the Wheelchair Basketball and Medici
   covers (prompts 8 and 9), which turn those rows into cases; the
   reference images into docs/circuit/refs/ if wanted in the repo.

## Every file this build touched or added
New: index.html (was the classic home), circuit.html (redirect stub),
cases.js, circuit/layout.js, circuit/world.js, circuit/nav.js,
circuit/stops.js, circuit/poster.js, circuit/poster-areas.js,
circuit/circuit.css, circuit/vendor/three.module.min.js,
circuit/vendor/three.core.min.js, circuit/vendor/THREE-LICENSE,
images/wada-ring-poster.jpg, tools/circuit/map.js, shot.py, perf.py,
navtest.py, paritytest.py, phase4test.py, phase5test.py, poster.py,
serve.py, docs/circuit/ (audit.md, decisions.md, phase-2.md to phase-6.md,
map.svg, map.html, index-classic.html, phase-0.png to phase-6.png and the
other screenshots, the JSON reports, lighthouse-mobile.report.*).
Changed: projects.html (its inline shelf script became cases.js, parity
verified exact). Untouched: betta.html, writing.html, about.html,
styles.css, script.js, wave.js, halftone-live.js, betta-capture.js, covers,
videos, the rest of images.
