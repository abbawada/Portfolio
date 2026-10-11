# The lab, variant A: cinematic and tight

A drawn, animated timeline of Abba building Betta, six stages in one cave:
one lamp, one bench, one figure, one number per scene. Built 2026-10-10 as
a self-contained ES module for the Betta stop; not wired in (the
orchestrator copies the winning variant to circuit/lab.js).

Files, all new, no existing file touched:

| file | what |
| --- | --- |
| circuit/lab-a.js | the module: STAGES, ACTIONS, the renderer, mountLab() |
| circuit/lab-a.css | the chrome around the canvas: number, caption, timeline tabs |
| tools/circuit/harness/lab-a.html | a 520px panel body on paper; ?stage=N, ?still=1 or ?still=seconds, ?autoplay=0, ?start=last |
| docs/circuit/v15/lab/lab-lab-a-s1.png to s6.png | each stage at 520px, dpr 2, frozen on its best second |
| docs/circuit/v15/lab/lab-lab-a-strip-s3.png, strip-s6.png | six frames 0.4 s apart through the free throw (stage 3) and the sleeve rep (stage 6), tiled 3 by 2 |
| docs/circuit/v15/lab/lab-lab-a-phone.png | stage 6 at 360px |
| docs/circuit/v15/lab/lab-lab-a-check.mjs | the Playwright contract check (copy of the scratch script) |

## What was built

**The API, as specified.** `mountLab(el, { onInteract, autoplay, start })`
returns `{ destroy(), goTo(i), play(), pause(), stages }`. Two extras the
orchestrator can ignore: `opts.still` (true, or a second into the loop)
renders one frozen, deterministic frame per stage for captures, and
`stats()` reports draw cost, static rebuild cost and the reduced and
running flags.

**The DOM.** `figure.lab` (aria-roledescription timeline) holding
`div.lab-stage` with the canvas (aria-hidden, 3:2, the container's width,
min 320px, devicePixelRatio aware up to 3) and `div.lab-number`;
`figcaption.lab-cap` (aria-live polite, aria-atomic) with `span.lab-date`
and `span.lab-line`; `nav.lab-time` with a `role=tablist` of six
`button.lab-tab[role=tab]`, the date as the label, the title as the
tooltip, roving tabindex, a dot each and one tick line through them
(current gold with a gold ring, past ink, future hollow). `destroy()`
cancels the frame, disconnects the observers, removes every listener and
empties `el`.

**The scene, 600 by 400 units scaled to the canvas.** Three layers:

1. A cached back canvas, rebuilt only on a stage change or resize: the
   rock wall as a jittered grid of near-black facets (cool graphite, each
   facet lifted and given a warm rim edge by how much lamp reaches it), the
   lamp cone as a gradient drawn in `lighter` so the warmth is light on the
   rock and never paint, the hanging lamp (dark shade, lit rim, bulb glow),
   the two shelves and whatever has been built so far, the cheque once it
   is on the wall, the forge coil far right, the laptop body from stage 3.
2. The figure, drawn each frame into an offscreen canvas and lit with a
   `source-atop` pass (warm from the lamp above, cyan from the laptop when
   it is there, darker toward the bench), then composited. Two passes: the
   far arm, torso, neck and head go under the bench; the near arm and
   whatever it holds go over the bench props.
3. A cached front canvas: the bench (graphite slab, lamp pool, worn lit
   front edge fading to the sides, near-black front, cables) and the still
   props of the stage (jar, iron stand, dumbbell, protoboard).

Dust motes drift in the cone, sparks are a small additive particle system
(gold to white, gravity, 0.4 to 0.9 s life, fired on solder beats only),
smoke is a few rising puffs while the iron is at a joint, buzzes and taps
are expanding gold rings at the wrist or buzzer.

**The figure.** A cel-shaded rig in flat shapes with three skin tones from
the brief (lit #62412e, mid #4a3226, shade #2d1c14, a warm forehead catch
#7c5339). About 7.5 heads tall by proportion, head to hips in frame, slim
with long arms (upper 76, forearm 70 units). Two-bone IK drives each arm
from a hand target; the elbow takes the lower solution nudged outward, so
a hand on the bench hangs the elbow and a hand above the head puts the
elbow out front at brow height, as a free throw does. Head yaw and pitch
move the features across the skull; the lids lower as he looks down and
open with whites and a glint for the one look at the camera per stage.
Breathing (3.8 s cycle), blinks every 2.4 to 5.2 s, a nod track, a mouth
track for the grin. Hair: stages 1 to 4 a dozen twists falling from a high
cap to the brow and temples (13 strands, three tones, one lamp catch);
stages 5 and 6 tight curls on a bumpy cap with faded sides. Outfits per
stage: navy tee, navy tee, dark tee with grey striped track pants, black
blazer over a dark tee with lapels, dark tank with striped track pants,
purple hoodie with the sleeves pushed up (a bunched cuff at the elbow,
the hood behind the neck). No logos anywhere.

**Choreography.** Each stage has a keyframe list in ACTIONS keyed by the
stage id: `[second, { params }, ease]`, the ease belonging to the segment
that ends at that key, `hold` for steps. Hand targets, wrist angles, yaw,
pitch, lean, bob, look, mouth, nod, grip and the stage's own switches (led,
spin, carX, wire, board, bar, perfect, angle, ball, fly, chq, iron, smoke,
sleeve, check) are all tracks; events (sparks, tap, long, buzz, plot, pin)
fire when the loop clock crosses them, wrap included. Every loop is 7 s.

**Autoplay.** 7 s per stage, 14 s on the last, a 0.35 s fade to black and
a 0.45 s fade in between stages (a visitor's scrub uses a shorter 0.14 s
dip). Paused while the pointer is over the figure (touch excluded) or while
focus is inside it, and for 25 s after any visitor selection. Frames run
only while the stage is on screen (IntersectionObserver) and the tab is
visible. Reduced motion: no loop, no particles, one deterministic still per
stage; scrubbing swaps instantly; flipping the media query back resumes.

**A seventh stage** is one object in STAGES (date, title, number, line,
hair, outfit, bench, shelf, laptop, cheque, action, loop, still) plus one
keyframe list in ACTIONS, or `action: 'sleeve'` to reuse one. The comment at
the end of STAGES lists the keys.

## How each fact is shown

