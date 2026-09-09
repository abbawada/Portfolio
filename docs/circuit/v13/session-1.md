# Session 1: demolition and canvas (Gate 1)

Captures in session-1/: s1-wide-1600.png and s1-wide-1440.png at the
default view, s1-01-about.png to s1-07-contact.png, s1-plan.png (the flat
map from the same layout). Reports: s1-report.json (overlap audit, both
widths), s1-labels.json (label contract), s1-race.json.

What to check, per the brief: Board gone, zero photographic textures,
track fills the frame, court and mascot untouched.

## 1. The Board is dead
Stop 08 is gone: the location, its label, its hit box, the panel
template, the styles, the hop route, the mini-map entry. The blimp stays
in the sky as decoration with its BETTA banner on both sides, no label,
not clickable, drifting over the top-right corner.

## 2. No photographs in the world
Every photographic texture is out: the hoarding images, the grandstand
roof boards, the posters on the Exchange and the garage, the blimp
screen, the atlas that carried them, the Board's card collage. Deleted
from the tree: circuit/board.js, images/board/ (twenty files), the
pipeline tools/circuit/board.py. The originals stay on disk in
docs/circuit/refs/board/ and refs/v11/ as style targets only. What
remains on geometry is type (the barriers, the T1 paint, the plate name,
the pit-wall board, the ticker, the number plates, the three type
hoardings) and emissive signage (the dot-matrix stack, the WADA RING
face, the pylon head).

## 3. The circuit fills the plate
| measure | v1.2 | now |
| --- | --- | --- |
| loop extent, u | 20 to 189 | 10 to 199 |
| loop extent, v | 40 to 178 | 32 to 191 |
| lap length | 522 | 636 |
| pit straight | 124 | 140 |
| default zoom | 1.0 | 1.1 |
Longer straights, wider T1 and hairpin, every district now inside the
loop with grass between neighbours: the Exchange inside the hairpin, the
press room on the lawn between the tower and the court, the campus
inside the esses with the car park below it, the tower and its stack on
the left with 23 units to the garage roof, the pit complex along the
straight. The court is the same object at the same coordinates; Rep is
untouched. Every stop's internals, details and signs are now placed
relative to its layout box, so a stop moves as one edit. Trees are seeded
by tools/circuit/trees.js.

## Measured
Overlap audit at 1600 and 1440: zero label overlaps, zero labels over
another stop, zero over a hoarding, zero footprint overlaps, zero screen
silhouette overlaps. Label test: seven of seven pass, no hover-only
titles. Race test over 240 simulated seconds on the longer lap: closest
cars 2.69 apart, widest lateral 3.29, 15 order changes. 156 draw calls
(160 before the atlas and the blimp screens went), 60 fps in the
harness. Poster and flat map regenerated.

## Flags
- The tower's label hangs left of its dot (labelSide 'left') and the
  press room's below (labelSide 'below'); both keep the chips off the
  Exchange and the court's floodlight. Session 2 shrinks these chips to
  secondary wayfinding anyway.
- The v1.3 refs folder is gitignored like the others, so "committed at
  refs/v13" means on disk in the checkout, not in git history.
- Phones untuned, as before.
