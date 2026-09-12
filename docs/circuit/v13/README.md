# V1.3, three sessions

Brief: ~/Downloads/wada-ring-v1.3-prompts.md (2026-09-08). Three separate
sessions, each committing at its gate and stopping for review. References
on disk in docs/circuit/refs/v13/ (gitignored, like every refs folder):
ref-silicon-valley-marks.jpg and ref-valkyrie-car-language.png; no
ref-target-benchmark.png was supplied.

Locked across all three: the Wada Ring name, the Betta court as built,
the mascot as designed, persistent titles, the affordance grammar, Betta
as the centre of gravity.

| session | what | state |
| --- | --- | --- |
| 1 | demolition and canvas: the Board gone, no photographs in the world, the circuit spread to fill the plate | built 2026-09-08, approved |
| 2 | landmark identity, the Silicon Valley pass: one giant dimensional mark per stop, distinct silhouettes, seven signature colours | built 2026-09-08, report in session-2.md, waiting on review |
| 3 | the race: cars in the Valkyrie language, a live simulated race with live timing, a chase camera for Start lap | built 2026-09-10, report in session-3.md, waiting on review |
| fix round 1 | three visual fixes on Gate 2 (the Education and Projects tags off their titles, the tower's needle out of ABOUT) plus the audit of v1.3 and the v1.1 reference contract | built 2026-09-09, report in fixes-1.md, audit in audit-2026-09-09.md; follow-ups 2026-09-10: Rep along the deck, then the ABOUT sign slid left so the deck sits under the T (fixes-1.md); waiting on review |

Round 4 (2026-09-10) is in docs/circuit/v14/round-4.md: the live order
from the visitor's own tour (circuit/pulse.js), seven cars, the candy
tech bench, the blimp over the leader, and the AWUS boards replaced.
This is the active system.

Round 5 (2026-09-12, docs/circuit/v14/round-5.md) replaced round 4's
race with one driven by yesterday's real Wikipedia pageviews: nine
cars, one per data/race-standings.json entry, a daily GitHub Action,
strict order by view count, Grid rows linking out to Wikipedia. Abba
reviewed it and asked to go back: the shelf-project cars were better,
and sending a Grid click off the site to Wikipedia worked against the
actual goal, getting people to explore the portfolio itself. Reverted
whole (commit 807358d, `git revert 9370127`) back to round 4's exact
state; re-verified after the revert (the race contract, a live click
through the Grid, and the attention mechanism all confirmed working).
The Wikipedia pipeline is gone from the working tree but intact in git
history at 9370127 if it is ever wanted again.

## Tools added
- circuit/vendor/chakra-petch-bold.typeface.json: the OFL face as glyph
  outlines for the extruded marks, made by a scratch converter over
  opentype.js from Google's TTF; the licence sits beside it.
- The gate audit names the colliding pieces (detail in the report) when
  silhouettes or chips overlap.
- The gate audit also measures each chip's clearance from its own stop's
  mark (markClear, px) and lists any chip touching its mark
  (labelOverMark). shots.mjs takes --size WxH and a bare name: for the
  rest view, for phone captures.
- tools/circuit/racetest.mjs is the Session 3 race contract (touches, lines,
  idling, the interval between changes of order) and tools/circuit/lap.mjs
  records Start lap as video, frames and the Grid mid-race.
- tools/circuit/trees.js seeds the trees from the layout (a jittered
  grid kept clear of the track, the pit lane and every footprint) and
  writes them into circuit/layout.js. Run it after any move.
