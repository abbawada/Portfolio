# Round 6: the lab, the skydive, the visitor drives

Asked for on 2026-10-10: update the portfolio and make it more intuitive,
"the best live thing for the racing cars", more happening on the site, an
interactive animation of someone skydiving for the link to the skydiving
project, and a lab "like Tony Stark in the cave" with a character that looks
like Abba, working on Betta, evolving over the real timeline (the robot car,
the posture corrector, the posture board strapped to the forearm for free
throws, the Betta sleeve). Built by a workflow of builders, judges, reviewers
and fixers; the per-module reports sit beside this one (lab-lab-a.md,
skydive.md, drive.md, content.md) with their captures.

## 1. The lab (circuit/lab.js, the Betta stop)

A drawn, animated 3:2 canvas scene replaces the Betta case card in the Betta
panel: one cave, one lamp, one bench, one figure, one number per stage. Six
stages from one exported array (STAGES at the top of the module; the seventh
is one new object):

| stage | date | number | what is on the bench |
| --- | --- | --- | --- |
| Bluetooth Car | Nov 2025 | 1 phone | the black chassis, knobby tyres, breadboard, red driver board, a phone |
| Posture Cue | Dec 2025 | 15 s | the breadboard held to the sternum, the OLED bar, the buzz after 15 s of slouching |
| The first free throws | Jan 2026 | 100 reads a second | the posture board strapped to the forearm, wires to the laptop, a free throw |
| Top 4 of 221 | Apr 2026 | Top 4 of 221 | the cheque pinned to the rock, where it stays |
| The rig | Aug 2026 | 6 firmware versions | the soldered protoboard, two IMUs taped to the arm, the iron, sparks |
| The Betta sleeve | Oct 2026 | 21 of 28 | the real sleeve from Abba's photos: black full arm, thumbhole cuff, the flap pocket, the gold Betta mark; the laptop strip Pulses, Set, Shot, Held, Good rep |

The figure is Abba: twists through Apr 2026, short curls with a fade from
Aug 2026, the purple hoodie in October. The shelves fill up as the stages
pass. Two variants were built blind (A tight and cinematic, B the cave as a
set) and judged on screenshots; A won on the "real person as the hero" rule
and took B's chrome, caption kicker, stacked phone tabs, the boxed heater,
the in-frame ball flight and the loop crossfades. Variant B is kept in
lab-b-variant/ for reference, not served.

Autoplay about 7 s a stage, paused on hover or focus, a 25 s pause after a
scrub; reduced motion holds one still per stage and scrubs instantly; the
frame loop stops off screen; the caption is the accessible description.
Frame cost measured by the module's check: about 0.5 ms a frame at DPR 1
and 2 (lab-lab-a.md, perf). Harness: tools/circuit/harness/lab.html
(?stage=N, ?still=1).

## 2. Skydiving (circuit/skydive.js, first on the Projects grid)

Abba's "Skydiving Project #2" (a jump instrument in the making: barometer,
LiDAR, GPS, haptics; the only public link is the reel). A 2:3 live tile
sits first on the Projects grid: the diver falling through clouds with the
altimeter counting. Click, tap or Enter opens it across the grid and
starts the jump: steer with the pointer, the arrows or a drag; at 4,000 ft
a gold pulse ring at the wrist and the Pull pill lights; pull with a click,
tap, Space, Enter or the button; the canopy snatches open, the glide, the
ground is the Wada Ring plate growing until the landing by the pit
straight; then "Watch the reel" and "Jump again". An automatic activation
device fires at 2,500 ft if nobody pulls. Escape ends the jump and leaves
the panel open; a second Escape closes the panel. Reduced motion: four
stills advanced by Pull and Next. Since the helicopter round (section 6)
every jump starts on the skid of the Betta helicopter. The module links its own stylesheet when
the page has none, so the tile never flashes unstyled; index.html links it
anyway. The eighth car, SKY 13, pale sky (#8fd3ff), joined the grid, and
Skydiving appears on projects.html with the reel link.

## 3. The best live thing for the cars: the visitor drives

The honest live input is still the person on the page (round 4's finding
stands: no external feed is honest and on-site), so the person now gets a
car. Drive (the primary pill, or D on the map) puts a paper-white car with
a YOU plate at the back of the field; ArrowUp, W or Space is the throttle,
ArrowDown or S brakes, the arrows or A and D steer, or press and hold on the
world and slide to steer on a phone. The hold rule applies to the player
as to any car, so passing takes a clean lane; the AI may pass the player
back. Every car passed raises a toast, "You passed Visual Mapping", with
Open it, which ends the drive and opens that project's stop, so the race
keeps sending people into the portfolio. The Grid shows the YOU row among
the field while driving (collapsed to the cars around you on phones), the
lap timer ticks in tenths, and the end card reads your lap and the best on
this device, with Drive again and Back to the map. "Start lap" is now
"Watch the race" (the chase camera, unchanged). The Grid head carries a
live Los Angeles clock; its caption reads "Each car is a project. Open one
and its car picks up pace. Drive to join them." A one-time hint, "Click a
stop to open it. Drag to look around.", shows until the first touch.

Measured after integration (docs/circuit/v15/final/):

| check | result |
| --- | --- |
| race contract at rest, 8 cars, 240 s, seeds 3, 7, 11 | pass: 0 touches, widest lane 3.1, mean change interval 16.1 to 16.7 s, longest wait 21 to 27 s |
| gate audit at 1600 and 1440 | zero overlaps in every category, 60 fps, 202 draw calls |
| label test | 7 of 7 pass |
| drive test (simulated full-throttle lap, live keyboard pass, phone) | 13 of 13 checks pass, lap completed, cars passed, lane never past 3.1, no touches, YOU row leaves with the car |
| lab check (harness, keyboard, reduced motion, destroy, perf) | all pass |
| skydive check | 0 failed |
| end-to-end smoke on index.html at 1440 and 390 | lab mounted with 6 tabs and styled pills, tile first on the grid, jump opens and Escape closes it, drive on and off, zero page errors |

## 4. Content

- The Betta case back and betta.html carry the court clip: rep 6 of the
  8 Oct 2026 session at real time then half speed, cut from the raw iPhone
  footage, 9:16, 1.5 MB, with the pitch render's tone map and motor tones.
  The painted-out version the reviewers asked for (venue marks blurred,
  the shirt crest inpainted) is parked outside the repo for Abba to compare;
  the live clip is the real footage, untouched, on the same basis as the
  cheque photo already live. The August rig graphic no longer shares the
  case back (capture false), so one session per card.
- betta.html gains the "21 of 21 free throws counted" still beside the clip.
- cases.js: Skydiving in EXTRA (AWUS-30510) and the projects.html plain list.
- styles.css: a still inside .betta-video is rounded like the clips.

## 5. Intuitive

The two pills say what they do (Drive, Watch the race); the hint tells a
first visitor the two gestures; the Grid caption says what a row is; the
panel's live pieces load only when their stop opens and never take a stop
down if a module fails (circuit/stops.js mountLive).

## Flags for Abba
- The lab's stage 2 says "a buzz after 15 s of slouching" (true to the
  ITP 348 build); the shelf's Posture Cue copy says "cues you upright the
  second you slouch". One device, two lines. Say which.
  Decided 2026-10-11: 15 s everywhere. The shelf line and blurb (cases.js)
  and the projects.html entry now say "cues you upright after 15 seconds
  of slouching".
