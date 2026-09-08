# V1.1, Part 4: the race

## The cars and the rule
Three translucent cars in district colours, one repo each, chosen by the
rule Abba set on 2026-09-07: print the trailing 30-day commit counts for
all six repos, take the three most active provided one is a Betta repo
(BettaType, where the firmware work happens), gold for the Betta repo,
neon for Portfolio, green for the third pick, display names only on the
tower. Counts that day: Portfolio 6, every other repo 0. Ties broke on the
most recent push. Result: gold BettaType as "Betta firmware", neon
Portfolio, green choreographer as "Choreographer". Cars carry 10, 23 and 4
as livery numbers.

## Standings are real
tools/circuit/standings.py runs at build time through the signed-in
GitHub CLI, counts commits since 30 days ago per repo (private repos
included), and writes circuit/standings.json with the order. If the fetch
fails it exits non-zero and leaves the committed file alone, so the last
committed standings ship. The page reads that file as a static asset;
nothing talks to GitHub from the browser. Repo slugs stay in the file; the
tower prints names only.

## The race follows the data
- A repo with commits laps. A repo with none parks its car in a pit box in
  front of the garage with the tower reading GARAGE. Today one car laps and
  two are parked.
- Order is the standings order. Gaps grow with the commit difference (8
  units plus 2 per commit, capped at 40). Three lanes 2.4 units apart keep
  the cars side by side and never touching.
- Overtakes are scripted from the standings: P2's offset swings by 1.3
  times its gap over the lap, so it takes a look at the lead through the
  back straight and hands it back before the line; P3 closes to 0.6 of its
  gap and never passes. The true leader crosses the line first every lap.
- No invented lap times. The only numbers anywhere are commits and the
  commit gap.

## The timing tower
Three rows above the mini-map on the broadcast face: position, code, name,
then the number: the leader's commits, +gap for the cars behind, GARAGE for
a parked one. Header: 30 DAYS, COMMITS. Rows move only when the standings
changed since this browser last saw them (localStorage keeps the last
generated stamp and order), which is a deploy, never a frame; the move is a
700 ms FLIP, none under reduced motion.

## Gate (tools/circuit/racetest.py, real Chrome over CDP, cache off)
- cars match standings.json; only active repos lap; idle cars sit in the
  pit lane; tower rows read P1 POR Portfolio 6, P2 BET Betta firmware
  GARAGE, P3 CHO Choreographer GARAGE; no slugs anywhere on the tower.
- unchanged standings on a reload: no animation. A changed generation and
  order in storage: rows animate into the new order and finish in the
  standings order.
- synthetic field with all three active (9, 4, 1 commits): three cars lap,
  the leader is first at the line, two scripted lead changes per lap,
  closest approach 2.4 units (cars are 1.8 wide).
- 60 fps desktop and phone proxy, 108 draw calls, 17,142 triangles.
Report: part-4-report.json. Screenshots: part-4/before-1-pits,
after-1-pits, before-2-default, after-2-default, sidebyside-*.png,
part-4-tower.png, part-4.png.

## Ambient count
Up to three lapping cars, the flag, the sleeve shimmer, the board flicker:
six of eight at most; today three (one car, flag, shimmer) plus the
flicker, four. Two in reserve.

## Deploy note
Run tools/circuit/standings.py before each publish (it needs gh signed
in), commit circuit/standings.json with the rest. index.html now carries
?v=11.4 on every asset URL; bump it when modules change.
