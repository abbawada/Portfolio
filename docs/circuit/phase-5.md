# Phase 5, fallbacks and mobile

## Reduced motion
Already built into the world and the navigation, verified here again: no
render loop (one frame on load, on resize and after each input), the car
parked on the grid, the flag, ticker, blimp and scope still, instant cuts
for fly-to and for the lap guide, the panel with no fade, the case stage
opening in one step as it does on projects.html.

## No WebGL
When the renderer cannot be created (or ?nowebgl=1 for review), the canvas
hides and images/wada-ring-poster.jpg takes its place: a 1600 by 900 JPEG
of the world (72 KB) captured by tools/circuit/poster.py, which also
projects each stop's hit box into percent polygons (circuit/poster-areas.js).
The seven regions are keyboard buttons with the stop names; labels sit on
the poster at their world positions; a click or Enter opens the same panel
with the same content, the case flip included. Without JavaScript at all,
a noscript block shows the poster with plain links to betta.html,
projects.html, writing.html and about.html.

## Mobile
The full diorama with touch pan and two-finger pinch, no vignette fallback
needed: the phone proxy holds 55 to 60 fps. Portrait gets a closer default
(zoom 1.35) with the world under the timing block, labels held back until
you zoom past that, a stop framed above a 54vh sheet at zoom 3.2 with the
timing block hidden while the sheet is up, and the case grid falling to one
column when two do not fit. The spread keeps its own phone layout.

## Gate (tools/circuit/phase5test.py, real Chrome over CDP)
| run | result |
| --- | --- |
| poster by query | no-WebGL class, canvas hidden, poster loaded, 7 regions, 7 labels, Tab reaches "Stop 01, About, Media tower", Enter opens About, Escape closes, Projects region opens 4 cases, Posture Cue flips, closes clean, no JS errors |
| WebGL disabled for real (--disable-3d-apis) | WebGL unavailable confirmed; every check above the same |
| phone 390x844, DPR 3, touch | loop running, no horizontal scroll, one-finger pan moves the view, pinch zooms to 4.5, tap on the garage opens Projects, sheet rises from the bottom at full width, 4 cases with no overflow, Posture Cue flips and the spread fits the screen, closes clean, 58.4 fps, no JS errors |
| phone with reduced motion | loop off, Betta opens instantly, no JS errors |

Full JSON: docs/circuit/phase-5-report.json. Screenshots: phase-5-poster.png,
phase-5-poster-real.png, phase-5-mobile.png, phase-5-mobile-sheet.png (also
phase-5.png), phase-5-mobile-spread.png, phase-5-mobile-reduced.png.

## Files to commit (in addition to earlier phases)
circuit/poster.js, circuit/poster-areas.js, images/wada-ring-poster.jpg,
circuit.html, circuit/nav.js, circuit/world.js, circuit/circuit.css,
tools/circuit/poster.py, tools/circuit/phase5test.py, docs/circuit/phase-5.md,
docs/circuit/phase-5-report.json, docs/circuit/phase-5*.png.
