# Fix round 1 on Gate 2: the tags off the titles, the pole off ABOUT

Three visual fixes asked for on 2026-09-09 after Gate 2, built on top of
f41ae4a. Captures in fixes-1/: f1-wide-1600.png and f1-wide-1440.png at
the default view, f1-01 to f1-07 close on each stop (the gate's own
framing), f1-about-1440, f1-education-1440, f1-projects-1440 and
f1-writing-1440 framed on the affected sections at 1440 x 900, the same
four at 390 x 844 (zoom 3.2, the phone's open-stop zoom) plus
f1-rest-390.png at the phone's rest view. Reports: f1-report.json (the
overlap audit, now with each chip's clearance from its own mark) and
f1-labels.json (the label contract). Rendered headless in Chrome through
Playwright; nothing here is asserted by eye alone.

## What was wrong
The chip and the mark are two objects already (a DOM button over the
canvas, and an extruded mesh in the world); they read as one because the
chip's anchor sat inside the mark's screen silhouette. Measured at the
default view, 1440 x 900, before the fix:
| stop | chip to its own mark | note |
| --- | --- | --- |
| Education | overlap | chip hung left of a dot 10 px above the letters |
| Projects | overlap | dot on the S, chip under it |
| Writing | overlap | same defect, not on the list; fixed with the others |
| About | 22 px | clear; the tower's needle stood in front of the letters instead |
The needle (the layout box under the beacon) rose from the deck's front
corner at (53, 123), 3 units in front of the mark's plane and dead on
its centre line, so it crossed between the B and the O.

## The fixes
1. Education: the pin moves to the campus's front-right corner on the
   ground (anchor 180, 152, labelZ 1) with the chip hanging below the
   dot, over the car park. 54 px clear of EDUCATION at 1440.
2. Projects: the pin moves along the ridge to the roof's right end
   (anchor 128, 168, labelZ 9), chip below. 28 px clear of PROJECTS.
3. About: the needle leaves the deck. It now stands on a short
   outrigger arm off the mount's right end (layout box at 65.5, 119.5,
   1 by 1, 12 tall from 49.2; the arm and the beacon in world.js), in
   the mark's own plane, 2.4 units past the T. Nothing crosses the
   letters. The title is not shrunk.
4. Writing (same defect, found by the new measure): the pin moves to the
   dock at the block's front (anchor 78, 109, labelZ 1), chip below.
   35 px clear of WRITING.
5. Every chip gets a soft drop shadow at rest (circuit.css,
   .ring-pin-text), so a tag reads as a card floating over the world
   rather than paint on it. The pin layer already sits above the canvas
   (z-index 2); the shadow makes that separation visible.

The placements were chosen by a search over anchor and height that
scores each candidate by its smallest clearance from its own mark, from
every other stop's silhouette, from the hoardings and from the other
chips (scratch tool, not committed). Two earlier candidates that only
raised the chips failed that audit: Education at labelZ 26 landed on the
court's front stand, and Writing to the right of its dot ran into the
court's floodlight and the Exchange.

## Measured, after
| stop | chip to mark, 1440 x 900 | chip to mark, 390 x 844 (rest) |
| --- | --- | --- |
| About | 22 px | 1 px |
| Betta | 97 px | 28 px |
| Education | 54 px | 25 px |
| Economics | 24 px | 6 px |
| Writing | 35 px | 19 px |
| Projects | 28 px | 16 px |
| Contact | 199 px | 116 px |
Overlap audit at 1600 and 1440: zero in every category (chips against
each other, chips over another stop, over a hoarding, over their own
mark, plan footprints, screen silhouettes). Label test seven of seven.
173 draw calls, unchanged. Poster and flat map regenerated.

## Phone, stated plainly
At 390 x 844 the world sits at 1.78 px per unit while the chips stay
21 px tall, so at the phone's rest view the seven chips crowd the map:
03 Education and 07 Contact overlap each other and the Grid block covers
part of the Education chip (f1-rest-390.png). The three fixed stops are
clear of their marks there (16 to 25 px); About and Economics are not
(1 and 6 px). At the phone's open-stop zoom (3.2) every fixed section
reads cleanly (f1-*-390.png). The phone pass is not in v1.2 or v1.3 and
was flagged untuned in every report since Gate A; it needs its own chip
mode, not another anchor move.

