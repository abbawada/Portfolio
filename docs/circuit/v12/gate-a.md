# Gate A: layout and labels (sections 2 to 5)

Captures in gate-a/: gate-a-wide-1600.png and gate-a-wide-1440.png at the
default view, gate-a-01-about.png to gate-a-07-contact.png at zoom 2.2,
gate-a-report.json (the overlap audit, both widths) and gate-a-labels.json
(the label contract per stop). Live on the LAN at http://100.64.1.195:8646.

What to check, per the brief: every title readable in the wide shot, no
overlaps, the Betta court relocated, Betta reads as primary.

## Section 2: titles are persistent
- Every stop carries its chip at rest: a paper card with an ink border,
  the number in the accent, the name in Chakra Petch at 14 px bold and the
  section at 10 px. Billboarded DOM, fixed pixel size, so it reads the
  same on grass, apron and asphalt at any zoom. The audit measured 14px
  700 at both widths.
- Labels no longer fade in on approach and never depend on hover or the
  camera distance. Hover and focus add the lift, a gold glow on the chip
  and the pointer, nothing else; labeltest.mjs checks the chip text is
  identical before and after hover for all seven.
- The mini-map's hover tooltips (SVG title elements) are gone; each dot
  carries its number beside it at rest and an aria-label.
- In-world signage stays as flavour: WADA RING on the tower face, the
  barriers and the T1 run-off; BETTA on the new pylon head in the Part 3
  dot-matrix language. No name lives only in the world.

## Section 3: one affordance grammar
Label + beacon + cursor + lift, on the seven stops and nothing else. The
beacon is a ring that leaves the dot every 2.8 s, staggered 0.4 s per
stop, CSS only, off under reduced motion. Hit boxes now reach the label
height (labelZ + 3) so the mesh, the air above it and the chip are one
target; the chip is a button. Set dressing (barriers, billboards, blimp,
grandstand, trees) carries no label. Board D on the signage stack names
three projects; it belongs to the tower's group so it opens About, which
is the signage-as-flavour reading; flagging it in case you want the
stack split or that board moved to the garage.

## Section 4: Betta is the centre of gravity
The court now sits inside an arena on a lit apron in the upper infield.
| measure | Betta | next largest |
| --- | --- | --- |
| footprint (plan units) | 48 x 34 apron, 1632 | garage 60 x 15, 900 |
| height | pylon 50 + head 6 = 56 | tower 45, Rep on its head 50.4 |
Built: three stepped gold stands with a neon-gold rail, three floodlight
masts with lit heads turned to the court, the scoreboard pylon at the
back corner (gold shell round a neon core, BETTA in scaled dots on the
head), the apron in a paper-plate mix so it is the brightest ground on
the plate. Rep's statue stands at the apron's front-right corner. The
home view targets (112, 96) instead of the plate centre, so the arena
sits just above and right of the screen centre with the whole plate
still in frame. The mascot is untouched.

## Section 5: the respaced map
- The court moved from beside the tower (96 to 124, 104 to 120) to
  (96 to 144, 70 to 104): 11 units of grass to the track edge, 16 to the
  tower roof, 20 to the signage stack.
- The tower moved up the infield, from v 140 to v 120, with 23 units of
  grass to the garage roof; its internals, boards, details and Rep are
  now placed relative to its layout box.
- The three signage boards stack on one wall (18 wide instead of 66),
  hung on the tower's front-left, the Osaka density in a third of the
  width. Coil of cable moved to the tower's right.
- Label anchors: the garage label hangs below a dot over the roof
  centre; the pit-wall label sits at the wall's right end; the tower
  label rides above Rep's raised hand.
- Trees under the new zones moved; the vacated court lawn gets four.
- Audit at 1600 x 900 and 1440 x 900 (a 13-inch laptop): label overlaps
  0, label over another stop's silhouette 0, plan footprint overlaps 0,
  screen silhouette overlaps 0. Silhouettes are the layout boxes plus
  the world's known extras (stack, sleeve plinth, tyres, wall boards),
  projected box by box.
- Garage and pit wall are still neighbours across the pit lane (asphalt,
  not grass); that is the pit complex by design from V1. Flagging it
  against the clear-grass rule.

## Measured
149 draw calls (budget 150; 145 before), 36,264 triangles. The perf
harness reads 30 fps today for both this tree and the committed V1.1,
headed and headless, desktop and phone proxy, so the machine is capping
at 30 right now, not the geometry. Poster and flat map regenerated from
the new layout; the poster no longer bakes the broadcast block.

## Left for later gates, and flags
- Section 1 (cars, standings strings, the tower rows) and section 6 (the
  sleeve monument, the "curved dark ramp") are untouched: Gate B.
- assets/board/ does not exist in the repo. The twelve files in
  docs/circuit/refs/v11/ are all on disk but that folder is gitignored
  (third-party images never pushed). Gate D cannot start until the
  board folder exists; the images attached to the brief message may be
  it, say so and where they should land.
- Phones: chips are fixed pixel size, so at 390 wide the seven will
  crowd at the portrait default zoom. The brief's gate is the 13-inch
  laptop; the phone pass is not in this brief.
