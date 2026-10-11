# The lab, variant B: the cave as a set

Built 2026-10-10. Files (all new, nothing existing touched):

- `circuit/lab-b.js` (1318 lines): the module, `export const STAGES` and `export function mountLab(el, opts)`
- `circuit/lab-b.css` (145 lines): the figure, the number, the caption, the timeline tabs
- `tools/circuit/harness/lab-b.html`: a 520px column on paper with the page's fonts; `?stage=N` (1 to 6) opens on a stage, `?still=1` freezes motion at that stage's still pose, `?start=last`, `?autoplay=0`; exposes `window.__lab` (the API) and `window.__labStages`
- `docs/circuit/v15/lab/lab-lab-b-s1.png` to `s6.png`: every stage at 520px, dpr 2, at its still pose
- `docs/circuit/v15/lab/lab-lab-b-motion-s3.png` and `-s6.png`: six frames 0.4 s apart through the free throw (stage 3: 0.7 to 2.7 s; stage 6: 4.5 to 6.5 s, the release, the long buzz ring and the check lighting), tiled 3 by 2 with ffmpeg
- `docs/circuit/v15/lab/lab-lab-b-phone-360.png`: the figure at a 360px viewport
- `docs/circuit/v15/lab/lab-lab-b-check.mjs`: the Playwright contract (copied from the scratchpad; run `node lab-lab-b-check.mjs 8652` against `tools/circuit/serve.py 8652`); `lab-lab-b-strip.mjs` and `lab-lab-b-perf.mjs` beside it

## What it is

A 3:2 canvas (600 by 400 logical units, scaled to the container width and the device pixel ratio, capped at 2) of a rock cave: near-black and graphite facets, one hanging work lamp with a drawn cone and dust drifting in it, three shelves on the left wall, a bench across the lower third with cables along its front, a dim heater coil in a brick box far right, a laptop at the right end of the bench from stage 3 on. Abba stands behind the bench, full figure, legs visible under the slab between the bench legs, lit gold from above and cyan from the laptop side. The one number sits top left in Chakra Petch with a dark halo; the date, the title and the one line sit under the scene in the caption; six tabs on a tick line scrub the stages.

Variant B's bet is that the room tells the story: the shelves fill up as the stages pass (a coil of wire and a jar at the start; the car goes up after stage 1, the posture board and OLED after stage 2, two books, a roll of tape, a box of parts, a solder spool, and the rig after stage 5), the cheque stays pinned to the rock from stage 5 on, the dumbbell sits by the bench in stage 5, the laptop arrives in stage 3. Scrubbing back and forth, the cave itself is the timeline.