## Follow-up, same day: Rep off the B
Asked for after the report above. Rep's tower copy moves along the deck
from its front-left corner (47, 123) to its front-right corner
(53.2, 122.3), the far end of the ledge in front of the mark's mount.
The A and the B now read clean: the ball clears the B's lower-right
corner by 0.6 units, about 3 px at the default view and 11 px at the
zoom-4 capture. Before and after in fixes-1/f1-about-rep-before-zoom4
.png and f1-about-rep-zoom4.png; the default-view capture
f1-about-1440.png is re-shot.

What it cannot do, measured rather than judged: no position on that deck
clears the whole word. The deck is 8 units square under a word 26 units
wide, and the ledge in front of the mount is 2.55 units deep, so the
mascot is always inside the letters' screen band. A search over the
whole deck on a 0.1 grid, at scales from 1.8 down to 1.0, returns no
position that clears every letter, and none at all that clears the B
with the feet strictly inside the deck's edges: the chosen spot leaves
the outermost leg 0.1 units past the corner, under a pixel at the
default view. Rep now stands in front of the O and grazes the U, where
before it covered the A, the B and the O.

Two ways to clear the word completely, neither of them a move along the
deck, both for your call:
- Step Rep down to the dish platform at z 27, one level below the mark.
  Every letter clears by roughly 100 px, but the lattice and the signage
  stack swallow the figure: it reads as trapped in the tower rather than
  standing on it. Rendered and rejected on that basis, not on the
  clearance.
- Slide the mark itself along its mount so the word's centre is not over
  the deck. That is Session 2 geometry and is waiting on your Gate 2
  review, so it was not touched.

## Follow-up, next day: the sign slides left, the deck under the T
Asked for after the Rep move. The ABOUT mark slides 13.5 units left
along its mount, from u 50 to u 36.5, so the T stands over the deck (the
T spans u 44.9 to 49.6, the deck 46 to 54) and the word cantilevers off
the tower's left side. The tower itself stays put: its pieces now take
their centre from the deck box instead of the mark (world.js, gate.mjs,
trees.js), so the sign is free to slide on its own. Rep steps from the
deck's front-right corner to its back-right corner (53.1, 116.9), past
the T. The beacon needle and its outrigger arm move to the mount's left
end: the deck's right side cannot hold the T's edge, the needle and the
mascot at once (a search over the mark offset, every deck spot for Rep
and every deck spot for the needle tops out under 5 px once the T is
over the deck). The About chip hangs right of its dot now, above the
deck, clear of the sign's new top-left.

Measured at the default view: Rep's nearest part, the arm, clears the T
by 9 px in the screen model; the A clears the needle by 12 px; the About
chip clears its mark by 34 px (22 before); zero overlaps in every audit
category at 1600 and 1440; label test seven of seven; 173 draw calls.
Captures: f1-about-slide-zoom4.png, f1-about-slide-close.png,
f1-about-slide-wide-1440.png; report f1-about-slide-report.json. Poster
and flat map regenerated.

The trade-off, for your call: the T fully over the deck (its left edge
at 46 needs the mark at u 37.6 or further right) leaves Rep under 2 px
from the T. At u 36.5 the T's left arm overhangs the deck's edge by 1.1
units, invisible at the default view, and Rep keeps its 9 px.

## Flags
- Rep clears every letter of ABOUT now that the sign has slid left (the
  follow-up below the Rep note). The mascot geometry and scale are as
  designed; only its spot and the sign moved.
- The Writing chip moved without being asked, because the measure that
  found the two listed overlaps found the same one there.
- The camera's target for Education and Writing follows the anchor, so
  an opened Education panel now centres a little lower and to the right
  than before (the building sits up-left of the visible centre).
