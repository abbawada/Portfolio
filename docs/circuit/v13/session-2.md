# Session 2: landmark identity, the Silicon Valley pass (Gate 2)

Captures in session-2/: s2-wide-1600.png and s2-wide-1440.png at the
default view, s2-01-about.png to s2-07-contact.png close on each stop.
Reports: s2-report.json (overlap audit, both widths, with the colliding
pieces named when any collide), s2-labels.json (label contract).

The test, per the brief: a stranger names every section from the wide
shot alone, and the set looks like one designer made it.

## 1. One giant dimensional mark per stop
Chakra Petch Bold, the site's own broadcast face, converted from the OFL
TTF to a subset typeface JSON (circuit/vendor/chakra-petch-bold.typeface
.json, licence beside it) and extruded in the world with a port of
three's glyph parser on the core's ShapePath. Every mark stands on the
same graphite mount, letters 1.5 deep, front face to the camera, on or
above its building: ABOUT on the tower deck, BETTA on the pylon head,
EDUCATION on the front wing, ECONOMICS on the hall's central block,
WRITING on the newsroom roof, PROJECTS on the garage ridge, CONTACT on
the pit wall. Cap heights 4.4 to 7 units (22 to 35 px at the default
zoom), widths 28 to 42 units. Letters and mount are one mesh per stop
with vertex colours, so a stop still lifts as one on hover. The v1.2
chips shrink to number and name at 11 px; the mark is the title.

## 2. Distinct silhouettes
| stop | massing |
| --- | --- |
| media tower | a lattice broadcast mast: four legs to a deck at 48, ring beams, X braces, a dish and a small dish on the platform at 26, a needle with a beacon to 62.6, the signage stack at its foot |
| the Exchange | a colonnaded trading hall 30 by 18, nine columns and an entablature, a parapet carrying the ticker band, a stepped central block to 14, the tape and rollers seen through the shell, the vault door on the side wall |
| campus corner | a quad: an arcaded front wing with a band of windows, a side wing, a gabled hall with a cardinal roof, a gateway, a flagpole, books and the mortarboard on the lawn |
| the press room | a three-storey newsroom block with a glazed band round the top floor, a water tank on the roof, three paper rolls on a rack at the dock |
| the pit garage | a 60 by 12 shed with four bays and half-rolled doors, a sawtooth roof with glazed faces, a light bar inside, a gantry crane with its hook at the end, tyres and the tool chest under it |
| the pit wall | 113 units of wall with a rail along the top, five perches with umbrellas and screens, the email board and the temperature board, the helmet and headset |
| the court | as built, untouched |
No two share a massing. The court stays the tallest and largest thing on
the plate (pylon plus mark to 63.6; the tower's beacon stops at 62.6).

## 3. Colour discipline
The buildings went muted: white or cool grey candy, graphite for
structure. Seven signature colours, no repeats, each on its mark and its
accents only:
| stop | colour | accents |
| --- | --- | --- |
| Betta | gold #f2b632 | the court as built |
| About | cyan #22c6e0 | the tower's rings, the beacon, the signage stack's lit dots |
| Education | cardinal #c8102e | the gable roof, the window bands, the gate lintel, the flag, the books, the curbs at Campus Corner |
| Economics | green #1fb46a | the ticker text, the frieze, the tape, the vault door |
| Writing | magenta #ff3d8a | the glazed band, the tube inside |
| Projects | orange #ff6a1f | the bay doors, the sawtooth glazing, the light bar, the scope, the rims, the chest, the hook |
| Contact | blue #2f5bff | the rail, the umbrellas, the screens, the temperature board, the helmet fin |
Gold left every place it had leaked to: the campus curbs, the coins, the
rims, the tool chest, the helmet fin, the signage stack. The mascot and
the sleeve monument keep their gold; both are Betta's.

## Measured
Overlap audit at 1600 and 1440, marks included in every silhouette: zero
in every category. Label test seven of seven. 173 draw calls (the seven
mark meshes cost 14 over Session 1's 156), 60 fps when the Mac's display
is not capping at 30. Poster and flat map regenerated.

## Moves made to keep the marks clear
The tower moved 14 units left with its stack on its right, so ABOUT
clears the Exchange roof on screen; the press block sits one unit left
so WRITING clears the court's floodlight; the campanile became a gabled
hall because a 30-unit tower there rose into the court's front corner;
the pit wall grew to 113 units so CONTACT sits at its start, clear of
the garage bays, and the sleeve monument slid three units along the
garage to clear the mount.

## Flags
- BETTA is the one mark added to a locked element: it stands on a mount
  above the pylon head, the court itself untouched. Say if you would
  rather the pylon's dot-matrix BETTA stand alone.
- The chips shrank to number and name; the section names still appear
  in the panel kicker and the hop buttons.
- Rep on the tower now stands on the deck beside the mark rather than
  on the old head; the statue and the pit-wall Rep are where they were.
