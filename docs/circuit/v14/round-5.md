# Round 5: yesterday's Wikipedia race, wired in

Round 4 built the loader (circuit/wikirace.js) and asked three questions
before touching any rendering. This round is the wiring, on Abba's
answers: replace the shelf-project race entirely, keep all 9 cars
(measured cost, not assumed), strict deterministic order, manual
blocklist only.

Captures in round-5/: r5-wide-1600.png and r5-wide-1440.png, r5-01 to
r5-07 close on each stop, r5-grid-close.png (the new Grid panel),
r5-chase.png (Start lap mid-ride), r5-phone.png, r5-lap.mp4 and
r5-lap-frames/ (a captured lap), r5-lap.json, r5-grid.png and
r5-race-wide.png (the lap tool's own captures). Reports: r5-report.json
(the overlap audit).

## 1. What changed

The seven shelf-project cars, their personality-and-passing simulation,
and the round-4 visitor-attention layer are gone. In their place: nine
cars, one per entry in data/race-standings.json (eight of yesterday's
most-viewed English Wikipedia articles plus Abba's fixed topic), built
once the page's single fetch resolves, in the rank order the data
already decided. The order is fixed for the whole visit: the gap between
every adjacent pair measured constant at exactly 7.2 units across a 240
second run, and the field's start and finish order were identical,
because nothing here simulates a fight for a position real data already
settled. The field still moves, with a small shared pace wobble and the
existing racing-line sway, so the animation reads as alive rather than
parked; both apply equally to every car, so they never touch order or
spacing.

The car model, the track, and the racing-line and shadow code are
untouched from Session 3, matching "this is only a data-source swap."

## 2. The Grid panel

Nine rows, ranked by view count. The number column is the real count,
compact ("239K", "3.8K", "310"), not a computed gap, since there is no
gap to compute anymore. Each row is a link, not a button: it opens that
Wikipedia article in a new tab. This is deliberate and is the one place
the page sends a visitor elsewhere, because these rows are not portfolio
sections, they are what the world actually read yesterday. The caption
underneath states plainly what it is showing and is honest about which
of three states it is in:
| status | caption |
| --- | --- |
| fresh | "Yesterday's race: what the world searched for, Sep 10, 2026." |
| cached | "This browser's last known race, [date]. Today's update has not landed yet." |
| bootstrap | "Loading yesterday's race." |

Colour: eight ranks each carry one of eight candy hues (a car's identity
is ephemeral, it changes daily, so colour is assigned by rank rather than
by topic); the fixed topic keeps Betta's own gold, since it is the one
entry that is always, in some sense, this site's own, whatever it
finishes as. Codes are the first three letters of the title, since these
are not curated project codes ("Barry_Melrose" to BAR, "Haptic_technology"
to HAP).

## 3. The chase camera

Start lap now simply follows the leader; there is nothing to cut to,
since two cars are never close enough to call a fight when their gap is
permanently fixed at 7.2 units. Measured: a captured lap ran 68.8 s and
the leader (car0, the day's rank 1) never changed, confirmed by the tool
itself rather than assumed.

## 4. What broke during wiring, and what it caught

Real bugs, not stated as clean the first time:
- The first car object built by setField() had no reference to its own
  three.js group, so the very first placeCars() call threw
  "Cannot read properties of undefined (reading 'position')" and the
  page never got past its first frame. Fixed by storing group: g.
- endLap() still referenced a chase object removed along with the
  battle-detection logic; clicking Leave the lap threw mid-function,
  which is also why the button was stuck reading "Leave the lap"
  afterward, since the throw happened before the line that resets it.
  Both are one fix: the button correctly reads "Start lap" again once
  the dangling reference was removed.
- tools/circuit/map.js's flat-map car icon read L.GRID[0].number, which
  no longer exists; it now reads a literal 1, since the flat map is
  static plan data with no live race to read a real leader from.
- tools/circuit/racetest.mjs's old contract required at least 3 changes
  of order over 240 s; under the new model that is now the wrong
  assertion; it has been rewritten to require exactly zero, and to
  assert the gap between every pair is constant, since either changing
  would mean something was quietly simulating a race again.
- tools/circuit/lap.mjs read fields removed with the old race (seed,
  gap, pass) and would have thrown; rewritten to read leaderId() and
  confirm it does not change mid-lap.
All of the above were caught by actually running the page and the
tools, not by inspection.

## Measured
Overlap audit at 1600 and 1440: zero in every category. Label test seven
of seven. Race contract: zero touches, gap constant at 7.2 across the
whole run, order identical at start and finish, views strictly
descending. 210 draw calls (up 16 from Session 3's shipped 194, matching
the estimate given before building: ~8 per car times 2 more cars), 60fps
at 1440, 58.8 at 1600. Bootstrap and cached fallback paths both verified
directly: blocking the standings fetch entirely still renders 9 cars
with a "Loading yesterday's race" caption and no thrown error; a
genuinely missing file after one good load falls back to the cached
data, unchanged. Reduced motion verified: Start lap still cuts between
stops without error.

## Flags
- Real trending news can and does include violent or tragic events, as
  the actual pull for Sep 10 showed (an assassination and a killing were
  both in the real top 8). The blocklist is manual, as asked; nothing
  else screens for this.
- The phone Grid, already crowded at 7 rows since Gate A, is worse at 9:
  r5-phone.png shows the block overlapping the stop labels and the
  mini-map. Phones remain untuned, as flagged in every report since Gate
  A; this makes the gap wider, not new.
- circuit/pulse.js, its wiring in world.js and nav.js, and the case-open
  reporting hooks added to cases.js and stops.js for it are all removed,
  as the direct consequence of replacing the race entirely: nothing was
  left for them to feed.
- The blimp's behaviour changed with the order: since the leader never
  changes, it settles into a fixed escort ahead of car0 rather than
  continuing to drift between leaders, because there are no lead changes
  left to drift between. This was not asked for or against; flagging it
  as a real consequence of "strict, deterministic," not a bug.
- The Action (.github/workflows/race-standings.yml) has not run in
  production; it only takes effect once merged to the branch GitHub
  Pages watches, and its schedule trigger only reads from that branch's
  default. It has not been exercised as a live cron, only run by hand
  against the real API in this and the prior round.
