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

## Flags
- Rep on the tower deck stands in front of the lower-left of the ABOUT
  letters (the B) at close range; visible in f1-about-1440.png. The
  mascot is locked and was not moved; say if the statue should step
  along the deck.
- The Writing chip moved without being asked, because the measure that
  found the two listed overlaps found the same one there.
- The camera's target for Education and Writing follows the anchor, so
  an opened Education panel now centres a little lower and to the right
  than before (the building sits up-left of the visible centre).