Layers per frame, in order: the static layer (walls, lamp, cone, shelves, forge box, floor, the pinned cheque, the dumbbell; one offscreen canvas rebuilt only when the stage or the size changes), the forge flicker and the dust, his body (legs, upper arms, torso, head, hair, face) on a cleared figure canvas lit with three source-atop gradients and composited, the bench layer (slab, front, cables, legs, stretcher, laptop body, vignette; a second cached canvas), the laptop screen, what sits on the bench, his forearms and hands on the figure canvas again so they rest on the slab and over the props, what he holds in front (the ball), rings, smoke, sparks, then the cut to black. He is drawn as flat cel shapes in three skin tones (lit #5f3f2d, mid #4a3226, shade #2d1c14) with a lit forehead and a shaded jaw, two-bone IK arms whose bones shorten when a hand is low on the bench or close to the shoulder (the forearm pointing at the camera), a breathing cycle, blinks every 3.7 s, head look and tilt, a mouth that can grin, and a wrist that flicks.

## How each fact is shown

| stage | number | what you see | the fact |
| --- | --- | --- | --- |
| 1, Nov 2025, Bluetooth Car | 1 phone | black octagonal chassis, four knobby tyres with rotating lugs, white breadboard with a hole grid, red driver board, dark dev board with a blue LED, grey pouch LiPo, six yellow, red and black jumpers; a phone propped against a jar with a cyan joystick screen. He pushes a jumper home, the LED blinks eight times, the tyres spin, the car twitches 8 px forward and back, he looks up at the camera | a robot car on a breadboard driven from a paired phone |
| 2, Dec 2025, Posture Cue | 15 s of slouching | breadboard with a dark Photon 2 (cyan LED breathing), blue BNO055, round black buzzer, grey tactile button, yellow LiPo, red OLED carrier on a black flying lead. He lifts the board to his sternum, stands tall (the OLED bar fills, PERFECT), slumps over five seconds (shoulders drop 10, head drops 19 and comes forward, the bar drains, the angle readout climbs), two gold rings pulse from the buzzer at 4.7 and 4.95 s, he snaps upright | an IMU on the chest, a buzz after 15 s of slouching |
| 3, Jan 2026, The first free throws | 100 reads a second | the same breadboard on a black band at his right forearm, a red and black lead to the laptop, a basketball; the laptop plots one cyan trace. Set (ball at the chin), dip (knees bend, the body drops 7), release (both arms up and right, body turned 0.6 toward the hoop), follow-through with the wrist flicked down, the ball arcs out top right, the trace spikes at 2.15 s, he looks at the screen, looks at the camera, reaches left for the next ball | free throws only, the posture board strapped to a forearm, read by a sensor |
| 4, Apr 2026, Top 4 of 221 | Top 4 of 221 | black blazer with lapels over a dark tee; a cream board with Betta and $10,000 in Chakra Petch and one thin rule, no logo, no signature. He raises it from his chest to the rock right of the lamp, pins it (a gold pin dot at 1.6 s), steps back 14 px, looks up at it, nods twice, turns back to the bench, looks at the camera; a crossfade covers the loop restart. From stage 5 on the cheque is painted into the static layer, so it stays on the wall | USC New Venture Seed Competition, 4th of 221, a $10,000 award |
| 5, Aug 2026, The rig | 6 firmware versions | short curls with a faded side, dark tank, grey track pants with a light stripe; green protoboard with a copper hole grid, a micro, a driver, four soldered wires and seven solder beads; two blue breakouts taped (paper-alpha tape) to his left upper arm and forearm with a three-strand grey ribbon down to the board; two silver coin motors at the wrist; a soldering iron on a coil stand; a dumbbell on the floor; the laptop plots two traces, cyan and gold. He picks up the iron, dabs the joint three times (tip glow, 16 gold-to-white sparks each, three smoke wisps), returns it, raises the rigged arm, two quick tap rings at the wrist at 4.5 s with a trace spike, grins at the laptop, looks at the camera | six firmware versions, a protoboard he soldered, two IMUs on the arm, vibration motors |
| 6, Oct 2026, The Betta sleeve | 21 of 28 reps buzzed | purple hoodie with drawstrings and sleeves pushed up (forearms bare); on the bench a black knit tube with a faint knit texture, three rounded grey pods (elbow, forearm, wrist), three small cuff buttons, a grey LiPo with red and black leads at the cuff; the laptop shows a paper coach card with a grey check. He solders the battery lead (two spark bursts), puts the iron back, pulls the sleeve from the bench onto his right forearm (it slides and rotates into place over 0.6 s), picks up the ball, shoots a free throw, after the release ONE long gold ring (1.5 s, to 48 px) at the wrist and the check lights gold with a glow, he looks at the laptop, then up at the camera for 1.1 s, then back to the bench, and the sleeve crossfades back to the bench so the loop joins | the sleeve, three grey pods, first court session Oct 8, 21 of 28 reps buzzed |

Hair: stages 1 to 4 a dark cap clipped to the crown with ten crown bumps and twelve twist strands falling to the brow and temples; stages 5 and 6 a cap of nine tight curls with a skin-dark fade at the temples. Clothes as briefed, no marks on any garment. The vocabulary of the buzzes follows Abba's: short tap rings in stage 5, ONE long ring after the release in stage 6, nothing when there is nothing to say.

## The API

`mountLab(el, { onInteract, autoplay = true, start = 'first' })` returns `{ destroy, goTo(i), play(), pause(), stages }` as specified, plus three harness extras that cost nothing if unused: `seek(t)` (resimulates the stage from zero to loop time t without drawing, then draws once, so stills are deterministic), `still(bool)`, `stats()` (frames, average and max draw milliseconds, the reduced flag, the index, the loop time) and `reset()`. `onInteract('scrub')` fires on every tab selection. Selection holds autoplay for 25 s; hovering or focus inside the figure holds it; the tab goes hidden or the figure leaves the viewport and the loop stops (visibilitychange plus an IntersectionObserver), resuming with a fresh clock. Autoplay is 7 s a stage, 14 s on the last, a 0.28 s cut to black and 0.36 s back between stages. Under reduced motion there is no loop, no autoplay, no dust, no sparks, one still pose per stage (`still` in STAGES), and a scrub swaps the scene instantly; the media query is listened to, so switching it mid-session takes effect. `destroy()` cancels the frame, removes every listener and observer, and empties `el`; a second call and calls after it are no-ops.

The tabs: `role="tablist"` with six `role="tab"` buttons, `aria-selected`, `aria-controls` pointing at the stage element, a roving tabindex, ArrowLeft and ArrowRight (plus Home and End) move focus, Enter or Space selects. The caption is `aria-live="polite"` and carries the date and the line; the canvas is `aria-hidden`. Labels are the dates stacked month over year so six fit in 320 px.

## Tests

`lab-lab-b-check.mjs` over real Chrome (channel chrome, headless, dpr 2), 30 checks, 30 passed on the final file, twice:

- zero page errors and zero console errors over the whole run (live mount, the keyboard pass, reduced motion, 360 px, destroy)
- figure.lab, aria-hidden canvas, 520 by 347 css filling the 520 container at 3:2, backing store 1040 by 693 at dpr 2
- caption aria-live polite; six tabs with date labels; one aria-selected; roving tabindex 0,-1,-1,-1,-1,-1
- ArrowRight then Enter through all six stages: index, aria-selected, caption line, date and number all match STAGES; onInteract called exactly five times; ArrowLeft plus Space goes back; Home plus Enter returns
- autoplay reaches stage 2 by 8.6 s; it holds at stage 1 for 8.6 s while hovered; a click on tab 3 selects it, calls onInteract once, and the 25 s hold keeps it there past 8 s with focus blurred and the mouse away
- reduced motion (context reducedMotion: reduce): detected, rAF count flat over 1.5 s (3 to 3), a keyboard scrub swaps the pixels and the caption with one redraw, no autoplay after 8 s
- 360 px viewport: canvas 328 by 219 (minimum 320 honoured, 3:2), document scrollWidth 360 (no horizontal overflow), six tabs 54.7 px each all inside the viewport, backing store 656 px
- destroy(): container innerHTML is the empty string, rAF count flat over 600 ms, destroy twice then goTo and play are harmless and still start no frames

## Frame cost

Measured in headless Chrome at 520 px, dpr 2, on this Mac while two other agents' Chrome runs shared the machine, so treat the numbers as upper bounds.

- Main-thread draw (the time to issue every command for one frame, `stats()`): 0.21 to 0.25 ms average over 240 frames on stages 3, 5 and 6 at 60 fps; 0.65 to 1.3 ms when measured around `seek()` which includes a full resimulation of the stage from zero
- Raster, forced synchronous with a 1 px readback after each frame (`lab-lab-b-perf.mjs`): 3.6 to 5.3 ms median at dpr 2 after limiting the two figure composites to his 380 by 300 bounding box (4.1 to 7.2 ms before). Headless Chrome rasterises in software; on a laptop with GPU raster this runs on the compositor thread and is not on the 4 ms budget. The readback baseline itself is 0.00 ms median
- What costs: four composites per frame (the static layer and the bench layer are full canvas, the body and the hands passes are the bounding box), three source-atop gradient fills per figure pass, 26 dust motes, up to 48 sparks, the laptop trace of 64 points, and the rest is a few dozen flat shapes

The static layer and the bench layer are rebuilt only on a stage change, a resize, or when the fonts finish loading (the cheque text).

## Hard rules, checked

Grep of the three new files and this report for every word on the banned list in CLAUDE.md (the only hit on the whole tree is the proper name of the USC seed competition in stage 4's line, which the rule allows): nothing. Em dashes: none, in code, comments, copy, captions or this report. Organisational we: none. No fetches, no external libraries, no raster images; the harness loads the Google Fonts stylesheet exactly as index.html does. The only words inside the scene are the number, the OLED readout (an angle, or PERFECT), and Betta and $10,000 on the cheque. Nothing brown is a fill: the rock is hsl(226, 8%, 7 to 12%), the bench #2b2c30, the floor #0d0e10; every warm tone is gold light at low alpha on top of them. Nothing from the film: no helmet, no reactor, no character, only a lamp over a bench in a cave.

## Honest flags

- The twists in stages 1 to 4 read as short twists at 520 px but as a textured dark cap at 300 px; the curls in 5 and 6 read at both. If his hair must be unmistakable at phone size the strands want to be longer and fewer.
- The face is six strokes and two pale eye shapes. It passes the 3-second test (a young Black man at a bench under one lamp) but it is a type, not a likeness; nothing in the brief could make it a likeness without a photograph, which the rules exclude.
- The free throw is drawn in a three-quarter turn of 0.6, not a true profile, so the set position puts the ball in front of his face for 0.7 s. It reads as a set, and the release and follow-through are clear, but a profile pass would be cleaner.
- Two seams in the loops are covered by crossfades rather than motion: stage 4 (the cheque returns to his hands at the loop start while the wall copy fades) and stage 6 (the sleeve fades back to the bench over the last 0.3 s as he lowers his arm). Stage 3 and 6 make a spare ball appear on the bench at the moment he looks at the laptop.
- The laptop in stage 4 shows an idle dim screen. The brief listed no screen content for that stage.
- The raster cost above is from software raster in headless Chrome under load; it has not been profiled in a visible Chrome window on this machine because the embedded Browser pane is not available to this agent.
- Stage 2 is standing, not seated (variant B is the standing full figure), so the line's "sits up straight" became stand tall, slump, snap upright. The line in STAGES says slouching, which is true either way.
- Extras on the returned API (`seek`, `still`, `stats`, `reset`) are beyond the specified surface; the orchestrator can ignore them.
- The lamp cone is three stepped polygons with vertical gradients, not a true volumetric; the banding is visible on close inspection and reads as light.
- Nothing is committed; the files are untracked in the working tree. Other agents' modified files appear in `git status` alongside these; none were touched here.
