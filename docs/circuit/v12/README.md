# V1.2, legibility, hierarchy, dead ends, and the reference contract

Brief: ~/Downloads/wada-ring-v1.2-prompt.md (2026-09-08). Sections are
worked in order; each gate commits and stops for review.

| gate | sections | state |
| --- | --- | --- |
| A | 2 to 5: persistent labels, one affordance grammar, Betta as the centre of gravity, the respaced map | built 2026-09-08, report in gate-a.md, reviewed by Abba the same night |
| round 2 | Abba's six notes on Gate A: panel exit, the images on the track, cars as projects, the blimp, readable billboards, the lap that follows the cars | built 2026-09-08, report in round-2.md |
| B | section 6, the sleeve monument finished or cut (section 1, the cars, landed in round 2) | open |
| C | per-part reference gates | not started |
| D | the Board audit (Part 7): the images are in the world and the Board panel; the audit table is in round-2.md | ready for review |

## Tools added
- tools/circuit/gate.mjs: Playwright over the installed Chrome (channel
  chrome, no download). Wide captures at 1600 and 1440, one close shot per
  stop, and the overlap audit (label chips against each other, chips
  against the other stops' screen silhouettes, plan footprints, screen
  silhouettes). Playwright resolves from $PLAYWRIGHT, ./node_modules, then
  the betta-live-site install next door.
- tools/circuit/labeltest.mjs: the label contract per stop (title at rest,
  hover adds lift and glow only, cursor, click opens the right panel,
  Escape closes without moving the camera, no hover-only titles).
- tools/circuit/racetest.mjs: steps the race maths for N seconds and
  checks clearance, lateral limits and that the order changes.
- tools/circuit/shots.mjs: detail shots, name:u,v,zoom per frame.
- tools/circuit/board.py: the Board pipeline, originals in
  docs/circuit/refs/board/ to images/board/ and circuit/board.js.