| stage | number | the one line | what the scene shows |
| --- | --- | --- | --- |
| 1 Nov 2025, Bluetooth Car | 1 phone | A robot car on a breadboard, driven from a paired phone. | Black octagonal chassis, four knobby tyres with rotating tread notches, white breadboard with holes, red driver board, dark dev board with a blue LED, grey pouch LiPo, yellow, red and black jumpers; a phone with two joystick rings leaning on a glass jar. Loop: he pushes a yellow jumper home (0.9 s), the LED blinks three times, his far hand taps the phone, the wheels spin up, the car twitches 9 units forward and back, he looks up at the camera (5.1 to 5.9 s). |
| 2 Dec 2025, Posture Cue | 15 s | A posture monitor for a connected-devices class: an IMU on the chest, a buzz after 15 s of slouching. | Breadboard with a Photon 2 (breathing cyan LED), a blue BNO055, a round black buzzer, a tactile button, a yellow LiPo, and the OLED on a red carrier on a flying lead showing a cyan bar and an angle readout. Loop: he lifts it to his sternum, sits up (lean back, bar fills, PERFECT), slumps slowly over two seconds (head drops, bar drains, 34 degrees), two buzz rings from the buzzer at 4.7 s, he snaps upright, the look at the camera at 5.9 s. |
| 3 Jan 2026, The first free throws | 100 a second | Winter break on campus: the posture board strapped to a forearm, the first free throws read by a sensor. | The board on his right forearm under two black bands, a grey wire to the laptop, the laptop plotting a live scrolling curve, a basketball. Loop: pick up, set at the chest, eyes to the rim, dip, release with the hand above the head and the wrist flicked toward the basket, the ball arcs out top right, the curve spikes at 2.5 s, he turns to the screen, looks at the camera at 4.8 s, the next ball appears and he reaches for it. Free throw only. |
| 4 Apr 2026, Top 4 of 221 | Top 4 of 221 | USC New Venture Seed Competition: 4th of 221, a $10,000 award. | A cream board with a thin ink rule, the word Betta and $10,000 in simple type, nothing else. Loop: he holds it at his chest, raises it to the wall, his far hand presses a gold pin at 1.9 s, it stays; he steps back (lean, bob), looks up-left at it, nods twice, looks at the camera at 5 s, turns back to the bench. The cheque is in the cached wall from stage 5 on. Black blazer. |
| 5 Aug 2026, The rig | 6 firmware versions | Six firmware versions later: a protoboard he soldered himself, two IMUs on the arm, vibration motors, a real rep on a real arm. | Green protoboard with silver solder dots and four wires, two coin motors, a soldering iron on a coil stand, two blue IMU breakouts under grey tape on his left forearm and upper arm with ribbon wires to the board, a dumbbell on the floor by the bench end, the laptop with two traces (gold and cyan). Loop: iron tip to the joint, two spark bursts at 0.95 and 1.35 s with smoke, iron parked, the rigged arm raised, one tap ring at the wrist at 3.15 s, both traces spike, he grins at the laptop, the camera look at 5.5 s. Tank top, curls. |
| 6 Oct 2026, The Betta sleeve | 21 of 28 | The sleeve: a black knit arm sleeve with three grey pods. First court session, Oct 8: 21 of 28 reps buzzed. | The sleeve flat on the bench: black knit (faint diagonal weave), three soft grey pods, three cuff buttons, a LiPo at the cuff with a red and a black lead; the laptop coach card with a check mark. Loop: he solders the battery lead (sparks at 0.42 and 0.78 s), parks the iron, his far hand pulls the sleeve up his right forearm (pods appear as it covers them), picks up the ball, free throw as in stage 3, ONE long buzz ring at the wrist at 4.9 s, the check lights gold at 5.0 s, he looks up at the camera for a beat (5.8 to 6.4 s), then back to the bench. Purple hoodie, sleeves pushed up. Holds 14 s in autoplay. |

The cave shows the evolution on its own: the car is on the shelf from
stage 2, the car and the posture board from stage 4, the rig joins them
in stage 6, the cheque is on the wall from stage 5, the laptop from stage
3, the dumbbell from stage 5.

## Test results

`node docs/circuit/v15/lab/lab-lab-a-check.mjs` against the harness on
port 8651, real Chrome (channel chrome, headless), rAF hooked in an init
script to count frames. All 24 checks pass, zero page errors and zero
console errors in all five runs:

- structure: 6 tabs in a tablist, canvas aria-hidden, caption aria-live
  polite, canvas pixel width equals css width times dpr, height is 2/3 width
- frames run while visible (18 rAF calls in 600 ms; this Mac caps headless
  Chrome at 30 fps, rAF interval 33.3 ms)
- ArrowRight scrubs through every stage: index, aria-selected, the one
  tabindex 0, the date, the number and focus all follow; wraps to the first
  after the last; End then ArrowLeft lands on Aug 2026; Enter selects the
  focused tab; a click selects
- onInteract('scrub') fired once per keyboard selection (5 for 5)
- autoplay advances from stage 1 to 2 within 8.6 s; a hover over the stage
  holds it for 8.6 s more; a scrub (then focus dropped) holds it 25 s
- reduced motion via page.emulateMedia: 0 rAF calls in 700 ms, scrub still
  swaps (Dec 2025 after 100 ms), still 0 calls after the scrub; flipping
  back to no-preference resumes the loop
- 360px phone, dpr 3: stage 328px wide, no horizontal scroll, no tab label
  overflow, frames run; scrolled 3000px out of view the frames stop (0 in
  600 ms) and resume on return
- destroy(): the container has zero children and empty innerHTML, 0 rAF
  calls in the 700 ms after

## Frame cost

Measured inside the module with performance.now() around the draw, at
520px, real Chrome:

| measure | dpr 1 | dpr 2 |
| --- | --- | --- |
| draw, average per frame (stage 5, sparks and smoke, 3 s) | 0.34 ms | 0.33 ms |
| draw, max per frame (same run) | 1.0 ms | 0.9 ms |
| draw, 26 s autoplay run through four stages, 794 frames | | avg 0.30 ms, max 4.1 ms (one outlier) |
| static rebuild on a stage change (both cached layers) | | 0.2 to 1.1 ms |
| reduced-motion still (rebuild plus a deterministic run to the chosen second) | | 0.3 to 0.8 ms |

Well under the 4 ms budget. Note these are CPU issue times for a GPU
backed canvas; the two `source-atop` light passes are confined to the
figure's bounding box to keep them cheap.

## Honest flags