- The court clip shows USC banners and the SC mark on the player's shirt;
  the "what counted" still too. Kept real by the orchestrator's call;
  the painted alternative is in the session scratchpad (content.md names
  the path).
  Decided 2026-10-11: keep the real clip.
- The wheelchair poster under the projects shelf shows real people and a
  USC-print shirt, as before this round.
- Phones remain untuned beyond what each module checked at 360 and 390.

## 6. The helicopter round (2026-10-10, later the same day)

Asked for: make sure the skydiver is jumping from the Betta blimp, which
may become a helicopter, and have it fly higher. Done as one aircraft in
two places, then corrected the same night by the fix round that followed
the review of dd49613; what follows is the aircraft as it now stands:

- **The Wada Ring (circuit/world.js, circuit/layout.js).** The blimp is
  now the Betta helicopter: an opaque paper cabin (M.cabin, #eceff2, so
  it reads white over the graphite tower and matches the tile's aircraft;
  the first cut's candy shell let the tower show through it) with BETTA
  on both flanks, a graphite boom, fin, stabiliser, tail rotor, cowl,
  mast and skids (one merged mesh; the tail-rotor disc has a back face,
  so it shows from either flank as the hull yaws round the lap), and a
  main rotor that is one faint disc (opacity 0.14), the blur a running
  rotor photographs as. No blades are drawn: solid blades at this frame
  rate step a fifth of a turn a frame and strobe, so the first cut's
  three went. It still shadows the race leader a little ahead of the
  nose, turns slowly like an aircraft, bobs, and dips its nose when it
  closes on a new leader. The height is a band, not one number: it
  cruises at 92 above the plate over the near half of the plate (the
  blimp held 62) and settles smoothly toward 68 over the far half,
  climbing again on the way back (HELI.height and HELI.floor; the plan
  sum x + z is the screen's up axis, and the camera looks down at 30
  degrees, so a hull held at 92 everywhere would leave the top of the
  desktop rest view over the far straight, while 68 is the lowest height
  clear of every mark, the About roof at 55.8 cleared by 5.7). Nothing
  is pinned to the frame's edge. Measured over 75 s at the 1440x900 rest
  view, the hull sits at 88 or higher 47 percent of the time and at 72
  or lower 40 percent, and is cut by the top edge about as often as a
  fixed 68 was (26 percent, entirely above the frame 7.5); at 390x844
  it is never cut. No ground shadow: from this height it would land some fifty
  units from the hull, often past the plate edge, and nobody would read
  a faint disc that far away as this aircraft's; the height shows in the
  aircraft sitting clear above the buildings (the first cut's shadow,
  fading at the plate edge, read as a stray blob). The environment map
  is blurred at sigma 0.04, the widest the PMREM generator's taps allow
  at this size (0.05 clipped and warned in the console on every load).
  layout.js exports HELI (at [150, 22] in plan, height 92, floor 68;
  BLIMP stays as an alias) and the ambient list says 'helicopter'. tools/circuit/map.js
  draws a helicopter glyph with no shadow, and docs/circuit/map.svg and
  map.html are regenerated from it after the last edit to layout.js (the
  review found both still carrying the blimp from 2026-09-12, then a
  regeneration made before the height and shadow changes; only the sky
  group changes, and the BETTA banner sits a few px wider than the cabin,
  a docs-only nit left in map.js).
- **The jump (circuit/skydive.js).** Every jump starts on the near skid
  of that helicopter, seen from below and behind: the diver hangs from it
  arms up for a moment, lets go at 0.6 s (the arms open into the arch
  with one roll), and the helicopter recedes up and out of the frame as
  the camera drops away. The exit lasts 1.5 s, during which the fall
  builds from nothing to the full rate, so it costs about 0.75 s of
  freefall (the altimeter reads about 12,970 ft as the aircraft leaves
  the frame). Steering is ignored throughout the exit. A pull made while
  the diver still holds the skid is kept and fires at the let-go; a pull
  made later in the exit opens the canopy while the helicopter goes on
  receding. The exit is announced in a running jump as in the still
  ("Exit from the helicopter, 13,500 feet"). The tile draws the aircraft
  in the world's tones, its rotor the same faint disc with no blades,
  about the length of the airframe so it clears the altimeter plate at
  every size. The compact tile shows the same helicopter passing out of
  the top at mount, after a close and each time its count wraps back to
  13,500 ft, fading in over the 250 ms of the digit dip, the smaller
  rotor disc clear of the altimeter plate (the first cut's pass popped
  into the frame whole; the review cut it, and the round that followed
  brought it back with the fade, since a visitor who never clicks should
  still see where the diver jumps from). The first reduced-motion
  still is the exit, held on the skid at 0.3 of the exit (the diver on
  the skid, arms opening, the name on the cabin clear), announced as
  "Exit from the helicopter, 13,500 feet"; reduced motion coming on in a
  running jump that has already left the helicopter holds the altitude
  reached instead and says so. Build query bumped to 15.1.

Measured (docs/circuit/v15/final/helicopter/, refreshed from the working
tree after the fix round, then again after the height band and the pass
came back; compact-pass.png is the compact tile 320 ms after mount):

| check | result |
| --- | --- |
| skydive check (docs/circuit/v15/skydive/check.mjs, 81 assertions) | 0 failed, zero page errors; frames mean 0.21 ms idle, 0.11 ms freefall, 0.12 ms canopy (skydive-check-report.json, run alone after the band and the pass) |
| gate audit at 1600 and 1440 | zero overlaps in every category, 58.6 and 60.3 fps, 204 draw calls (202 before the helicopter; the first cut's blades and shadow made it 206) |
| live page at 1440 and 390, Projects open, jump started | the diver on the skid of the helicopter in both, zero page errors (the fix round's captures; the exit did not change after it) |
| the world at rest (world-rest-1440.png) | the hull at (112, 92, 189), over the pit straight at the top of its band, clear above the About tower, zero page errors |
| the world up close (world-helicopter-close.png, zoom 4 on the hull) | the opaque cabin, one rotor disc, no blades, no shadow |
| the height band over 75 s at the rest view (scratch probe, samples every 250 ms) | 1440x900: height 67.5 to 92.5, at 88 or above 47 percent of the time, at 72 or below 40 percent, cut by the top edge 26 percent, entirely above it 7.5; 390x844: never cut; 60 fps, 204 calls at both |

docs/circuit/v15/final/helicopter-review/ (46 files, 7.6 MB) is the fix
round's own evidence, written inside the repo by the recheck stage; it
stays untracked and is not for the commit.

One failure while working: the first run of the skydive check timed out
waiting for the landing, because the gate audit and a capture script were
driving two other headless Chromes at the same time and the throttled
frames (dt is capped at 50 ms) stretched the glide past the 40 s wait.
Re-run alone it passed in full. Nothing in the module changed between the
two runs.

## 7. The review round (2026-10-10)

dd49613 was reviewed the same night by a workflow that wrote nothing
inside the repo until its fix stage: five reviewers, one dimension each,
and a completeness critic over what the five had not looked at; then a
panel of three lenses on every finding (code: is the defect in the
source; repro: does it show in headless Chrome against the review server
on 8646; impact: does a visitor meet it, and is the proposed fix the
smallest one), a finding standing when two of the three agreed and each
lens amending the fix; then fixers by file (world, skydive, docs), a
recheck run alone on the fixed tree, and the critic once more over the
fixes. Section 6 above and the helicopter section of skydive.md were
rewritten by that round to the tree as it stands; this section is the
record of the round itself. The reviewers' and verifiers' probes and
captures sit in the session scratchpad under review/ (threejs,
skydive-defects, design-judge, skydive-states, heli-review,
completeness, and one folder per lens and finding). Nothing committed.

| dimension | what it covered | raised | confirmed |
| --- | --- | --- | --- |
| world code (world.js, layout.js, map.js, index.html, stops.js) | the diff line by line, then the live page: rotation order, cabin and banner geometry, the rotor at 60 and 30 fps, the shadow, the dt guards, the reduced-motion still, draw calls, the console | 5 | 5 |
| skydive code (skydive.js, skydive.css, check.mjs, the harness) | all 1,002 lines: the skid placement, canvas state, the exit clock against the AAD and the stills, the observers, resize, destroy, two tiles, the self-linked stylesheet | 6 | 6 |
| design (captures at 1440x900 and 390x844, DPR 2) | the three-second test, BETTA wide and close, the exit in the tile from 60 to 1,300 ms, the compact wrap, the rotor, whether the height reads, tone, the 2D aircraft against the 3D one | 9 | 7 |
| runtime (the module's states, one Chrome at a time) | Escape and arrows during the exit, Jump again, reduced motion from the start, resize, scrolled away, destroy, ?two, ?nocss, ?open, focus, phones, frame cost | 6 | 6 |
| world runtime and docs | 90 s lap samples at three sizes (where the hull and its shadow are and what they cover), the rotor up close, the reduced-motion still, every blimp left in the repo | 9 | 6 |
| completeness critic | Watch the race and Drive under the aircraft, picking, stops.js, print, the harnesses and static pages, the fixes re-read line by line, the owner's two questions | 5 | 5 |
| all | | 40 | 35 |

Five findings fell at the panel:

- Up close a dark rectangle frames BETTA on the flank. The rectangle is
  real, but its stated cause (the far banner ghosting through the
  translucent cabin) and its fix (side: FrontSide) were both wrong.
- The aircraft passes under the 02 BETTA and 05 WRITING chips for a
  tenth of each lap. Measured and true, but the chips float over the
  world by the site's own rules, and the proposed fix ran backwards.
- It flies under the HUD title block with no backdrop behind the text.
  Every HUD line carries a four-layer paper halo (circuit.css lines 61
  to 63), the named consequences did not hold, and the part that does
  predates the commit.
- On the phone it passes under the Grid card and the 02 chip and clips
  the left edge. True, but not from dd49613 (screen x does not depend
  on height in this orthographic view), not at nav.js line 14, and the
  fix would have made the named symptom worse.
- decisions.md still lists the blimp among the ambient elements. The
  text is as described, but the same list still names the lapping car
  number 10, which the race replaced rounds ago: the file is a dated
  record of decisions, not a description kept current.

Of the 35 confirmed, 30 are closed by the edits below, one (the dead
sky guard) in its world.js part only, and four stand: two overtaken by
a larger cut or left as Abba's decision, one pre-existing, and one a
command nobody owned (the poster). The edits, by file (the map
regeneration counted once, though it had to run twice):

1. circuit/world.js: the helicopter's ground shadow cut (the mesh, its
   placement and fade in placeHeli, the declaration), with a comment on
   why there is none. Closes three findings at once: the disc lay on the
   paper past the plate edge, sat 560 px from the aircraft at opacity
   0.07 and was gone for 42 percent of the lap, and spilled past the
   edge in the rest and reduced-motion stills.
2. circuit/world.js: the tail-rotor disc gets a back face in the same
   merged graphite Builder (390 vertices, was 360; no new draw call), so
   it shows from either flank as the hull yaws round the lap.
3. circuit/world.js: the environment blur 0.05 to 0.04, the widest that
   fits the PMREM generator's twenty taps at this size; the console is
   empty on load.
4. circuit/layout.js, circuit/world.js, tools/circuit/map.js: HELI.at
   [150, 22, 70] to [150, 22], height the one altitude; world.js reads
   L.HELI.height and map.js H.height; the stale shadow rotation line and
   its comment went with the shadow.
5. tools/circuit/map.js: the glyph's shadow circle cut, to match the
   world.
6. circuit/layout.js: HELI.height 92 to 68, the lowest height still
   above the blimp's 62 and clear of every mark (a raycast scan of the
   hull's underside over every track frame, nose down and bob low: the
   About roof at 55.8 cleared by 5.7 units, where the blimp cleared it
   by 0.03; never over the About needle at 62.6 or the Betta mast at
   63.6). At the 1440x900 rest view the hull is entirely above the
   frame for 4.4 percent of track frames (about 25 at 92) and cut by
   the top edge for 36; at 390x844 it never fully leaves. Closes the
   two height findings.
7. circuit/world.js: the three blades, the rotor group and the per-frame
   spin cut; the main rotor is one disc at opacity 0.14 (was 0.08),
   added to the hull where the rotor sat. One draw call fewer.
8. circuit/world.js: M.cabin, an opaque MeshStandardMaterial #eceff2
   (roughness 0.6, flat shading), used by the cabin mesh alone; M.white,
   the candy of three districts at 15 sites, untouched. The rest-view
   cabin sample went from #565855 to #e4e6e5.
9. circuit/world.js: the dead `if (loc.sky) continue;` in the LOCATIONS
   loop deleted (no location has carried sky since 2365f48).
10. circuit/skydive.js: one defect behind four findings, fixed at the
    root. doPull no longer resets the exit clock; the clock runs on
    through opening, draw() computes the exit for any jump phase and the
    hang pose only in freefall, and the arms open from wherever the
    let-go left them, so a pull before the helicopter has gone leaves it
    receding at its own speed while the pilot chute comes out (cabin
    pixels after a pull at 13,380 ft: 8268, 7269, 5978, 4069, 1997, 112,
    0, the same slope as before the click). A press while the diver
    still holds the skid (the first 0.6 s) is kept in pullWanted
    (holdingOn()) and fires at the let-go, the canopy opening at
    13,440 ft. No new UI state, no new copy.
11. circuit/skydive.js: the compact tile's pass of the helicopter after
    each wrap cut (PASS_S, passT, the idle bookkeeping and the idle
    branch of draw()). Closes three findings: it popped into the frame
    whole over the altimeter plate, reduced motion switched on mid-pass
    froze it in the still, and it had no fade.
12. circuit/skydive.js: EXIT_STILL = 0.3 holds the reduced-motion exit
    still in one place (setStill writes EXIT_S * EXIT_STILL into exitT
    and draw() reads it; the old literal 0.42 inside draw() was why
    editing setStill alone changed nothing), so BETTA is clear of the
    diver on the still; setStill(i, alt) takes the altitude reached, so
    reduced motion coming on mid-jump holds it (10,440 ft in the probe)
    and says "Freefall, 10,440 feet" rather than rewinding to 13,500.
    Closes two findings.
13. circuit/skydive.js: the tile's rotor radius 150 to 105, so the disc
    never enters the altimeter plate through the exit at 490x306 or
    348x217 (150 intruded 29 and 18.6 px; 115 still 4.0 and 0.9).
14. circuit/skydive.js: startJump's motion branch announces the exit
    ("Exit from the helicopter, 13,500 feet"), as the stills already
    did.
15. docs/circuit/v15/skydive/check.mjs: path 7's 700 ms wall-clock wait
    before the pull is a wait on the posted altitude (13,440 or lower,
    the let-go), so the click lands after the let-go at any frame rate.
16. circuit/skydive.js: drawHeli's three-blade loop and tail blade cut,
    the disc fill 0.16 to 0.22, the signature drawHeli(x, y, s); the
    tile's rotor matches the world's. Pixel change per frame over the
    rotor band during the hang: 0 (4.1 to 5.5 every frame with the
    committed module).
17. docs/circuit/map.svg, docs/circuit/map.html: regenerated with node
    tools/circuit/map.js, twice: at the committed layout (both had
    carried the blimp since 2026-09-12), then again after the world
    edits (the first run still drew the shadow and the height-92 cabin).
    Only the sky group changed: no r="30" shadow circle, cabin rect at
    y 188.69.
18. docs/circuit/v15/round-6.md, docs/circuit/v15/skydive.md and
    docs/circuit/v15/final/helicopter/: section 6 and the helicopter
    section rewritten to the working tree, the exit altitude corrected
    (about 12,970 ft at the end of the exit, not 12,800), and the twelve
    captures refreshed under the same names from the working tree
    (compact-pass.png deleted with the pass; gate-report.json and
    skydive-check-report.json replaced).

Not done, and why:

- The no-WebGL poster (images/wada-ring-poster.jpg, last made
  2026-09-12) still shows the blimp. No fixer owned it. To run after
  the world edits, so it shows the final aircraft: /usr/local/bin/python3
  tools/circuit/poster.py 'http://127.0.0.1:8646/index.html?poster=1'
  (the ?poster=1 adds body.is-poster, which hides the HUD, pins, map
  and grid so they are not baked in a second time; the committed poster
  already carries a doubled header for want of it), then open
  ?nowebgl=1 and look for one heading and the helicopter.
  circuit/poster-areas.js regenerates byte-identical.
- tools/circuit/poster.py line 84 (a dead loc.sky guard whose comment
  still says blimp) and tools/circuit/gate.mjs line 177 (a dead sky
  field): not in any fixer's files; the matching guard in world.js
  went. Delete both when next in those files.
- The shadow's rim-fade and clipping-plane variants: overtaken by the
  cut.
- A frame-aware altitude clamp in placeHeli: not taken. It couples the
  world to the viewport every frame, pins the hull to the canvas edge
  for a third of the lap (it reads as a UI element sliding along the
  top, and contradicts "fly higher" exactly where it bites), and needs
  a floor and a zoom gate to keep clear of the marks; four of the six
  panel voices preferred one number. 68 it is, with the decision below.
- The compact tile showing the helicopter at mount and after Back or
  Escape: overtaken by the cut of the pass.
- The Pull pill 12 px below the fold on a 360x740 phone, and the scene
  sliding under the sticky head when scrolled to: the round-6 sheet
  layout, not from dd49613. The one fix that measured right grows the
  sheet while the jump is open (.ring-panel:has(.sky.is-open) with
  height 76vh in circuit.css's max-width 760px block: the pills then
  sit at 589 to 629 of 740 with no scroll) at the cost of 16vh of the
  world behind it; Abba's call, below.
- The map glyph's BETTA banner (63 px) runs past its 40 px cabin rect:
  a docs-only nit left in tools/circuit/map.js, recorded in section 6.

Three decisions this round left to Abba, and what was done with them
right after the round, against the ask as written ("have it go higher up
in the sky"): the first two were taken, the third stays open.

- The height: a fixed 68 undercut the ask, so placeHeli now flies the
  band described in section 6 (92 over the near half of the plate, 68
  over the far half, a smoothstep on the plan sum x + z, nothing pinned
  to the frame's edge); map.js draws its glyph at the same band.
- The compact tile: the pass is back, fading in over the digit dip (PASS_S
  1.8 s, PASS_FADE_S 0.25 s), at mount and after a close as well as after
  each wrap, and off under reduced motion.
- Also done after the round: the no-WebGL poster regenerated with
  tools/circuit/poster.py over ?poster=1 (images/wada-ring-poster.jpg,
  146 to 118 KB, one header, the helicopter in it; circuit/poster-areas.js
  unchanged), the dead sky guard in tools/circuit/poster.py and the sky
  field in tools/circuit/gate.mjs deleted, and docs/circuit/map.svg and
  map.html regenerated once more at the band's height. The phone sheet
  (decision 3) is untouched.

The three decisions as the round left them:

1. The height. 68 is above the blimp, but "higher" is now 6 units,
   about 26 px at the desktop rest view, and the hull still leaves the
   top of the 1440x900 frame over the far half of the lap (cut by the
   top edge 36 percent of the time, entirely gone 4.4). The height that
   never leaves that frame is 50 to 55 by the panel's three measures,
   below the blimp. Say which: higher than the blimp, or always in
   frame.
2. The compact tile. It shows the diver and the count alone; the
   aircraft is seen only after the click, in the exit and in the first
   reduced-motion still. If it should pass through the compact tile at
   each wrap as well, the pass comes back as a fade in the digit dip
   with the smaller rotor disc kept clear of the plate (prototyped in
   the review, a one-line change either way).
3. The phone sheet. Grow it to 76vh while the jump is open so the Pull
   pill fits a 360x740 screen, or leave it at 54vh with the pill one
   short scroll down.
   Decided 2026-10-11: 76vh while the jump is open
   (`.ring-panel:has(.sky.is-open)` in circuit.css's phone block).
   Measured on the live page at 360x740: the sheet 400 px before the
   click, 562 after, the Pull pill at 589 to 629 with the steer hint
   showing, 400 again after Back; 390x844 the same shape (456, 641,
   pill at 655 to 695); 1440x900 unchanged; skydive check 81 of 81.

Rechecked alone on the fixed tree, twice (after the fixes, and again
after the docs were rewritten); the second run's numbers, with the
first in brackets where they differ:

| check | result |
| --- | --- |
| skydive check (docs/circuit/v15/skydive/check.mjs, run alone) | 81 of 81, 0 failed, pageErrors [] and consoleErrors []; frames idle 0.20 ms mean (p95 0.5), freefall 0.13 (p95 0.4, max 5.6), canopy 0.09 (p95 0.3) [0.16, 0.11 and 0.12]; the cue at 3,990 ft, the AAD at 1,490 ft, the post-let-go pull waited on the posted altitude, reduced-motion still 1 announced "Exit from the helicopter, 13,500 feet" with the diver on the skid under BETTA; no timing retry |
| gate audit (tools/circuit/gate.mjs, 1600x900 and 1440x900) | every overlap category empty at both widths; 204 draw calls and 51,184 triangles at both; 59.5 fps at 1600 and 59.7 at 1440 [59.1 and 60.3]; markClear about 34, betta 97, education 54, economics 24, writing 35, projects 28, contact 200 px; gate errors [] |
| live page (Playwright over Chrome, DPR 2, 1440x900 and 390x844, one browser at a time) | zero page errors and zero console errors at both sizes; the helicopter is the one Group at scale 1.4, five children (graphite, the opaque cabin, the 0.14 disc, two banners), no shadow mesh, at about (119, 68, 190), on screen in both rest views over the About tower with BETTA readable at 1440; the Projects pin clickable at both sizes, the tile first and idle; at 405 and 395 ms after the tile click freefall at 13,490 ft, status "Exit from the helicopter, 13,500 feet", the diver hanging from the near skid under BETTA with the whole aircraft in frame; at 1,855 and 1,846 ms 12,760 and 12,800 ft, the arch over clouds, the helicopter gone; 204 calls, 59.3 and 58.8 fps |
| the hull up close (view on the Group, zoom 4, twelve frames) | on screen in all twelve as it follows the leader; nose pitch -0.06 to -0.10 rad, bob between y 67.5 and 68.1; 87 draw calls at that zoom; the cabin, BETTA, boom, fin, tail ring and skids read, the main disc barely visible at 0.14 up close |

docs/circuit/v15/final/helicopter-review/ holds that evidence: 48 files,
6.36 MB. The 18 harness captures of the check (01-compact-grid.png to
18-aad-fires.png) with check-report.json and check.log;
gate-wide-1600.png, gate-wide-1440.png, gate-report.json and gate.log;
eight live captures (rest, Projects open, the jump at 350 ms and at
1,800 ms, at each size) with live-report.json and live.log;
frame-01.png to frame-12.png with frames-report.json and frames.log.
The 18 PNGs over 300 KB were quantized with pngquant (quality 80 to
100) and all 40 run through oxipng to bring the folder under the 8 MB
budget, dimensions unchanged; the lossless originals are in the
scratchpad (review/final-verify/originals/). Section 6's count (46
files, 7.6 MB) is the first run's; the second re-made the twelve frames
at DPR 2, then compressed. The folder is review scratch written inside
the repo by the recheck stage and stays untracked; the round's evidence
for the commit is docs/circuit/v15/final/helicopter/, refreshed by edit
18 above.

### Failures

Every command that failed across the review workflow, by stage, and
what fixed it. The world-code and runtime reviewers had no failed
command, and the recheck's four runs (check, gate, live, frames) all
exited 0 and fell short only on the folder's size. Everything here was
fixed at the root and re-run, except item 40, which says so.

Review stage:

1. Skydive code: probe.mjs read the canvas as soon as data-alt reached
   13,400 and found no cabin pixels, a false negative (data-alt posts
   every eighth frame, and the wrap sets 13,500 at wrap 0.5, 125 ms
   before the pass began). probe2.mjs waits on the cabin-colour pixel
   count itself; re-run, 1,820 pixels before and after the switch.
2. Design: the first lap probe took the rotor's screen radius from a
   wrong pixels-per-unit (895 px), so its overlap and cut-at-top counts
   (478 of 478) meant nothing. Its raw samples were kept and every
   statistic recomputed offline with the radius from the view geometry
   (68 px at 1440, 19 px at 390), exit 0.
3. Design: a Pillow DeprecationWarning (Image.getdata) on the
   flank-colour measurement. Rewritten with im.load() pixel access and
   re-run under python3 -W error; same values, no warning.
4. World runtime and docs: `echo ======` as a separator failed under
   zsh ("===== not found": a word that starts with = is a command-path
   lookup). Quoted and re-run.
5. World runtime and docs: `ls circuit/*.png` failed ("no matches
   found": a glob that matches nothing is an error in zsh). Replaced
   with find -iname, which found the poster assets.
6. World runtime and docs: a repo-wide grep for AMBIENT swept
   circuit/vendor/three.module.min.js into a 360 KB result that was
   persisted rather than shown. Read in bounded slices; later greps
   scoped to circuit/, tools/ and named files, excluding vendor.
7. World runtime and docs: reduced.mjs crashed on
   `c.raceState(...).map is not a function` (raceState returns an
   object), and outframe.mjs carried the same call. Both calls dropped;
   both scripts re-run clean, report and captures written.

Panel stage (the three lenses, each finding its own probe):

8. Four probes threw inside page.evaluate: `THREE is not defined` twice
   (the page imports three as a module, no global) and `Box3 is not a
   constructor` twice (geometry.boundingBox is null until computed).
   Rewritten with camera.position.clone() or its constructor, and with
   computeBoundingBox() plus the eight corners through matrixWorld.
9. A finder snippet run through eval() with const declarations threw
   `heli is not defined` (strict-mode eval keeps them scoped).
   Rewritten as a function expression; re-run with no page errors.
10. The phone crops came out blank: the probe cropped the canvas
    centre, while portrait nav sets view.shiftPx and fit() offsets the
    frame. Cropped around the hull's projected position instead.
11. Two scripts read track frames as f.x, f.z, f.tx, f.tz (L.frames()
    stores f.p and f.t), giving NaN or null extents. Fixed in both and
    cross-checked against the live body meshes (projected -30 against
    measured -27).
12. Three probes framed the aircraft wrongly: nav.flyTo(x, z, zoom) and
    a park at the About tower's plan point both target the ground, so
    at height 92 the hull projected above the frame (#000000 samples,
    or Playwright's "clipped area is either empty or outside the
    resulting image" at y -462). Re-framed with view.target set to the
    hull's full position (or lifted along the view direction) then
    fit(); all samples on screen.
13. Three probes waited for an idle phase, or clicked the tile, on the
    harness with ?open=1, which mounts open and already jumping (the
    click was taken as a pull and moved the stills past the exit).
    Waited for the canvas and window.__sky and called __sky.jump(), or
    used the compact mount and clicked only when data-phase was idle.
14. boundingBox() of .sky-again returned null: the Jump again row is
    shown only once is-landed is added, about a second after the
    landed phase. Waited for it visible; the partial results were saved
    before the long wait.
15. The first load probe opened four live pages as tabs of one headless
    browser; only the first rendered (background tabs do not), so it
    proved nothing. Re-done with three separate browser instances (the
    harness held 62 fps under them).
16. The refute-passT probe counted near-white pixels (the altimeter
    text and clouds match too) and read the figure's class before the
    matchMedia change had landed. probe2 counts the cabin-window colour
    and waits for is-reduced: 0, 184, 181, 181, 0.
17. A probe sampled at a 700 px viewport, which tripped the 720 px
    media query (a phone-size tile) and ended before the wrap. Widened
    to 1000 px, waited on data-alt 9,000 or lower, sampled 2.6 s.
18. The first pass-pop probe's thresholds came from a larger capture
    (4,000 white pixels; the 230 px tile peaks near 1,900) and timed
    out. Measured one idle cycle and set seen above 800 and ended below
    400 against a baseline of about 110.
19. probe.mjs called phase() without its page argument (TypeError on
    evaluate). Every call given the argument; all five variants ran.
20. probe.mjs: SyntaxError, `label` declared twice. The helper renamed;
    all three runs completed.
21. An init script observed document.documentElement at document start,
    when it is still null, so no observer attached and no live-region
    events were logged. observe(document, ...) instead; every text
    change logged in all three runs.
22. fix-sweep.mjs: ReferenceError D is not defined (a zsh variable used
    inside the Node module). Read process.env.D and exported it.
23. shot.mjs: SVGRect from getBBox() has no toJSON, so the DOM check
    threw before the second screenshot. Spelled out x, y, w, h.
24. probe3.mjs read renderer.properties.get(material).currentProgram,
    undefined on this three build. Dropped the readout and tested the
    alphaTest effect by measurement.
25. probe3.mjs's blank-transparent-map variant blanked the shared banner
    texture (Texture.clone() shares the Source), zeroing every later
    diff in that run. Those results discarded; the cabin-side variants
    re-run in probe4 and probe5 without texture swaps, each against its
    own paired reference.
26. Box3.setFromObject(m) without precise inflated the yawed disc's
    footprint to 19.7. Re-run with precise: 14.0 at every yaw.
27. The first shadow on/off pair measured a delta of 0 (the shadow was
    faded to 0 at the plate edge, then hidden under the Grid panel).
    clear.mjs waits on opacity 0.069 or more and a position clear of
    the panel; a clean 7-level delta at both widths.
28. The rest-view A/B diff was contaminated by the race running between
    the two captures. rest-ab.mjs calls __circuit.stop() and render()
    before both.
29. Pixel-diff scripts printed Pillow's getdata DeprecationWarning
    twice. Rewritten with get_flattened_data() and tobytes(); the first
    comparison was also two separate loads (cars had moved) and was
    replaced by a same-frame comparison.
30. An ls of pngjs failed: no PNG decoder in that node_modules. The
    screenshots were decoded inside the page (a data-URL Image on a 2D
    canvas, getImageData).
31. A probe read the tile's size right after the pin click, the compact
    232x348 tile rather than the open one. Clicked .sky-tile and waited
    for is-open: 490x306 and 348x217.
32. Regex greps for Euler.set order handling in the minified three
    proved nothing. A node .mjs imported the vendored module and printed
    "order after set: YXZ".
33. grep -o with .{0,1800} patterns on the minified three hit ugrep's
    complexity limit. A node indexOf/slice one-liner extracted r185 and
    the transmission-pass source.
34. Zero-match lookups exited 1 five times: grep -c fromScene on the
    commit diff (the expected zero, no fix needed), "function smooth"
    when the helpers are const arrows, an anchored "const rafStats"
    that stopped an && chain, a guessed path shots/log-jump.txt, and
    `sed -n 220,240p circuit/map.js` when the file is
    tools/circuit/map.js. Each re-run on the right pattern or path.
35. `git show $h:circuit/layout.js` failed twice ("ambiguous argument":
    zsh reads :c as a modifier on the variable). Braced and quoted,
    "${h}:circuit/layout.js".
36. BSD sed rejected GNU's N,+Mp range, and a stray `sed -n /dev/null`
    errored. Both dropped; the lines read another way.
37. `ls --time-style` is GNU only. `ls -lT`.
38. Unquoted `echo ======` separators failed under zsh six times in this
    stage (the leading = is a command-path lookup). Quoted each time
    and re-run.
39. A zsh glob that matched nothing (tools/circuit/harness/*.js) aborted
    a listing. find -type f.
40. The full-lap word-overlap probe (words.mjs, three viewports by
    100 s) had produced no output when the verdict was due. Not
    completed: the HUD verdict rests on the reviewer's samples.json and
    captures re-read against the HUD words; the script and log stay in
    the scratchpad (review/heli-hud-impact/).

Fix stage:

41. World: ${PIPESTATUS[0]} printed an empty exit status (zsh spells it
    $pipestatus); the probe itself had completed. ${pipestatus[1]} on
    the gate run and $? on the single commands, all 0.
42. Docs: a zsh for-loop over decisions-blimp/*.txt *.md *.json aborted
    on the unmatched glob. The four .txt files read by name.
43. Docs: exit-03-helicopter-recedes waited for data-alt 13,320 or lower
    and caught the aircraft already gone (13,230 ft, the same thing the
    committed capture at 950 ms wall-clock showed). Moved to 13,380
    (about 0.8 s of the exit) and the whole series re-run.
44. Docs: an em-dash check piped grep into head and read head's exit.
    grep -c on each file: 0 and 0.
45. Docs: an awk count of the Measured table used a guessed line range
    and found no rows. Re-run matching pipe-led lines from line 128:
    six rows of three pipes.
46. Skydive: the per-frame rotor-band measure averaged a NaN from a
    buffer of a different length after the open resize and printed null
    means. Compare equal-length buffers and average finite values only:
    working tree 0.14, committed module 4.72.

Recheck stage:

47. First run: the twelve helicopter frames as full 1440x900
    screenshots put the folder at 10.7 MB, over the 8 MB cap. Re-run as
    680x460 clips at DPR 1 (134 to 154 KB each): 7.9 MB in 46 files.
48. Second run: no command failed, but the folder came out at 17.2 MiB
    (DPR 2 frames of about 1 MB each over the About tower's LED board,
    the Projects capture 2.4 MB) and no PNG compressor was installed.
    The 40 lossless PNGs copied to the scratchpad, pngquant 3.0.3 and
    oxipng 10.2.1 installed with Homebrew, the 18 over 300 KB quantized
    (quality 80 to 100, none skipped) and all 40 run through oxipng:
    6.36 MB, dimensions unchanged, re-measured to prove it.

Critic and its panel:

49. A grep for the flat map's sky group with a pattern running on to
    the hud group matched nothing (a newline separates them); the
    pipeline exited 0 with empty output. Limited to the sky line.
50. The same grep spanning a line break printed nothing in the panel.
    `grep -n 'id="sky"'`, which showed no circle and the rect at
    y 188.69.
51. An unquoted `skydive.md?` in an echo was globbed (no match) and
    stopped the && chain. Quoted; the remaining checks re-run.
52. `echo ===== WORLD` and two more =-led separators failed under zsh
    (three times). Quoted.
53. Bare globs over scratchpad/*.json and repro-tile-pop/*.txt matched
    nothing (two commands). grep -rl with quoted --include patterns,
    and find piped to a while-read loop.
54. The first probe capped its sample list at 60 entries, so it could
    not show the wrap had happened. Recorded every altitude and ended
    on state (back at 13,500, then below 13,000): wrapped true, 21
    white pixels at most, zero page errors.
