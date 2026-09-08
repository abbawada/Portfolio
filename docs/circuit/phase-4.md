# Phase 4, the shelves

Each stop opens a panel: the section name, one line of context where the
site already had one, then the objects. The objects are the projects.html
cases, untouched.

## How the components were preserved
- The inline shelf script that projects.html shipped with is now cases.js,
  a shared engine with a mount() API. projects.html loads it and mounts
  exactly as before. tools/circuit/paritytest.py rendered the old inline
  page and the new one side by side in real Chrome and compared the shelf
  markup, the filter chips, the open spread, the arrow-key step, Escape,
  focus before and after, and a filtered render: every check identical
  (docs/circuit/phase-4-projects-spread.png is the spread from the new page).
- In the world, a stop mounts the same engine with layout 'grid': a
  two-column grid of the same .pcase elements (232 by 348, 176 under 720
  px) with the same chrome, tilt, gloss, keyboard and flip. The grid only
  skips the horizontal-shelf mechanics (drag, wheel, prev and next) that a
  grid has no use for. The flip stage is the same element and CSS, so the
  spread opens over the blurred world exactly as it opens over the page.
- Betta's spread mounts betta-capture.js as on projects.html: verified
  mounted and its video playing inside the world.

## What each stop opens
| stop | content | source |
| --- | --- | --- |
| 01 About | the three about lines, the halftone portrait (static image), the 22 skill chips | about.html, images/page_halftone.png |
| 02 Betta | "a haptic shooting sleeve", the Betta case, Wheelchair Basketball row with its video | index.html directory line, cases.js, projects.html plain list |
| 03 Education | the Education block, the Top 4 of 221 stat and the cheque figure | about.html, betta.html |
| 04 Economics | Plume Token Yield Vaults and Ethereum Validators cases, The Medici Network row | cases.js, projects.html plain list |
| 05 Writing | "essays on Medium", the three essays, VIEW ALL | index.html, writing.html |
| 06 Projects | "Posture Cue, robots, IoT", Posture Cue, Visual Mapping, Bluetooth Car, Home Temperature Monitor cases | index.html, cases.js |
| 07 Contact | the Contact block, a Copy email button, LinkedIn | about.html |

All copy verbatim. New words: the button labels Copy email and Copied, and
the panel kickers (the world feature: Media tower, The court, and so on).
Wheelchair Basketball and The Medici Network stay rows until their covers
exist (tools/cover-prompts.md, prompts 8 and 9); then they become cases.

## Gate (tools/circuit/phase4test.py, real Chrome over CDP)
- Every project reachable in two clicks from load: yes. Stop, then case
  (seven cases across three stops); the two coverless projects, the essays,
  the education block and the contact rows are one click.
- Existing card interactions intact: yes, by the parity test above, and in
  the world: the click flips the case (stage open, focus on the close
  button), ArrowRight steps Posture Cue to Visual Mapping, Escape closes
  the stage and leaves the panel open with focus back on the case, a second
  Escape closes the panel and empties it. No JS errors. 39 draw calls,
  59.3 fps with a panel open.
- Full JSON: docs/circuit/phase-4-report.json. Screenshots:
  phase-4-projects.png (the grid), phase-4-spread.png (Posture Cue open in
  the world), phase-4-betta-spread.png (the capture graphic running).

## Section 11 checklist, run after Phase 4
- Could this diorama belong to any developer? No. The court, the BETTA
  blimp and run-off paint, the cardinal and gold curbs, the number 10 car,
  the email on the pit wall, and now the panels: his cases, his essays, his
  degree, his photo.
- More than 5 continuously moving elements? No. The panels add nothing that
  loops on its own; the Betta capture graphic plays only while its spread
  is open, as it does on projects.html.
- Any mark, layout or livery referencing a real brand, team or venue? No
  new marks. The cover art is Abba's existing pipeline (repo notes flag the
  ghosted third-party marks pending his regen; not this build's change).
- Any text explaining what a visual should be showing? No.
- Do the shelves feel like the old portfolio's components? Yes: they are
  the components. The container is a grid instead of a scroller, which the
  brief asks for ("objects in a grid"); the case, chrome, flip and spread
  are byte-identical.
- Does anything bounce? No.

## Files to commit (in addition to Phases 2 and 3)
cases.js, projects.html (loads cases.js), circuit/stops.js, circuit.html,
circuit/circuit.css, circuit/nav.js, tools/circuit/paritytest.py,
tools/circuit/phase4test.py, docs/circuit/phase-4.md,
docs/circuit/phase-4-report.json, docs/circuit/phase-4-*.png.
