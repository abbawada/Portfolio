# V1.1, Part 1: material and colour pass

References read: all twelve in docs/circuit/refs/v11/. The material direction
is the translucent iMac and mouse: a transmissive shell, a soft internal
tint, internals visible where an object is a hero. Where a reference carries
someone else's mark, only the energy is taken.

## What changed
- Materials. Buildings, the pit wall, the grandstand, the haulers, the
  billboards, the car park, the trees, the car body and the blimp are now
  candy translucent plastic: MeshPhysicalMaterial with transmission 0.9,
  roughness 0.2, ior 1.45, flat shading, an attenuation colour per district
  so thickness deepens the tint, and a small procedural studio environment
  for the highlights. The renderer tone-maps the candy (Neutral) while the
  matte ground, track, court, shadows and every text plane opt out, so the
  approved palette on the ground is byte-identical to V1.
- Ground and track stay matte, baked flat shading as before. The court is
  untouched.
- One hero colour family per district: pit garage Betta gold; the Exchange
  green; campus corner cardinal; media district (the tower, the press room)
  a cool shell with multi-neon internals; pit lane cool grey; the neutral
  set (grandstand, haulers, billboards, car park) the same cool grey; trees
  sage candy; the blimp white candy.
- Guts. The Exchange holds a ticker mechanism: two rollers, a tape in green
  neon, a gear. The tower holds its broadcast internals: a graphite core,
  six neon rings (cyan, magenta, gold, lime) up the mast, a cyan
  transmitter in the head. The garage shows two electronics benches, the
  workbench and a gold light bar along the back wall through its gold
  shell. The press room has one magenta tube. The blimp shows its gas-cell
  frame. The car shows its cockpit and wheels through a gold shell.
- Ambient list, per the renegotiated budget: the car and the flag move. The
  Exchange ticker, the blimp and the garage scope now hold still. Sleeve
  shimmer (Part 2) and one board flicker (Part 3) come with their parts;
  two slots stay in reserve. Count of continuously moving things: 2 of 8.

## Measured (tools/circuit/perf.py, real Chrome over CDP, cache off)
| run | fps | draw calls | triangles |
| --- | --- | --- | --- |
| desktop 1600x900 | 60 | 96 | 14,474 |
| phone proxy 390x844, DPR 3, 4x CPU throttle | 60 | 96 | 14,474 |

Draw calls and triangles roughly double because transmission renders the
opaque scene once more into the texture the shells refract; both stay well
inside the budget (150 calls). The phone proxy runs the transmission
texture at half resolution (transmissionResolutionScale 0.5 above DPR 1.5),
which is the "reduce transmission samples" lever if a real phone dips.

## Known limit of the technique
A translucent shell shows what is opaque behind it: the ground, the shadows,
the internals. It does not show another translucent shell behind it (the
tower behind the garage, a tree behind a wall). Internals are opaque for
exactly that reason.

## Screenshots
before-N and after-N for the three angles (default, the pits, the Exchange),
composed as sidebyside-N.png and one sheet, sidebyside-sheet.png. part-1.png
is the default view after.

## Files (commit for Part 1)
circuit/world.js, tools/circuit/{shot,perf,poster,navtest,phase4test,
phase5test,paritytest}.py (cache disabled for every capture),
tools/circuit/sidebyside.py, docs/circuit/refs/v11/ (twelve references),
docs/circuit/v11/ (this report, the captures, the side-by-sides).
