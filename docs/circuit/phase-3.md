# Phase 3, navigation

circuit/nav.js on top of the world. Nothing in it moves by itself; every
camera move answers the visitor.

## What is in
- Explore: drag pans (pointer events, so mouse and touch alike), wheel and
  trackpad pinch zoom about the cursor, two-finger pinch and pan on touch.
  Zoom 0.85 to 4.5, target clamped to the plate, so the world stays
  composed at both ends.
- Stops: each of the seven is its own group. On approach (zoom past 1.15
  and the stop near the centre) it lifts 1.2 units and its label fades in,
  timing-tower small caps with a paper halo. Hover, keyboard focus, the
  open state and the lap guide light a label outright.
- Fly-to: 750 ms ease-in-out, zoom in log space, then the panel opens.
  Tall stops frame halfway up so the label stays in view. The target
  shifts right by half the panel so the stop sits centred in what is left.
  Esc or Close flies back to the view you left.
- Mini-map: bottom right, the track and pit lane in ink, seven dots,
  an accent dot for the camera. Click a dot to fly there. Mouse only;
  the pins carry the keyboard.
- Lap guide: Start lap flies to the grid, then drives the racing line at
  16 units a second, pausing 1.7 s at each stop in lap order with its
  label lit, and flies home at the end. Any pointer, wheel or Escape skips
  it. It never autoplays.
- Keyboard: Tab moves Start lap, then stops 01 to 07 in order; Enter
  opens; Esc closes; arrows pan; + and - zoom; 0 or Home resets.
- Reduced motion: no render loop, instant cuts for fly-to and the lap
  guide, labels appear without fading.

## Gate (tools/circuit/navtest.py, real Chrome over CDP, both modes)
| check | motion | reduced motion |
| --- | --- | --- |
| loads, loop state | loop running | no loop |
| idle: camera still, no stop lifted | yes | yes |
| Tab order | Start lap, then stop 01 | same |
| focused label visible | yes | yes |
| Enter to panel open | 809 ms | 57 ms |
| focus lands on Close, Esc returns it to the stop | yes | yes |
| Tab reaches all seven stops, Enter on the last opens it | yes | yes |
| arrows and + move the view, 0 returns home | yes | yes |
| wheel zooms, drag pans | yes | yes |
| labels after zooming in | the court | the court |
| click on the court opens Betta | yes | yes |
| mini-map dot opens Economics | yes | yes |
| lap guide runs, Skip lap shown, labels lit in order, Esc ends | yes | yes |
| draw calls | 39 | 39 |
| fps | 60 | (single frames) |

Full JSON: docs/circuit/phase-3-report.json. Screenshots: phase-3-motion-open.png
(About open), phase-3-motion-explore.png (after a wheel and a drag),
phase-3-motion-lap.png (mid lap), plus the reduced-motion set.

Fly-to under 900 ms: yes, 750 ms by constant, 809 ms measured from the
key press to the panel being open. No motion outside the permitted list:
the idle check shows the camera and every stop still; the lift and the
camera only move on input.

## Files to commit (in addition to Phase 2)
circuit/nav.js, circuit/circuit.css, circuit.html, tools/circuit/navtest.py,
docs/circuit/phase-3.md, docs/circuit/phase-3-report.json, docs/circuit/phase-3-*.png.
