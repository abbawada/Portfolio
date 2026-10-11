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
stills advanced by Pull and Next. The module links its own stylesheet when
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
- The court clip shows USC banners and the SC mark on the player's shirt;
  the "what counted" still too. Kept real by the orchestrator's call;
  the painted alternative is in the session scratchpad (content.md names
  the path).
- The wheelchair poster under the projects shelf shows real people and a
  USC-print shirt, as before this round.
- Phones remain untuned beyond what each module checked at 360 and 390.