- **Arrow keys select as they move.** The tabs use automatic activation
  (WAI-ARIA's default for cheap panels): ArrowLeft/Right, Home and End move
  focus and select; Enter and Space select too. The brief read as "arrows
  move, Enter selects"; if manual activation is wanted it is one line in
  `onTabKey` (drop the select on arrows, keep the focus move).
- **The posture board reaches the shelf in stage 4, not after stage 2.**
  Stage 3 has that same board strapped to his forearm, so it cannot also
  be on the shelf; it goes up once it comes off the arm. The car goes up
  after stage 1 and the rig after stage 5 as asked.
- **The loop resets when a visitor holds a stage.** Each stage loops every
  7 s, so a visitor parked on stage 6 sees the sleeve back on the bench
  every 7 s, and on stage 4 the cheque back in his hands. Autoplay's cut
  hides it; a per-stage "second loop" variant would be the fix if it reads
  wrong.
- **Hover and focus both pause autoplay, so a mouse click on a tab pauses
  until focus leaves the figure**, not just 25 s. That is the rule as
  written; it means a mouse user who clicks and then reads keeps the stage
  until they click elsewhere.
- **The far arm looks stiff when it rests on the bench** (stage 4
  especially): the shoulder-to-bench reach is near the arm's length so the
  IK gives an almost straight arm. Lowering the far rest target a few units
  would bend it; left as is to keep the hands on the bench.
- **The figure is a drawn likeness in flat shapes**, built to the brief's
  proportions, tones and hair, not a portrait. The stills pass my three
  second test ("a young Black man at a bench under one lamp, building
  something"); the hair and face are Abba's call.
- **The ball crosses the lamp** for a few frames after release (it launches
  from above his head, right under the shade). It reads as the ball
  crossing the light; if it reads as a collision, the launch point and the
  flight curve are three numbers in `drawFrame`.
- **Canvas type depends on the page fonts.** The OLED's PERFECT and the
  cheque's Betta and $10,000 ask for Chakra Petch and Schibsted Grotesk;
  index.html loads them, the harness waits on document.fonts before
  capture. If the module is mounted before the fonts arrive the first
  static layer uses the fallback face until the next stage change or
  resize.
- **Headless Chrome ran at 30 fps on this Mac**, so the frame counts in the
  check are lower than on a 60 Hz display; thresholds are set for that.
- **Long numbers shrink.** Numbers over 12 characters ("6 firmware
  versions") get `.is-long` and a smaller size so they stay on one line
  and clear the cheque.
- **lab-a.css must be loaded by the page** (the harness links it directly;
  index.html would need a link or the rules folded into circuit.css).
- **Variant A's framing is tight**: head to hips, the bench across the
  lower third, little room above the lamp. The cheque wall slot, the
  shelves and the number corner are placed around that; moving the figure
  means moving the hand targets in ACTIONS with it.

## Fix round 1 (2026-10-10)

Fixer for module lab, round 1, applying `lab-r1.json` (28 findings), the
judge's verdict (`lab-judge.json`: 9 grafts from lab-b, 13 must-fix items)
and the sleeve and laptop facts from Abba's photos. An earlier fixer run
had landed most of the code changes and was cut off before capturing or
reporting (its stills were byte-identical across seconds, see Failures);
this run finished the list, added the real sleeve, the coach strip and the
stylesheet self-link, verified everything and wrote this section. Files
touched: circuit/lab-a.js (1634 to 1767 lines), circuit/lab-a.css,
tools/circuit/harness/lab-a.html, docs/circuit/v15/lab/lab-lab-a-check.mjs
(the module's own check, updated to the new DOM), captures in
docs/circuit/v15/lab/fix-*.png. circuit/lab.js and circuit/lab.css are
copies made for the index.html check and are identical to lab-a.*.

### Findings, one by one

| # | sev | finding | what was done |
| --- | --- | --- | --- |
| 1 | major | sampler returned the first key's value before its time | `sample()` now holds `DEFAULTS[k]` before a track's first key (a snap at the key); the look, PERFECT, LED and smoke tracks start off. Still seconds re-picked per stage (`still:` in STAGES). |
| 2 | minor | a mouse click on a tab paused autoplay for good | focus pauses autoplay only when it is keyboard focus (`:focus-visible`, with the last input kind as the fallback); a mouse click gets the 25 s pause like any scrub. Decision taken as suggested. |
| 3 | minor | blinks dead after reduced motion flips off | `onMq` re-arms `blinkNext`; `renderStill()` restores it too. |
| 4 | minor | a DPR change with no layout change left the canvas blurry | a `matchMedia('(resolution: Ndppx)')` change listener, re-armed after each change, calls `resize()`; removed in `destroy()`. |
| 5 | minor | `destroy()` emptied the whole container | `fig.remove()` removes only this instance's figure. |
| 6 | minor | harness `?start=last` undone by `goTo(0)` | the harness only calls `goTo` when `?stage` is above 1. |
| 7, 23 | major | autoplay drove an aria-live region every 7 to 14 s | the live region is the `role=tabpanel` wrapper (stage, number, caption); `select(i, true)` sets it `polite`, autoplay's own cuts set it `off`. Verified: zero announcements over an autoplay run with nothing focused. |
| 8 | minor | focus landed on a tab still `aria-selected=false` for 140 ms | `markTabs(i)` runs at select time; only the canvas waits for the cut. |
| 9 | minor | "100 a second" never reached assistive technology | `.lab-number` is no longer aria-hidden; it sits inside the tabpanel, so a scrub reads "100 reads a second" with the caption. |
| 10, 16 | minor, major | the number ran into the lamp on stages 3, 4 and 5 | the lamp moved to x = 240 (one constant, `LAMP`), the number is B's two-line chrome at top left with `max-width` 34 % and one `0 1px 2px` shadow. Measured at 520: the widest box ("6 / FIRMWARE VERSIONS") ends at x = 193 of 600 units, under the judge's 200; the shade starts at 198. At 360 the label wraps to two lines (`max-width` 28 % under 420 px) and ends at x = 130. |
| 11, 19 | minor, major | third person, 25-word captions | first person or no person, 7 to 10 words, the number only in the corner: "A robot car on a breadboard, driven from my phone." / "A posture board on my chest: slouch and it buzzes." / "Winter break: the posture board on my forearm, free throws." / "USC New Venture Seed Competition, pinned to the wall." / "A protoboard I soldered, two IMUs, motors on my arm." / "The sleeve, first court session, Oct 8." aria-label "The lab: building Betta, 6 stages". Abba's words to confirm. |
| 12 | minor | "15 s of slouching" vs the shelf's "the second you slouch" | not changed: the 15 s came from the brief and cases.js and projects.html are outside this module's files. Flag for Abba: which one is right. |
| 13 | minor | tabs pattern incomplete, nav landmark | `role=tabpanel` with `aria-labelledby` the current tab, `aria-controls` on every tab, a plain div instead of nav; the stage title is visible in the caption kicker. |
| 14 | minor | gold dot 2.23:1, 9 px labels on phones | the selected dot's border and ring are `--accent-ink` (4.56:1); labels stay 0.625rem at every width, stacked month over year (judge's graft). |
| 15 | blocker | the release and the ONE long buzz were drawn on the lamp bulb | `LAMP = [240, 36]`; everything (cone, polygon, glow, light pass, dust, bench pool) derives from it. The release hand at x = 312 clears the shade (198 to 282) by 30 units; the long ring is centred on the wrist at the top right of him. |
| 17 | major | the forge coil read as a copyright badge | gone; the judge's boxed heater instead (a brick box, three ember bars that breathe, a dim glow), far right. |
| 18 | major | two numbers on screen in four stages | the cheque shows "Betta" and the signature rule only; the OLED shows the cyan bar only; stage 4's corner is "Top 4 / OF 221". |
| 20 | major | the number's type is not the site's number style | not applied as written: the judge's graft asks for B's chrome (Chakra Petch italic 700 numeral, small uppercase letter-spaced label), and that is what the number is. The reviewer's alternative (Schibsted Grotesk 700) would make the corner a second display voice next to the serif line; the label under the numeral is the site's kicker voice. Abba's call if the stat headline and this should match faces. |
| 21 | major | puppet arms, locked elbows, a wire across the chest | `ARM.w` 18 (was 15.5 / 13.5), each arm one round-joined polyline in three tones with a soft elbow crease; rest hands `[292, 280]` and `[356, 282]` so both elbows bend; the stage 3 lead runs behind him in graphite with a faint lit side. |
| 22 | major | stage 1 had no visible action | the car drives 60 units off and back (2.8 to 4.8 s), tyres spinning, the phone's joystick ring shifted while it drives, LED r 3 with a 16-unit glow, the near hand lifted off the car. |
| 24 | minor | lit rock tinted in its own fill, hard-edged cone | facets are neutral `rgb(t, t, t+4)`; four nested cones in `lighter` feather the edges. Sampled at 520 (stage 4, 3.5 s): cone top (83, 73, 59), R minus B 24; left of the head (77, 65, 46), R minus B 31; far wall (21, 21, 25); bench front (16, 17, 20). The judge's limit was 45. |
| 25 | minor | 9 px labels with a redundant year | stacked month over year per the judge's graft (the reviewer's month-only alternative not taken: the judge chose the stack and it keeps the year readable without the caption). |
| 26 | minor | parked on a stage, the loop undid the stage every 7 s | a settled loop per stage (`again` keys): from the second pass the cheque stays pinned and the sleeve stays on, and only the beat repeats (stage 4: look at the cheque, nod, look at the camera; stage 6: the rep). A 0.3 s crossfade covers the loop's wrap. |
| 27 | minor | the slump was too small to read | `geom()`: a slouch drops the near shoulder 7, the far 9, the neck 6 and the head 16 units and shifts them forward 20; the OLED bar drains with it. |
| 28 | minor | the reduced-motion still for stage 6 was the collision frame | moot after the lamp move; stage 6 still is 4.9 s (the release, the ball clear of the lamp). |

### Judge's grafts from lab-b

All nine taken: the two-line number chrome; the date plus title kicker
(`NOV 2025  BLUETOOTH CAR`); stacked tabs; the idle dim laptop in stage 4;
the ball flight inside the frame with the three-quarter turn (launch from
the hand at release, apex at y = 30 units, exit the right edge at y = 112);
the boxed heater; the hoodie drawstrings; the 0.3 s crossfade at the loop
seam; the jar and coil of wire on the shelf from stage 1.

### Judge's must-fix, the rest

- Stage 3 ball: no longer clipped; frames 1.3 to 2.5 s in `fix-strip-s3.png`.
- Stage 6 spare ball: the iron stand moved to x = 200, the ball rests at 262, the sleeve lies from 292 to 432; nothing under the iron.
- Rest arms: both elbows bend (stage 4 `fix-s4-t3.5.png`).
- Joint caps: arms are one polyline; the short tee sleeve is now a shape with a round shoulder and a flat hem (`shortSleeve()`), so no capsule end reads as a joint (stage 1 `fix-s1-t3.3.png`).
- Neck in 5 and 6: short and wide, the tank straps on the shoulders.
- Twists: nine thicker twists with gaps, two over each ear, a part and a crown catch.
- Stage 3 guide hand: `RELEASE.fh` is `[356, 74]`, beside the ball with the elbow out, a visible forearm (`fix-s3-t1.45.png`).
- Stage 2 slump: shoulders drop and the back rounds (`fix-s2-t4.6.png`).
- Stage 5 ribbon: down the inside of the arm to the wrist, then to the board.
- 360 px tabs: stacked.

### Sleeve and laptop facts (Abba's photos)

- The sleeve is now the real one. Flat on the bench (`drawSleeveFlat`): a plain matte black compression sleeve 140 units long, tapering to the cuff, the thumbhole loop at the left end, the flap pocket on the upper-arm end, a gold Betta mark on a black patch across the forearm (a small gold shield with a figure reaching up and the word Betta in simple gold type, nothing else). While he solders (0 to 1.35 s) the flap is up and the sensor board shows in the pocket's mouth; the sparks land on it; then the flap closes. No pods, no buttons, no LiPo. Reads at 520 (`fix-s6-t0.5.png`).
- Worn (`drawSleeveOnArm`, drawn after the hand): the whole right arm black from mid-bicep to the knuckles, the thumb through the cuff in skin, the fingertips in skin, a faint cuff line at the wrist, the pocket on the upper arm, the gold mark on the forearm at 0.55 scale. He pulls it on from the hand up (1.8 to 2.6 s). The hoodie sleeves are pushed up to mid-upper-arm (`OUTFITS.hoodie.sleeve` 0.5, the bunched cuff follows it), so the far arm shows bare forearm. `fix-s6-t3.2.png`, phone `fix-s6-t3.2-phone.png`.
- The laptop in stage 6 is the coach page: near-black, a strip of five words in Chakra Petch (PULSES, SET, SHOT, HELD, GOOD REP), paper at 0.3, the current one gold with a small gold tick, past ones at 0.55; a big gold check with a glow over the dimmed strip when the long buzz fires. Timing per throw (t0 the pick-up): Pulses t0+0.05, Set t0+0.72, Shot t0+1.4, Held t0+1.72, Good rep t0+1.9 (with the long buzz), the check t0+2.1. The screen was widened to 98 by 73 units so 10-unit type fits; at 520 the words are 8.7 px uppercase and legible (`fix-s6-t5.5-panel.png` at 600 is the panel width). No other words on the screen.
- Haptics on the sleeve stage, drawn as rings at the wrist: four taps that speed up (t0+0.18, 0.4, 0.56, 0.66), ONE firm buzz at set (t0+0.72), ONE long buzz after release (t0+1.9). Silence otherwise.
- Hair: stages 5 and 6 already short tight curls with a fade; stage 6 the purple hoodie with the sleeves pushed up and the sleeve on the right (near) arm.

### Stylesheet

Nothing on index.html links lab.css. `ensureStyles()` in the module now links the stylesheet named after its own URL (lab-a.js links lab-a.css, lab.js links lab.css, with the same `?v=` query) unless the page already has a link with that basename, the way circuit/skydive.js does; the stage's `position`, `overflow`, `aspect-ratio` and the canvas's `display`, `width`, `height` are set inline so a late stylesheet cannot inflate the panel.

### Checks and captures

- `node docs/circuit/v15/lab/lab-lab-a-check.mjs` (LAB_PORT=8661, real Chrome headless): ALL PASS, 24 checks, zero page errors and zero console errors in all five runs. The check now reads the date text node and the tab's aria-label, and expects the tabpanel with `aria-controls` and `aria-labelledby` instead of a live figcaption. Frame cost: 26 s autoplay at dpr 2, 1586 frames, avg 0.29 ms, max 2.2 ms; stage 5 at dpr 2, avg 0.29 ms, max 4.7 ms; dpr 1 avg 0.39 ms (one 12.9 ms first-paint outlier). Headless Chrome ran at 60 fps this time (36 rAF calls in 600 ms).
- index.html with lab.js and lab.css copied: open the Betta stop, the lab mounts in the panel, `link[href="circuit/lab.css?v=15.0"]` is added by the module, stage 519 px wide in the 600 px panel and 320 px at 360 with no horizontal overflow, 6 tabs, zero errors at both widths (`fix-index-desktop.png`, `fix-index-phone.png`; script scratchpad/lab-fix/integrate.mjs).
- Stills at 560 (dpr 2): fix-s1-t3.3, fix-s2-t4.6, fix-s3-t1.45, fix-s3-t1.9, fix-s4-t3.5, fix-s5-t1.0, fix-s6-t0.5, fix-s6-t3.2, fix-s6-t4.9, fix-s6-t5.5; strips fix-strip-s3 and fix-strip-s6 (eight frames each); phone fix-s5-t1.0-phone and fix-s6-t3.2-phone (360, dpr 3); panel fix-s6-t5.5-panel (600). The earlier run's fix-strip-s1, s2, s4, s5 and fix-s5-t3.5 are kept (their code paths did not change).
- Hard rules: grep over lab-a.js, lab-a.css and the harness finds no banned word (the one "Venture" is the proper name New Venture Seed Competition), no em dash, no fetch, no import, no raster.

### Failures while working

- `ls --time-style=full-iso` is not a macOS ls flag (exit 1): used `stat -f '%Sm %z %N'` instead.
- The earlier fixer's stills `fix-s3-t1.45/1.9/4.5.png` and `fix-s6-t2.3/5.2.png` were byte-identical (md5 checked), which looked like a broken still path. Probed on port 8661 (scratchpad/lab-fix/probe-still.mjs): every second renders a distinct frame with zero errors, so the code was fine and the captures were stale; the identical files were deleted and recaptured.
- The baseline contract check failed five checks (arrow right scrubs every stage, wraps to first, End then ArrowLeft, click selects, reduced motion scrub swaps) and the structure check: the script read `.lab-date` textContent (now date plus title), the focused tab's textContent (now stacked month and year) and a live figcaption (now the tabpanel). Behaviour was correct; the check was updated to the date text node, the tab's aria-label and the tabpanel, then passed.
- `diff` exited 1 while confirming the docs copy of the check script: the only difference was the usage comment I changed on purpose; the bodies are identical.

## Verify round 1 (2026-10-10)

Verifier for module lab, round 1. Reproduced every finding in
`lab-r1.json` on the harness (port 8651, real Chrome headless) and on
index.html with the Betta stop open at 1200 (the 600 px panel, stage
519 px) and at 360 (stage 320 px). Captures in
docs/circuit/v15/lab-verify1/ (v1-*.png); scripts in
scratchpad/lab-verify1/ (v1-battery.mjs, v1-shots.mjs, v1-shots560.mjs,
v1-index.mjs, v1-probe.mjs, v1-dpr2.mjs, v1-phone-probe.mjs).

Verdict: fix. The lab's own blockers and majors are all gone and no page
error appeared anywhere; the one new major is in the panel integration,
not in the module's three files.

### Findings, re-checked

| # | sev | result |
| --- | --- | --- |
| 1 | major | gone. Stage 1 from a known loop clock: 0 LED-on fills in the first 0.6 s, LED on from 1.0 s; eye whites 0 and calm lids 37 in the first 0.6 s; stage 2 no PERFECT fill in the first 0.7 s; stage 5 iron cold in the first 0.6 s. Stills v1-f1-*.png. |
| 2 | minor | gone. A mouse click on the 3rd tab, pointer moved off: index moved on by 34 s. Keyboard focus on a tab still holds autoplay past 25 s. |
| 3 | minor | gone. Blinks in 15 s: 32 fresh, 32 after reduce then no-preference, 32 after a scrub on top. |
| 4 | minor | gone, with a caveat on the repro: headless Chrome's CDP DPR override flips `(resolution: 1dppx)`.matches but fires no change event, so the reviewer's repro cannot see the fix. Dispatching the change the browser sends on a real display move (v1-dpr2.mjs) re-rasters the canvas 520 to 1040, re-arms the listener on `(resolution: 2dppx)`, and destroy() removes it. |
| 5 | minor | gone. Mount A, mount B, A.destroy(): 6 tabs and one figure left, B running. Listener ledger clean after both destroy. |
| 6 | minor | gone. ?still=1&start=last lands on Oct 2026. |
| 7, 23 | major | gone. 18 s untouched: two autoplay changes, panel aria-live off at both, figcaption not live; a keyboard scrub sets it polite. Same on index.html. |
| 8 | minor | gone. ArrowRight from the last tab: the focused tab reads aria-selected true and tabindex 0 at 0 and 60 ms. |
| 9 | minor | gone. The number is not aria-hidden and sits in the tabpanel (aria snapshot: "1 phone Nov 2025Bluetooth Car A robot car..."). |
| 10, 16 | minor, major | gone. Number box right edge in scene units, shade starts at 198: 520 px 81 / 144 / 165 / 154 / 195 / 157; 560 px 77 / 136 / 155 / 146 / 183 / 151; 360 px 91 / 167 / 191 / 154 / 195 (two lines) / 157. The label sits under the shade's level (y about 70 units); one 0 1px 2px shadow. Zoom v1-zoom-number-lamp-s5-520.png. |
| 11, 19 | minor, major | gone. Lines 7 to 10 words, no he, no number restated; aria-label "The lab: building Betta, 6 stages". |
| 12 | minor | remains, Abba's call: "15 s of slouching" here, "the second you slouch" on the shelf (cases.js line 66, projects.html line 54). |
| 13 | minor | gone. tabpanel labelled by the selected tab, aria-controls on all six, no nav, the title visible in the kicker. |
| 14 | minor | gone. Selected dot ringed in accent-ink rgb(138,107,47); month 10 px, year 9 px at 360, no overflow. |
| 15 | blocker | gone. LAMP [240, 36]: the release hand at x 312 is 70 units right of the bulb; the long ring is centred on the wrist (v1-zoom-longbuzz-s6.png, v1-strip-s6-rep.png); the ball flies from the hand to the right edge inside the frame (v1-strip-s3-flight.png). |
| 17 | major | gone. The coil is gone; a brick box with three ember bars sits far right. See the new minor below. |
| 18 | major | gone. Canvas text over all six stills and a full sleeve loop: Betta, PULSES, SET, SHOT, HELD, GOOD REP. No digits. |
| 20 | major | resolved by the judge's graft (B's two-line Chakra chrome) and by the panel: stops.js no longer carries the Schibsted stat headline, so there is no second number voice in the Betta panel. Abba's call if that headline returns. |
| 21 | major | gone. Both elbows bend at rest (v1-f21-arms-s4-t3.5.png), the arms are one polyline, the stage 3 lead runs behind him. |
| 22 | major | gone. The car drives about 57 units right and back with the tyres turning (v1-strip-s1-drive.png). |
| 24 | minor | gone. Stage 4 at 3.5 s: cone top (83,74,59), left of the head (79,68,51), far wall (17,17,21). |
| 25 | minor | gone per the judge (stacked month over year). |
| 26 | minor | gone. Stage 6 second pass: 120 cloth strokes per second, no hot iron; stage 4 second pass: the cheque stays pinned (v1-f26-again-*.png). |
| 27 | minor | gone. The shoulders drop and the back rounds over 3.2 to 4.7 s (v1-strip-s2-slump.png). |
| 28 | minor | gone. Reduced motion, stage 6: 0 frames, the still at 4.9 s shows the ball in flight clear of the lamp (v1-reduced-s6-520.png). |

### index.html, as a visitor

Both widths: the lab mounts in the Betta panel, lab.css?v=15.0 linked
by the module, stage 3:2 (519 by 346, 320 by 213), no horizontal
overflow, 72 rAF calls in 600 ms, a click lands on Apr 2026 and sets
the panel polite, ArrowRight scrubs to Aug 2026 with focus on that tab,
Escape closes the stop and tears the lab down (0 .lab left), reopening
mounts one lab with one stylesheet link. Zero page errors, zero console
errors.

### New

- major, circuit/circuit.css (integration, not the module): the two
  links under the lab render as the run-on "The full casebetta.live"
  (Newsreader, no padding, no border, zero gap: x 641 to 729 and 729 to
  793 at 1200). `.ring-pill` and `.ring-lab-links` exist only in
  scratchpad/integration/panel-live.css, not in circuit.css.
  v1-zoom-index-links.png.
- minor, lab-a.js: the heater's mouth (a 30 by 34 rounded box with three
  equal orange bars) reads as a glowing menu icon at panel size
  (v1-zoom-heater-520.png); a mouth wider than tall, or a grate of five
  thin bars, breaks the silhouette.
