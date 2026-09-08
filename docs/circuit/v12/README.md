# V1.2, legibility, hierarchy, dead ends, and the reference contract

Brief: ~/Downloads/wada-ring-v1.2-prompt.md (2026-09-08). Sections are
worked in order; each gate commits and stops for review.

| gate | sections | state |
| --- | --- | --- |
| A | 2 to 5: persistent labels, one affordance grammar, Betta as the centre of gravity, the respaced map | built 2026-09-08, report in gate-a.md, waiting on review |
| B | 1 and 6: cars off the GitHub data, the orphan ramp finished or cut | not started |
| C | per-part reference gates | not started |
| D | the Board audit (Part 7) | not started; assets/board/ does not exist in the repo |

## Tools added
- tools/circuit/gate.mjs: Playwright over the installed Chrome (channel
  chrome, no download). Wide captures at 1600 and 1440, one close shot per
  stop, and the overlap audit (label chips against each other, chips
  against the other stops' screen silhouettes, plan footprints, screen
  silhouettes). Playwright resolves from $PLAYWRIGHT, ./node_modules, then
  the betta-live-site install next door.
- tools/circuit/labeltest.mjs: the label contract per stop (title at rest,
  hover adds lift and glow only, cursor, click opens the right panel,
  Escape closes, no hover-only titles in the world layer).
