# Session 3: the race (Gate 3)

Captures in session-3/: s3-lap.mp4 (Start lap on the live race, one full
lap of the leader, seed 4, 960 wide), s3-lap-sheet.jpg (twelve frames
from that lap, one every six seconds), s3-lap-frames/ (a frame every two
seconds), s3-grid.png (the Grid mid-race, live gaps), s3-race-wide.png
(the default view mid-race), s3-wide-1600.png and s3-wide-1440.png plus
s3-01 to s3-07 from the gate. Reports: s3-lap.json (the seed, the order
changes seen during the lap, the camera's subject log), s3-report.json
(the overlap audit), s3-labels.json (the label contract). Repeat any run
with ?seed=4 on the URL.

What to check, per the brief: the cars in the Valkyrie language, a live
race with overtakes about every fifteen to twenty seconds, the Grid as
live timing with gaps that tick, Start lap that never loses its subject
and has an obvious exit.

## 1. The cars
Rebuilt from ref-valkyrie-car-language.png: low and wide, a glossy
near-black body (a clearcoat physical material lit by the studio
environment), rear haunches and front fenders, a canopy, the spine
behind it, a splitter and a rear wing, gloss-black wheels. 5.8 long and
2.6 wide, from 3.8 by 1.8: 29 by 13 px at the default zoom, about 60 px
long at chase distance. One neon accent per car in its project's
signature colour from Session 2, on the flank lines, the wing's lit edge
and the nose tip:
| car | project lives in | accent |
| --- | --- | --- |
| BET 10 | Betta | gold #f2b632 |
| YLD 4 | Economics, the Exchange | green #1fb46a |
| POS 23 | Projects, the garage | orange #ff6a1f |
| BLU 12 | Projects, the garage | orange #ff6a1f |
Four meshes per car (body, accent, shadow, plate): 177 draw calls, four
over Session 2. The number plate stays on the nose.

On the racing line at all times: the cars spawn on the line behind the
start, in a fresh order each visit; a car holds station behind any car
it would run into; the line swings 1.0 either side of the centre and a
pass goes 2.1 outside it, so a car's edge reaches 4.4 on a track 9 wide
whose white line is at 4.5. Nothing idles: the slowest speed seen in
four simulated minutes was 4.7 units a second, in a corner.

## 2. The live race
A simulation, seeded fresh each visit (?seed=N repeats one). Each car
draws a personality: base pace 0.99 to 1.01, corner grip 0.36 to 0.48
(how much a corner costs), top speed up to 1.5 percent, and two slow
form curves (periods 18 to 40 s and 31 to 56 s) that let the field's
order of pace cross over. A tow of up to six percent within sixteen
units of the car ahead, a band of up to twelve percent for a car more
than seven units back, and a three percent drag on a leader more than
eight clear keep the field close enough to fight. A pass is a real move:
it starts on a straight with a pace edge of 0.1 units a second and a gap
between one car length plus 0.4 and plus 0.9, at least four seconds
after the last; the car pulls out at the other's pace, commits sixteen
percent once clear across the track (2.85 units, two cars 2.6 wide with
a margin), pulls back in a length and 1.2 ahead; the passed car lifts
five percent once the other is clear; a move that has not gone through
in eighteen seconds drops back behind before tucking in, still offset.

One source of truth: the running order is the cars sorted by distance
along the track, the gap is that distance divided by the leader's speed,
and the Grid reads both every frame. The contract in
tools/circuit/racetest.mjs steps the maths for 240 s at 60 Hz:
| seed | touches | max lateral | min speed | order changes | mean interval s | longest wait s | passes | aborts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 3.1 | 4.82 | 12 | 20.7 | 39.5 | 10 | 1 |
| 2 | 0 | 3.1 | 4.75 | 14 | 17.5 | 34.8 | 13 | 0 |
| 3 | 0 | 3.1 | 5.22 | 13 | 18.9 | 45.2 | 13 | 0 |
| 4 | 0 | 3.1 | 4.89 | 14 | 16.8 | 24.0 | 14 | 0 |
| 5 | 0 | 3.1 | 5.21 | 12 | 19.6 | 30.0 | 10 | 1 |
| 6 | 0 | 3.1 | 4.88 | 11 | 21.8 | 44.3 | 9 | 1 |
A touch is two cars within a length along the track and within a width
across it at the same frame. The mean interval between changes of order
sits inside the brief's fifteen to twenty seconds on every seed but the
two at 20.7 and 21.8; the longest wait for one is 45 s.

The Grid is live timing: the rows reorder as the cars pass on track and
slide into place, the last column ticks with the gap to the leader at
ten updates a second (Lead, then +0.41 and so on), the head carries the
leader's lap, and a pair in a fight shows its positions in the car's
colour. The row stripe is the car's accent. Nothing on the page claims
real data: the block's aria label says a simulated race; the comments in
layout.js, index.html and world.js say the same.

## 3. Start lap
A chase camera. Its subject is the race leader, or the closest battle
when two cars are within eight units of each other; a subject holds for
at least 3.5 s so the camera does not flicker, and a battle is kept
until the pair is twelve apart. The aim rides seven units ahead of the
leader's nose at zoom 2.1, or four ahead of a battle's midpoint at zoom
2.56, with exponential easing at 5.5 a second and a quicker 9 a second
for the first 0.9 s after a cut, so a cut reads as a move rather than a
jump. The lap ends when the leader has covered one lap, then the camera
flies home; the race carries on underneath.

Exits, all at any time: a pill at the bottom centre, "Back to the map"
with Esc on it, shown only while the camera rides; the lap button, now
"Leave the lap"; Escape; clicking any label or Grid row (which also opens
that stop); the mini-map; a drag on the world. Under reduced motion the
lap still cuts between the stops.

The capture: seed 4, warm 30 s, a 72.5 s lap with five changes of order
seen during it, at 1.5, 14.5, 35.3, 47.8 and 63.9 s (s3-lap.json).

## Measured
Overlap audit at 1600 and 1440: zero in every category, marks included.
Label test seven of seven. 177 draw calls, 48,815 triangles, 58 to 60 fps
in the harness. Poster regenerated; the flat map is unchanged.

## Flags
- Two cars share orange. The brief maps each car's accent to its
  project's Session 2 colour, and Posture Cue and Bluetooth Car both live
  in Projects. They differ by number and code. Say if Bluetooth Car
  should take another colour; Contact's blue would put Contact's colour
  on a Projects car, against the Session 2 discipline.
- The cars are not scaled past 2.6 wide: two of them side by side on a
  pass already fill the track, 2.6 plus 2.6 plus the 2.85 clearance
  across a 9-wide road. At the default zoom they read as dark cars by
  their gloss, shadow, plate and accent; at chase zoom they hold the
  frame. Say if you want a wider track instead.
- s3-lap.mp4 is 3.7 MB in the tree, the one video in the repo.
- The seed on the URL is a testing hook, not a feature.
- Phones untuned, as before; the exit pill is 44 px tall and centred so
  it works there too, untested.