- minor, lab-a.js: at release (t0 + 1.4 s, stages 3 and 6) the ball
  sits on the crown of the head between the hands (v1-zoom-release-s6.png).
- minor, lab-a.js: STAGES[2].still is 2.5 s, after the ball has left the
  frame; the reduced-motion still shows arms up with no ball. 1.9 s shows
  the ball in flight.
- minor, lab-a.js: the long ring grows to r 40 from a wrist 37 units
  from the shade's lower-right corner, so its last 40 percent crosses
  that corner at low alpha.
- minor, lab-a.js: the kicker's date and title spans have no space
  between them in the accessible text ("Nov 2025Bluetooth Car").
- note: on a 360 by 780 phone the panel is a 54vh sheet with a sticky
  header, so the 213 px stage fits whole only in a 30 px scroll band;
  the first view shows the number, the lamp and the figure to the chest
  with the bench cut (v1-index-phone-panel-top.png). Earlier index phone
  captures (mine and the fixer's fix-index-phone.png) looked cropped
  because scrollIntoView slid the stage under that sticky header; the
  stage box itself is 320 by 213.

### Failures while working

- The first read chain exited 1: `ls` of docs/circuit/v15/lab-verify1/ before it existed. Made the folder, re-ran.
- Battery F1 "LED off" failed on a window artifact (the 600 ms window straddled loopT 1.0 s after a scrub dip). Re-measured from a known loop clock in v1-probe.mjs: 0 fills, then the LED from 1.0 s.
- Battery F4 (CDP DPR override) failed: Chrome's emulation flips matches without a change event. Verified the listener with the module's own MediaQueryList and a dispatched change (v1-dpr2.mjs).
- Battery F26 "zero errors" flagged a willReadFrequently console warning raised by my own getImageData sampling; lab-a.js has no getImageData.
- My "560" captures were 520 (the harness wrap caps at 520). Re-captured with an injected `.harness-wrap{width:560px}` (v1-s*-560w.png).
- v1-dpr2.mjs threw reading clientWidth of null after destroy(). Made the reader null-safe, re-ran.
- `/usr/bin/python3 -I` could not import PIL (isolated mode skips the user site where Pillow lives). Ran /usr/local/bin/python3 without -I on my own captures.
- zsh expanded `--include=*.css` as a glob ("no matches found"). Quoted it.
- The index phone element captures looked cropped (sticky header over a scrolled stage). Probed the box and recaptured at scrollTop 0.

## Fix round 2 (2026-10-10)

Fixer for module lab, round 2, applying the seven reviewed findings from
verify round 1, re-checking the judge's verdict and the sleeve and laptop
facts after the changes. Files touched: circuit/lab-a.js (eight edits),
circuit/lab-a.css (two edits); the harness is unchanged. circuit/lab.js and
circuit/lab.css were re-copied from lab-a.* for the index.html checks and
are byte-identical to them. Captures in docs/circuit/v15/lab-fix2/
(fix2-*.png), the capture script beside them (fix2-shots.mjs, a copy of
scratchpad/lab-fix2/shots.mjs).

### Findings, one by one

| # | sev | finding | what was done |
| --- | --- | --- | --- |
| 1 | major | the two pill links under the lab render as the run-on "The full casebetta.live" (circuit.css has no `.ring-pill` or `.ring-lab-links`) | circuit.css is not one of this fixer's files, so the rules ride on lab-a.css instead: the exact `.ring-lab`, `.ring-lab-links` and `.ring-pill` block from scratchpad/integration/panel-live.css, appended with a comment saying to drop it once circuit.css carries them. The module links its own stylesheet on index.html, and these are the lab's own links, so the fix lands wherever the lab does. Same selectors and values as panel-live.css, so folding that file into circuit.css later changes nothing in the cascade. Measured on index.html with the Betta stop open: two pills, `display: flex` (inline-flex blockified as flex items), radius 999px, 14.4px side padding, 1px hairline, Chakra Petch, 36px tall, a 10px gap, at 1200 (x 641 to 772 and 782 to 885) and at 360 (20 to 151 and 161 to 264); no horizontal overflow at either width. `fix2-index-desktop-links.png`, `fix2-index-phone-links.png`. The DOM textContent still reads "The full casebetta.live" because stops.js puts no whitespace between the two anchors; each is its own link in the accessibility tree, so nothing to fix in the module. Orchestrator: fold panel-live.css into circuit.css as the finding asks, then the block at the end of lab.css can go. |
| 2 | minor | the heater's mouth read as a glowing hamburger menu icon | the mouth is now low and wide (38 by 20 units at 559, 212, in `paintBack`) and the per-frame ember is a glow low in the mouth behind a grate of five thin dark bars (2.4 units wide, every 7 units), plus a faint spill (r 30) onto the bricks. No horizontal bars anywhere, so no menu glyph. `fix2-zoom-heater-s6.png`, `fix2-zoom-heater-s1.png`, and in the whole frame `fix2-s6-t0.5.png`. |
| 3 | minor | at release the ball sat on the crown between the hands | the held ball now rides from between the hands (pick-up, set) up onto the shooting hand's fingertips as the hands pass the shoulders (`up` blends from midY 150 to 70): at release it is at `near.tip` plus 12 along the hand, which with the wrist at (320, 58) puts the ball's centre at (346, 45), its underside at 58 against the crown at 65 and its left edge at 333 against the head's centre at 325: above the brow and in front of it. The flight launches from the same point (`LAUNCH = [346, 45]`), so there is no jump at the hand-off. `fix2-zoom-release-s6.png` (4.75 s), `fix2-zoom-release-s3.png` (1.4 s). |
| 4 | minor | stage 3 froze at 2.5 s, after the ball had left the frame | `STAGES[2].still` is 1.9 s: the ball in flight at the top right (494, 48), the board on the forearm, the spike on the plot. Reduced-motion run on ?stage=3: 5 draws, no frame loop, the still shows the throw. `fix2-reduced-s3.png`, `fix2-s3-t1.9.png`. |
| 5 | minor | the long buzz ring's last frames crossed the shade's lower-right corner | both halves of the suggestion: `RELEASE.rh` is [320, 58] (44 units from the corner at 282, 36, was 37) and the long ring grows to r 34 (was 40), so the ring ends 10 units short of the corner at its largest; it still reads bigger and twice as long as the set buzz (r 24, 0.5 s). `fix2-zoom-longbuzz-s6-t5.6.png`, `-t5.8.png`, `-t6.0.png`; `fix2-strip-s6.png`. |
| 6 | minor | "15 s of slouching" against the shelf's "cues you upright the second you slouch" | not changed, as in round 1: the 15 s is from the brief, and cases.js and projects.html are outside this module's files. Still Abba's call which behaviour the device has; whichever way he decides is one string in STAGES[1] or one in cases.js and projects.html. |
| 7 | minor | accessible text ran the date into the title ("Nov 2025Bluetooth Car") | a space text node between the date node and the title span; `.lab-title`'s margin dropped from 0.9em to 0.6em so the visible gap stays about the same. Aria snapshot of the tabpanel now: "100 reads a second Jan 2026 The first free throws Winter break: ...". The check script still reads the date from `.lab-date.firstChild`. |

### Judge's verdict and the photo facts, re-checked

All nine grafts and the thirteen must-fix items landed in round 1; the
ones my edits touch were re-measured. The ball flight: from the fingertips
at (346, 45), P1 (440, -4), exit (612, 112); the apex is y 30.5 at u 0.30
(the judge's floor was 30), the ball's top at 17, so never clipped and
never over the lamp (the shade ends at x 282). The number corner, the
spare ball, the rest arms, the neck, the twists, the slump, the cone
colour and the ribbon are untouched since verify round 1. The sleeve on
the bench and on the arm, the coach strip and the check were re-captured
after the release change and still match the photos: flat, black, the
gold mark reading, the flap pocket open while the lead is soldered
(`fix2-s6-t0.5.png`); worn from mid-bicep to the knuckles with the thumb
through the cuff (`fix2-s6-t4.75.png`); PULSES, SET, SHOT, HELD, GOOD REP
lighting in order and the big check on the long buzz (`fix2-strip-s6.png`).

### Checks and captures

- `LAB_PORT=8663 node docs/circuit/v15/lab/lab-lab-a-check.mjs` (real Chrome headless): ALL PASS, 24 checks, zero page errors and zero console errors in all five runs. Frame cost: 26 s autoplay at dpr 2, 1606 frames, avg 0.46 ms, max 1.7 ms; stage 5 dpr 1 avg 0.34 ms, dpr 2 avg 0.29 ms.
- fix2-shots.mjs: 29 browser contexts (ten stills, sixteen strip frames, the reduced-motion run, the kicker probe, index.html at 1200 and 360), zero page errors and zero console errors in every one.
- Stills at 520 (dpr 2): fix2-s1-t3.3, s3-t1.4, s3-t1.45, s3-t1.9, s6-t0.5, s6-t4.75, s6-t4.9, s6-t5.6, s6-t5.8, s6-t6.0; zooms: heater (s1, s6), release (s3, s6), long buzz (5.6, 5.8, 6.0); strips: fix2-strip-s3 (0.6 to 2.7 s) and fix2-strip-s6 (3.9 to 6.0 s), eight frames each; fix2-reduced-s3; index: fix2-index-desktop-links, -lab, -page and fix2-index-phone-links, -lab, -page.
- index.html, Betta stop open: the lab mounts (stage 519 px at 1200, 320 px at 360), lab.css linked by the module, zero errors at both widths.
- Hard rules: grep over lab-a.js, lab-a.css and the harness finds no banned word (the one "Venture" is the proper name New Venture Seed Competition), no em dash, no fetch, no import statement (only `import.meta.url` for the stylesheet), no raster.

### Failures while working

- `echo ===` as a separator in a zsh command exited 1 ("== not found": zsh expands a leading `=` as a command path), which also hid the judge JSON behind a truncated read. Quoted every separator and re-read the file on its own.
- shots.mjs: `page.click('.ring-pin[data-id="betta"]')` timed out at 1200 by 900 because the world's `.ring-broadcast` tower code (BLU, SKY) sits over the pin and intercepts the pointer. Opened the stop with a JS click, the way the verifier's scripts do, and re-ran.
- shots.mjs: `page.screenshot({ clip })` of the links threw "Clipped area is either empty or outside the resulting image": the links sit below the fold inside the scrolling panel, so the viewport-relative box was off the image. Switched to element screenshots (`locator.screenshot()` scrolls into view) and re-ran; all three runs' stills were regenerated each time.

## Verify round 2 (2026-10-10)

Verifier for module lab, round 2. Reproduced the seven findings from
verify round 1 on the harness (port 8651, real Chrome headless) and on
index.html with the Betta stop open at 1200 by 900 (the 600 px panel,
stage 519 px) and at 360 by 780 (stage 320 px). Captures in
docs/circuit/v15/lab-verify2/ (v2-*.png, 69 files); scripts in
scratchpad/lab-verify2/ (v2-harness.mjs, v2-index.mjs, crop.py,
sheets.py; outputs v2-harness.out, v2-index.out, crop.out, check.out).

Verdict: pass. The one major is gone as a visitor sees it, five of the
six minors are gone, one minor stays on Abba's call, and one minor note
on where the pill rules live. Zero page errors and zero console errors
in every context: 30 harness contexts, 2 index contexts, and the
module's own contract check (LAB_PORT=8651 node
docs/circuit/v15/lab/lab-lab-a-check.mjs: ALL PASS, 24 checks, five runs).

### Findings, one by one

| # | sev | was | now |
| --- | --- | --- | --- |
| 1 | major | the two pill links under the lab rendered as the run-on "The full casebetta.live" | gone on the page. index.html, Betta stop open: `.ring-lab-links` display flex, gap 10px; each `.ring-pill` display flex (a flex item), 999px radius, 1px solid hairline, Chakra Petch 11px uppercase, 36px tall, padding 6.4px 14.4px, paper on paper; at 1200 x 641 to 772 and 782 to 885, at 360 x 20 to 151 and 161 to 264; no horizontal overflow at either width. The accessibility tree reads two links, "The full case" (betta.html) and "betta.live". Tab from the last timeline tab lands on the first pill with a visible outline. The rules came in on lab.css (byte-identical to lab-a.css), linked by the module, not circuit.css, which still has no `.ring-pill` or `.ring-lab-links`: see the note below. v2-index-desktop-links.png, v2-index-phone-links.png, v2-index-desktop-page.png, v2-index-phone-page.png. |
| 2 | minor | the heater's mouth read as a hamburger menu icon | gone. A low wide mouth (38 by 20 units at 559, 212) with five thin dark vertical bars over a breathing ember glow and a faint spill onto the bricks: a grate on a furnace, no horizontal bars anywhere. v2-zoom-heater-both.png (stages 1 and 6), and at panel size in v2-sheet-560.png. |
| 3 | minor | at release the ball sat on the crown between the hands | gone. Pixel measure of the ball (its three drawn oranges) at stage 6, 4.7 s and stage 3, 1.4 s: centre (345.9, 45.5), underside y 58, left edge x 333.5, so above the brow and in front of it with the fingertips between the ball and the head; at 4.6 s it already rides on the fingertips (centre 345.6, 52.5), at 4.75 s it is in flight (357.7, 39.2) with no jump at the hand-off. v2-zoom-release-strip.png (stage 6 at 4.6, 4.7, 4.75, 4.8 s and stage 3 at 1.4, 1.45 s). |
| 4 | minor | stage 3 froze at 2.5 s with no ball | gone. STAGES[2].still is 1.9; reduced motion on ?stage=3: 0 rAF calls in 600 ms, 5 draws, the ball in flight top right (x from 481), the board on the forearm, the spike on the plot. v2-reduced-s3.png, v2-s3-t1.9.png. |
| 5 | minor | the long ring's last frames crossed the shade's corner | gone. RELEASE.rh [320, 58], r1 34. Gold pixels below the shade's rim nearest the corner (282, 36): 28.4 units away at 5.3 s, 19.7 at 5.45 s, 16.0 at 5.6 s; from 5.8 s the wrist is on its way down and the ring has faded. v2-zoom-longbuzz-strip.png (5.3 to 6.1 s). |
| 6 | minor | "15 s of slouching" against the shelf's "cues you upright the second you slouch" | remains, unchanged, Abba's call: lab-a.js line 22 against cases.js line 66 and projects.html line 54. |
| 7 | minor | accessible text "Nov 2025Bluetooth Car" | gone. A space text node sits between the date and the title span; `.lab-title` margin 0.6em (6.6px). Aria snapshot of the tabpanel on the harness and on index.html: "1 phone Nov 2025 Bluetooth Car A robot car on a breadboard, driven from my phone." |

### index.html, as a visitor

Both widths: the lab mounts in the Betta panel, lab.css?v=15.0 linked
once by the module, 6 tabs, 72 rAF calls in 600 ms, a click lands on
Apr 2026 and sets the panel polite, ArrowRight scrubs to Aug 2026 with
focus on that tab, Tab lands on the first pill, Escape closes the stop
and tears the lab down (0 .lab left), reopening mounts one lab with one
stylesheet link and styled pills. Zero page errors, zero console errors.

### Fresh captures at 560 and 360

v2-sheet-560.png and v2-sheet-360.png (the six stages at their stills,
whole module; the singles are v2-560-s*-whole.png and
v2-360-s*-whole.png). One number per scene in the corner, the figure as
the hero, the same lamp and bench in all six, words on the laptop in
stage 6 only (PULSES, SET, SHOT, HELD, GOOD REP). At 360 the number's
label wraps to two lines where it is long (FIRMWARE VERSIONS), the line
wraps to two, six tabs fit. Nothing new fails the three-second test.
Hard rules over lab-a.js, lab-a.css and the harness: no banned word (the
one "Venture" is the proper name), no em dash, no raster, no fetch.

### Notes

- minor, circuit/circuit.css: the pill rules reach index.html only
  through lab.css, which the module links once `import('./lab.js')`
  resolves. Measured on localhost: the pills exist unstyled from 778 ms
  after the pin click and are styled at 799 ms, a 20 ms window; on the
  network it is the module's fetch plus the sheet's. If mountLive skips
  the module (its catch), the run-on comes back. Folding the block
  (lab-a.css lines 179 to 192, the same as
  scratchpad/integration/panel-live.css) into circuit.css closes both,
  as the round 1 finding and the fixer both asked. Not a reason to hold
  the round.
- the 360 by 780 panel's first view is unchanged from round 1 (the lede,
  then the stage down to the figure's chest; v2-index-phone-panel-top.png).

### Failures while working

- The first read chain exited 1: `echo ======` under zsh (a leading `=`
  is expanded as a command path), which also hid the v13 and v14 docs
  behind a truncated read. Quoted the separators, re-read the report's
  tail and the two docs on their own.
