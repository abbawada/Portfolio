# Phase 2, the world

Wada Ring built as a Three.js diorama from circuit/layout.js, the same
coordinates as the approved flat map. Page: circuit.html. Code:
circuit/world.js, circuit/circuit.css, circuit/vendor (three 0.185.1, MIT).

## What is in the scene
- One merged static mesh with baked flat shading: plate, track ribbon and
  edge lines, curbs, start chequer, pit lane, gravel, paddock, car park,
  court with lines, hoops and the ball frozen mid-arc, running lane, every
  building box, the colonnade, billboards, the open garage bay with its
  bench and scope screen, the flag pole.
- One shadow mesh, flat hulls under every building and tree, one light from
  the upper left, no shadow maps.
- One instanced mesh for the 54 trees.
- Text on faces as canvas planes: the Exchange ticker, the pit-wall email,
  the track temperature board, three billboards (AWUS rated W; C++,
  Python, SQL; IMU, haptics, firmware), the circuit name on the plate edge,
  BETTA painted on the T1 run-off, the number 10 on the car, the BETTA
  banner on the blimp. Text pops in after the fonts load; the world does
  not wait for it.
- Camera: orthographic, azimuth 45 degrees, elevation 30 degrees, the 2:1
  look of the map. Default view width 318 units. ?zoom=N&at=u,v frames a
  detail for review and goes away in Phase 6.

## The five ambient elements (restraint audit)
1. The car, number 10, lapping at 8.5 units a second, slowing in corners.
2. The start flag, a sine wave along its length.
3. The Exchange ticker, project names scrolling.
4. The blimp, drifting on a slow loop with its ground shadow.
5. The garage oscilloscope, a trace and a soft glow behind it.
Everything else is still. Count of continuously moving things: 5.
prefers-reduced-motion: no render loop at all, the car parked on the grid,
one frame on load and on resize.

## Measurements (tools/circuit/perf.py, real Chrome over CDP)
| run | fps (mean of 6 to 8 one-second samples) | draw calls | triangles |
| --- | --- | --- | --- |
| desktop 1600x900, DPR 1 | 60.0 | 30 | 6,509 |
| phone proxy 390x844, DPR 3, 4x CPU throttle | 60.0 | 30 | 6,509 |

GL renderer in both runs: ANGLE Metal on the Apple M4 Pro. The phone run
proves the CPU side under throttle only; fill rate on a real mid-tier phone
is unmeasured until Phase 5 puts it on a device.

JS gzipped: three.module.min.js + three.core.min.js + world.js + layout.js
= 199 KB, budget 350 KB. Draw calls 30, budget 150.

## Section 11 checklist, run after Phase 2
- Could this diorama belong to any developer? At default zoom the court in
  the infield, the BETTA blimp, the cardinal and gold curbs at Campus
  Corner and the paper and gold palette are his; the breadboard car, the
  scope, the AWUS board and the email read once you zoom. Labels on
  approach (Phase 3) make the seven stops explicit. Verdict: his, with the
  strongest tells at zoom.
- More than 5 continuously moving elements? No, exactly 5, listed above.
- Any mark, layout or livery referencing a real brand, team or venue? No.
  The track is invented. Marks: AWUS, BETTA, Wada Ring, his email, tool
  and language names as plain words, no logos.
- Any text explaining what a visual should be showing? No. Every word in
  the world is signage: project names, tool names, the email, the number.
- Do the shelves feel like the old components? Not built yet (Phase 4).
- Does anything bounce? No. The car eases with curvature, the flag waves,
  the blimp drifts, the ticker scrolls, the scope sweeps.

## Files to commit (branch circuit-v1)
circuit.html, circuit/circuit.css, circuit/world.js, circuit/layout.js,
circuit/vendor/three.module.min.js, circuit/vendor/three.core.min.js,
circuit/vendor/THREE-LICENSE, tools/circuit/map.js, tools/circuit/shot.py,
tools/circuit/perf.py, docs/circuit/decisions.md, docs/circuit/map.svg,
docs/circuit/map.html, docs/circuit/phase-1.png, docs/circuit/phase-2.png,
docs/circuit/phase-2-detail.png, docs/circuit/phase-2.md.
