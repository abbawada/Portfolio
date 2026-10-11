# V1.5 drive: the visitor takes a car

Asked for: the best live thing for the racing cars, more happening on the
site. The live thing is the person on the page. They take a ninth car,
paper white, and race the field; every car they pass is a toast with Open
it, which opens that project's stop. Watch the race (the old Start lap) is
unchanged beside it.

Files: circuit/world.js (the car, its maths, the drive API), circuit/nav.js
(input, chase camera, HUD, toasts, the Grid's dynamic field, the clock,
the hint), circuit/circuit.css, index.html (HUD markup and the dom ids),
tools/circuit/drivetest.mjs (new). racetest.mjs is untouched; its contract
still reads the same gridState.

Captures in drive/: drive-start.png (the moment the drive starts),
drive-pass.png (a toast), drive-end.png (the end card), drive-phone.png
(390 by 844), grid-clock.png (the Grid with the clock), plus the gate
audit's gate-wide-1600.png, gate-wide-1440.png and gate-01 to gate-07.
Reports: drive-report.json (the drive contract), gate-report.json,
labels.json.

Run it: `node tools/circuit/drivetest.mjs http://127.0.0.1:PORT/index.html docs/circuit/v15/drive docs/circuit/v15/drive/drive-report.json`
against `tools/circuit/serve.py PORT`.

## What the visitor gets

Drive, the primary pill under the name (or D on the map, or D during the
watch). The camera flies to a white car at the back of the field and
rides it. ArrowUp, W or Space is the throttle, ArrowDown or S the brake,
ArrowLeft and A, ArrowRight and D steer, with a quarter-second ramp to
full lock. Pressing and holding the world is the throttle; sliding the
pointer sideways steers, ninety pixels is full lock; a finger does the
same, and a phone gets "Hold to drive. Slide to steer." for four seconds.
The wheel sets how close the camera rides.

Top right: a position chip and the lap timer in tenths. Each car passed:
"You passed Visual Mapping" with Open it; each car that goes by: a
quieter "Visual Mapping went by" with Open it. Two toasts at most, five
seconds each. Open it opens that project's stop and the drive ends. The
Grid grows a YOU row while the car is on track, white stripe, no
attention bar, in position with the others, and loses it when the car
leaves.

The lap ends with a card: "Your lap 1:09.5", "Best on this device 1:09.5"
(localStorage, try/catch), Drive again or Back to the map; the car stays
on track and still answers the keys until they choose. Escape, the exit
pill ("Leave the car Esc"), the Drive button (reading "Leave the car"
while on), a label, a Grid row or a toast all leave the car. A panel or
the stage stops all input and the chase.

Also in this round: the Grid's caption is "Each car is a project. Open
one and its car picks up pace. Drive to join them.", its aria label says
the real number of cars, and the head carries "Los Angeles 15:43" from
Intl in America/Los_Angeles, ticked every fifteen seconds, a plain Date
fallback behind try/catch. A first-visit hint, "Click a stop to open it.
Drag to look around.", sits under the pills and goes on the first press,
key or nine seconds, once per device.

## The maths

The player is one more entry in cars, pushed last so the eight keep their
indices when it leaves. Its wanted speed is the throttle and the corner
and nothing else:

    want = 9.2 * (0.5 + 0.60 * throttle) * (1 - 0.34 * corner)

capped at 0.35 * 9.2 while the brake is down. The tow applies; the band,
the leader drag and the attention do not. It holds station behind a
blocker exactly as the others do (the same band, the same firm brake), so
a pass needs a lane change; the field treats it as a blocker like any car
and may pass it. It never starts a choreographed pass, and it is kept out
of the attention store entirely. Its lateral follows the steer and the
lane is clamped inside the white line, |lane| <= 3.1. The lap is the
car's own distance from where the drive began; passes are rank changes
against named cars with a third of a car of hysteresis, so a dead heat is
one pass and not ten.

### Tuning, and why

| value | set | asked | why |
| --- | --- | --- | --- |
| gain | 0.60 | 0.68 | at 0.68 a bot lap passed all eight cars in forty seconds on every seed; at 0.60 it passes three to five in about 68 s, and a person, who steers later, two to four |
| full-lock lateral | 3.0 | 2.4 | the blocker band is RACE.clear = 2.85 across; at 2.4 the player could never leave a blocker's band, so could never pass anybody; 3.0 clears it with 0.15 to spare |
| grip | 0.34 | 0.34 | as asked; flat out is 10.1 on a straight against the field's 9.2 to 9.5, and 6.7 through a full corner against their 5.3 to 5.9 |
| idle, brake | 0.5, 0.35 | as asked | |
| start | 8.2 behind the last car | | follow + 1.5, wherever the last car is, so there is a car to chase from the first second |
| steer ease | 3.0 a second | | a lane change in about a second |
| hysteresis | 2.0 | | a third of a car |
| chase | 7 ahead, 11 at speed, zoom 2.1, 3.15 upright | | the lap guide's glide, 5.5 a second, 9 for the first 0.9 s |

Measured, loop stopped, 60 Hz, a bot that pulls to the side with room
when blocked and tries the other side after four seconds (the policy a
person uses), gain sweep on three seeds, passes in the first lap and the
lap time:

| gain | seed 3 | seed 7 | seed 11 |
| --- | --- | --- | --- |
| 0.52 | 1 in 70.5 s | 2 in 71.4 s | 2 in 71.2 s |
| 0.56 | 4 in 69.9 s | 3 in 68.4 s | 1 in 69.8 s |
| 0.60 | 5 in 68.5 s | 3 in 68.0 s | 3 in 68.9 s |
| 0.68 | 8 in 61.9 s | 8 in 62.7 s | 8 in 63.4 s |

Lap length is 635.7 units: 69.1 s at 9.2 flat, the field laps in about
74 s. A drive stuck on the racing line behind the field, never changing
lane, completes its lap in 73 to 77 s with zero passes, as the hold rule
says it should.

### The rules the player needed

Three abreast cannot fit: 6.2 of lane between the white lines against
2.85 of clearance per pair. The AI's choreography never produces it; a
free driver does, and every touch I found in the first hour was its
fallout. These rules only ever fire with a player on track, so the rest
race is untouched by them:

- A car alongside is a wall. The player cannot steer into a car within a
  length along the track; a car the racing line would carry into a player
  pinned at the line gives room inside the line first, and only then does
  the player give. This runs inside the player's own step, so every car
  stepped after it in the same frame sees the settled lane. (The first
  version ran after the loop and a car behind read the player's
  provisional lateral, mid-steer, and took it as its blocker.)
- Nobody threads a pass: while two other cars are mid-pass, both block
  the player across the whole road. A car passing the player is an
  ordinary car to them.
- No pass starts across a player who is alongside either car of it. A pass
  on the player is fine.
- A pass on the player that runs out of time while already ahead of them
  simply ends, and a passer slows to the passed car's pace only while
  still behind it. Without these the passer wanted 0.93 of the player's
  speed, the player held at 0.96 of the passer's, and both decayed to a
  standstill with the car behind them following down (caught once in
  twelve 240 s replicas, speed 1.9 and falling).
- A car beside you on a clear lane is not your blocker (the band test is
  in lateral terms, the wall keeps clearance in lane terms, and the two
  differ by the racing line's swing over a car length, up to 0.05).

One rule does fire at rest: the firm end of the hold. Inside 6.1 along
the track a held car's speed is clamped to its blocker's, so a long frame
(a throttled tab, a slow phone, three Chromes on one Mac) cannot shrink
the gap under a car length. Eight cars make more trains than seven, and
the eight-car baseline I was handed failed the race contract on two of
three seeds before I touched anything (seed 3: three touch frames at 206 s,
5.80 along; seed 7: nineteen from the first frame, 5.80 along). The hold
had sat 0.1 from the touch rule since session 3.

## The contract numbers

Race contract at rest, eight cars, 240 s at 60 Hz, run three abreast on
the Mac with the drive test and three replicas alongside (the worst case
for the live frames before the loop stops):

| seed | touches | widest lane | slowest | order changes | mean interval s | longest wait s | passes | aborts | calls | pass |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | 0 | 3.1 | 4.75 | 15 | 16.3 | 22.6 | 11 | 2 | 202 | yes |
| 7 | 0 | 3.1 | 4.85 | 15 | 16.4 | 22.9 | 12 | 1 | 202 | yes |
| 11 | 0 | 3.1 | 4.91 | 16 | 15.1 | 25.7 | 10 | 2 | 202 | yes |

The same three before this round: 3 touches, 19 touches, 0; means 13.7,
15.0, 17.1; two of three failing.

Drive contract (drivetest.mjs, final run, all twelve checks true, zero
page errors):

- Loop stopped. 120 s flat out on the line, then 120 s flat out with the
  steer sweeping a ten-second sine, then a bot lap: 0 touches in 240 s,
  the player's widest lane 3.10, the field's widest 3.10, the player's
  slowest 4.94 and fastest 10.59, the line-only lap done in 76.4 s at P9
  with 0 passes, the weave 5 passes to P4, the bot lap 70.8 s with 4
  passes to P5. Input clamps: throttle 7 reads 1, steer minus 4 reads
  minus 1, brake 'yes' reads true, six seconds on the brake settles under
  4. Draw calls 202 at rest, 210 with the car, 202 after; cars 8, 9, 8;
  the YOU row present and then gone.
- Loop running. The hint on load; Drive and Watch the race; the clock
  "Los Angeles 15:43"; the caption; the aria label "8 cars". Drive: the
  HUD, "Leave the car Esc", the button "Leave the car" pressed, the YOU
  row, the hint gone, the camera 6.4 from the car. ArrowUp held: 0:06.7
  at five seconds, 0:21.8 at twenty, P9. The keyboard bot: "You passed
  Betta / Open it", then "Your lap 1:09.5" and "Best on this device
  1:09.5" with betta, bluetooth and posture passed, P5; the best stored.
  Escape: HUD hidden, YOU row gone, cars 8, exit pill hidden, "Drive".
  Watch the race still rides ("Back to the map Esc"); D takes the car
  from the watch; a Grid row opens its stop and ends the drive.
- A phone, 390 by 844: the HUD at 240,30 by 134,96, the tip, the camera
  at zoom 3.15 and 6.3 from the car, the Grid block still shown, press
  reads throttle 1, a 90 px slide reads steer 1, release reads 0, the tip
  gone after four seconds, the pill leaves the car.
- Reduced motion: the loop is off at rest and on only while the car is
  held (the timer ran 0.33 to 5.35), the camera snaps onto the car at
  zoom 2.1, Escape stops the loop again, the watch still cuts between
  the stops.

Gate audit at 1600 and 1440: zero in every category, marks and chips
included; chip clearance from its own mark 24 to 200 px. Label test
seven of seven, no hover-only titles.

## Draw calls and jank

202 at rest with eight cars (round 4 had 194 with seven; the eighth car
is this round's). 210 while driving: four meshes, each drawn twice because
the transmission pass renders the opaque scene first. 175 at the chase
zoom, where fewer objects are in view.

Frame times in real Chrome, headless, 1600 by 900. At rest, 20 s: 1197
frames, mean 16.7 ms, p95 16.8, max 33, none over 50. Flat out with
ArrowUp held and nothing else touching the page, 41 s: 2496 frames, mean
17.2, p50 16.7, p95 16.8, p99 33, max 100, eight over 50 ms. Long tasks:
one of 208 ms 1.6 s into the drive, under the camera fly, then 68, 119
and 55 ms at 6, 12 and 28 s with no toast, pass or Grid change near them.
Starting a drive costs 8 ms of page JS in total (the car 5 ms, the first
render with it 4.5 ms, no shader compile), so the start hitch is not the
page's work; it reads as a collection. With the test harness polling the
page ten times a second to steer, fourteen frames over 50 in 2277.

## Flags

- Gain 0.60 and full-lock 3.0 are the two numbers that differ from the
  brief, for the reasons in the table. Say the word and they move.
- The player's row reads "YOU You" (code and name, as asked). It reads
  doubled; the name could be blank.
- Under reduced motion the drive runs the world's loop for exactly as long
  as the car is held. A press on Drive is the visitor asking for motion;
  the camera snaps rather than glides. Without this the drive could not
  exist under that setting, since the race does not run there.
- The player starts 8.2 behind the last car wherever that car is, not
  always on the pit straight.
- On a phone the Grid block sits over the lower right of the world as it
  did before this round; the chase keeps the car at the centre of the
  screen, but a car passing on the right can run under the block.
- The lap timer counts simulated seconds, so it pauses with the loop when
  the tab is hidden.
- The lap guide's exit pill is shared with the drive and renamed by
  whichever is on; the lap button now reads "Watch the race" at rest and
  "Leave the lap" while riding.
- The wheel while driving sets the chase distance (0.6 to 1.5 times)
  instead of zooming the map.
- A car that "went by" only appears when the player is slower than the
  field; flat out it never happened in the tests, with the throttle
  released it does.
- Not mine: opening the Betta stop requests circuit/lab.js (stops.js,
  edited by another module this round), which does not exist yet; the
  label test counts that 404 as its one console error, and drivetest
  opens the Projects row to stay clear of it.
- The eight-car rest race needed the firm hold to pass its own contract;
  that is the one change at rest, and it is a tighter version of a rule
  the race already had.

## Fix round (2026-10-10)

Twenty-five reviewed findings came back from three reviews (drive-review,
drive-review-a11y and the phone pass). Several name the same fault from a
different angle, so they are grouped below by what changed. Files touched:
circuit/world.js, circuit/nav.js, circuit/circuit.css, index.html,
tools/circuit/drivetest.mjs. Nothing in the rest race moved.

Captures in drive/ with the fix- prefix: fix-360x640-toast.png and
fix-360x640-card.png, the same pair at 360x780, 390x844, 1366x620 and
1024x640, fix-card-best.png (a slower lap against a stored best),
fix-reduced-after.png (reduced motion after Escape), fix-chips-drive.png
(nine seconds into a desktop drive). drive-start, drive-pass, drive-end,
drive-phone, grid-clock and the gate captures were re-taken. Numbers in
drive-report.json under fix.

### The end card under the Grid (blocker, major, and the 104 px column)

Three findings, one cause: the HUD column and the Grid block both sat at
z-index 3, and on a phone the HUD was squeezed to 104 px so the card ran
333 px tall and down into the rows.

- `.ring-drive-hud` is z-index 4, so wherever the two columns meet the card
  takes the tap.
- While a car is held the Grid keeps three rows, the car ahead, YOU and the
  car behind (nav.js marks them `is-near`, circuit.css hides the rest), with
  no caption and no clock. The block is about 100 px tall while driving, so
  the columns no longer meet at any size measured.
- Under 760 px the actions row hides while driving (the name alone stays top
  left), the HUD column spans the width (`left: 1rem; right: 1rem`), the chip
  and the timer sit on one row at the right, a toast is one line with its
  text on an ellipsis, and the card is wide and short with its two buttons
  on one row (card 328 by 109 at 360, 358 by 109 at 390).

Measured after, document.elementFromPoint at the centre of each card
button: Drive again and Back to the map hit themselves at 360x640, 360x780,
390x844, 1366x620 and 1024x640; a tap on Back to the map at each size ends
the drive with no panel open and eight cars left. The toast's Open it hits
itself at every size and is 36 px tall. At 360 the chip and timer row sits
inside the HUD box, the toast text is one line, Your lap is one line.

### The hero car (blocker)

makeCar takes a third argument. The visitor's car is built on its own paper
body (MeshPhysicalMaterial, paper, roughness 0.35, metalness 0.1, clearcoat
1, flatShading), with the wheels kept gloss black in their own mesh, ink
flank lines and nose, and the wing edge in gold. A flat paper ring
(RingGeometry 3.4 to 4.0, opacity 0.6) sits under it for the first 1.5 s
and fades through the last half second, skipped under reduced motion. The
body material and the ring are disposed in endDrive beside the geometry.
Draw calls while driving are 215 (were 210): the wheels and the wing edge
are two more meshes, each drawn twice by the transmission pass. At rest
202, after 202.

### The words on the drive screen (major)

At every width while driving: the line, the place, the hint, the Watch pill,
the Grid caption and the clock are hidden; the Grid is three rows; the Drive
button keeps its one word and carries the state in aria-pressed (it no
longer reads Leave the car, so the words appear once, on the bottom pill).
What is left: the name, the exit pill, the position chip, a whole-seconds
timer, three Grid rows, the strip.

### The card's number (major)

finishLap clears the toasts, toast() returns while the lap is in, and the
timer hides behind the card (`.ring-drive-hud.is-done`), so the number is
printed once and nothing arrives above the card to move it. The best line is
hidden on a first lap on the device, reads New best when the lap is faster
than the stored best, and names the best to beat when it is slower. Verified
with a stored 500 s (New best) and a stored 40 s (Best on this device
0:40.0).

### The timer (minor)

`.ring-drive-time` is clamp(1.25rem, 2vw, 1.75rem): 28 px at 1600 against
the name's 30. It shows whole seconds while driving (0:21); the tenth is on
the card. The chip and the card's line are weight 600 like every other pill.

### Chips through the chrome (major) and the clock's contrast (major)

The Grid head and rows are opaque paper, which also puts the Los Angeles
clock on paper where the muted text reads 5.17:1 like the row names. In
updatePins any chip whose box meets the name block, the car's HUD or the
Grid block gets `is-under` (opacity 0, 120 ms) unless it is hot or open; the
chrome boxes and chip sizes are read four times a second and whenever a
toast, the card or the drive chrome changes shape, the per-frame test is
arithmetic on the projected point. gate.mjs is not in this module's file
list, so the drive-time intersection check lives in drivetest pass 4 part d:
sampled every 150 ms for nine seconds at 1600x900, 540x900 and 390x844, a
visible chip never met the chrome by more than 6 px in 59 samples at each
size (28, 48 and 7 chip-samples were faded under it).

### Space, D and the focus (major and minor, six findings)

- Space on a focused button while driving is the button's: the drive branch
  of the keydown handler lets it through. Space on Leave the car ends the
  drive, Space on Open it opens the stop, Space on Back to the map leaves.
  Space on the HUD itself is still the throttle.
- The D that took the car is remembered until its keyup and ignored as a
  steer in between; held 850 ms with six repeats, steer stays 0 and the car
  stays on its line. A second press of D after release steers right as
  before.
- Leaving the car returns the focus to the Drive button when it was in the
  car (the HUD, a toast, the card) or fell to the page when the exit pill
  hid; a focus elsewhere is left alone. After Escape, after Space on the
  exit pill and after Back to the map, document.activeElement is #ringDrive.
- D starts a drive only while the map has the focus: the page, the canvas,
  the Drive button or the car's HUD. From the Watch pill or a pin it does
  nothing (WCAG 2.1.4); the hidden help text says so. drivetest blurs the
  Watch pill before pressing D for its D-from-the-watch check.
- A toast that holds the focus is not removed at five seconds and not
  evicted for a newer toast; it goes when the focus leaves. Measured: Tab
  onto Open it, 5.6 s later it is still there and still focused.
- #ringDriveHud is role group (named Your car) and #ringDriveCard role group
  named Your lap, with the live region kept.

### The YOU row (major and minor)

A plain div, not a button: no Tab stop, no click, no aria-label to go stale.
It reads from its content, P9 YOU +7.56, and the live update keeps the
position true. The name is blank and the accent is ink, so the row reads
once and its stripe shows on paper.

### Reduced motion (major)

nav.endDrive calls updateGrid(true) after world.endDrive, and startDrive
calls it after world.startDrive, so the YOU row joins and leaves with the
car whether or not the loop is running. After Escape under reduced motion:
loop stopped, eight cars, no YOU row, the label says 8 cars, one per
project, focus on Drive. The ring is skipped (six meshes on the car, not
seven).

### The phone chrome (minor and major)

- The exit pill sits bottom left under 760 px and its Esc key hint is
  hidden; the pill never meets the mini-map at 360 or 390. The same rule
  carries the lap guide's Back to the map pill.
- The two pills under the name stay on one row on phones (tighter padding,
  nowrap), so they no longer push the hint into the Grid.
- The first-visit hint reads Tap a stop to open it. Drag to look around.
  under a coarse pointer, and is not shown on a phone under 700 px tall,
  where there is no room between the pills and the Grid.
- Open it is 36 px tall at 0.6875rem and 0.18em, the site's pill.

### Pre-existing phone clutter (minor, a decision)

The three-row Grid while driving is the decision: the Grid collapses rather
than hides, so the visitor still sees who is ahead and behind, and a car
passing on the right has the lower right of the screen back. At rest the
phone is as it was, except that a chip under the Grid block now fades
instead of stacking under it.

### drivetest.mjs

The timer parser accepts whole seconds; the Drive label while on is Drive
with the Watch pill hidden; the card's best line may be hidden; D is pressed
after a blur; the Grid row click picks one of the three visible rows. A
fourth pass re-measures everything above and writes the fix- captures.

Final run (2026-10-10, port 8657): all thirteen checks true, zero page
errors. The maths pass is unchanged by this round: 0 touches in the 240 s
sweep, lane 3.1 at most, the bot lap 68.5 s with 5 passes. Live: 0:06 at
five seconds and 0:21 at twenty, the toast You passed Betta, the card Your
lap 1:11.3 with the best line hidden on the first lap, Escape leaves with
eight cars, D from the page takes the car from the watch, a Grid row opens
its stop. Draw calls 202 at rest, 215 holding the car, 202 after. The gate
audit at 1600 and 1440 is zero in every category with the opaque Grid.

Not applied as written: the gate.mjs addition (not in this module's files;
the check lives in drivetest instead), and the exit pill moved to the
bottom left rather than up above the map, so it stays the one pill in the
corner the thumb reaches. The rest race, racetest.mjs, was not re-run: no
line of the rest race changed, and the loop-stopped sweep still reads zero
touches.

## Verify round 1 (2026-10-10, port 8654)

Independent re-run of the 25 reviewed findings in drive-r1.json against
index.html in real Chrome (Playwright, channel chrome, headless), plus
the builder's own harness. Nothing was changed; this section only
records what was measured. Captures and numbers in drive-verify1/:
verify.json (the reproduction script), rest.json (chips under the chrome
at rest), again.json (restarts and the fresh-load Tab repro), and
drivetest/ (the harness run: drive-report.json and its captures).

Harness: `node tools/circuit/drivetest.mjs` on 8654, all thirteen checks
true, fix round ok, zero page errors. The maths pass unchanged: 0 touches
in 240 s, lane 3.1 at most, the bot lap with passes.

Page errors across every context of the verify run (nine sizes, the
keyboard page, reduced motion, three chip runs, three phone rest pages,
five desktop rest pages, the restart page): zero.

### Blockers and majors, each reproduced

| finding | measured now |
| --- | --- |
| end card under the Grid (blocker, major) | document.elementFromPoint at the centre of Drive again and Back to the map returns the button itself at 360x640, 360x780, 390x844, 560x900, 768x1024, 1024x640, 1280x720, 1366x620 and 1366x625; the card never meets the Grid box at any of them (three rows, about 100 px tall, while driving). A real tap on Back to the map at every size: driving false, no panel open, eight cars, focus on Drive. A tap on Drive again: a new car, nine cars, focus in the HUD. The toast's Open it hits itself at every size, 36 px tall. |
| phone column 104 px (blocker, minor) | at 360 the HUD box is 16 to 344 (max-width none), the chip and timer row sits inside it, the toast text is one line (16 px tall; the pill is 50 px because Open it is 36 px plus padding), Your lap is one line, the card is 328 by 109 with both buttons on one row. 358 wide at 390, 528 at 560. |
| the hero car (blocker) | the body material is #f7f5f0, wheels #15171b, flank lines #141414, wing edge #c6a15b, name blank, accent ink. A RingGeometry halo is on the car at 1.3 s and gone by 2.3 s; none under reduced motion (six meshes). Crops car-1.2s, car-2.4s, car-8s: a paper car with ink lines on the graphite strip, the only light car in the frame. |
| Space on a focused button (major, minor) | Shift+Tab from the HUD lands on the exit pill; Space held 400 ms reads throttle 0 (v 4.6, idling); on keyup the drive ends and focus is on Drive. Space on the Drive button: throttle 0 while held, ends on keyup. Space on a focused Open it (Validators): the Economics panel opens, driving false. Space on Back to the map: driving false, focus on Drive. Space on Drive again: a new drive, focus in the HUD. Space on the HUD itself: throttle 1, v 8.87. |
| reduced motion ghost row (major) | with reduce emulated: loop off at rest, on while the car is held (timer 0:03 after 2.5 s), after Escape: running false, 8 cars, no YOU row, 8 rows, label "8 cars, one per project", HUD hidden, Drive unpressed, focus on Drive. Same after the exit pill. Watch the race afterwards still cuts, no YOU row. reduced-after.png. |
| focus to body (major, minor) | focus after Escape, after the exit pill by click, after Enter on Back to the map, after Space on Back to the map, after Space on the exit pill: #ringDrive every time. Fresh load, Tab lands on Drive, Enter drives (focus in the HUD), Escape returns to Drive. |
| the clock's contrast (major) | the head is opaque paper: behind the clock every pixel is rgb(247,245,240) at 1440x900 and 390x844, mean and darkest tenth both 5.17:1 against #6b675f (contrast.py over the clock-on and clock-off crops). |
| the YOU row (major, minor) | a DIV, no aria-label, tabIndex -1, text P9 YOU +7.74 (no doubled name), stripe rgb(20,20,20) on paper; its position text and the HUD chip agree after passes (P9 and P9, the Grid label says "9 cars, one per project and you"); a click on it changes nothing and opens nothing. |
| the words on the drive screen (major) | at 1440 while driving the line, the place, the hint, Watch the race, the Grid caption and the clock are display none; the Grid shows three rows; Leave the car appears once (the bottom pill), Watch the race zero times; Drive keeps its word with aria-pressed true. The visible chrome text is: Wada Ring, Abba Wada, Drive, Leave the car, Esc, P9, the timer, The grid, Lap 1, three rows, and the pin chips. |
| chips through the chrome (major) | the head and the rows are rgb(247,245,240) opaque. Sampled every 150 ms for nine seconds of a held drive at 1600x900, 560x900 and 390x844 (60 samples each): a visible chip never overlapped the name block, the car's HUD or the Grid block by a single pixel; 28, 30 and 9 chip-samples were faded under them. |
| the card's number (major) | after the lap: toasts 0, the timer display none, the best line hidden on a first lap, card top 80; a pass forced after the lap adds no toast and the card does not move (top 80). Stored 500: New best. Stored 40: Best on this device 0:40.0 under Your lap 1:11.5. card-first-1600.png, card-slower-1600.png. |
| phone exit pill over the map (major, minor) | at 360x640 the pill is [16,570,140,44] against the map at [214,539,130,82], no overlap; the same at 360x780, 390x844 and 560x900; the Esc kbd is display none under 760. |

### Minors, each reproduced

- Holding the D that took the car: after 150 ms plus six repeats, steer 0
  and lateral 0; a second press after release steers 1.
- D from the focused Watch pill (riding or at rest) and from a focused pin:
  no drive; from the page, and from the watch with the page focused: a
  drive.
- A focused toast: Tab from the HUD lands on Open Validators; 5.6 s later it
  is still there and still focused; two more passes (TOAST_MAX 2) evict the
  others and keep it.
- Roles through CDP: #ringDriveHud role group, name Your car; #ringDriveCard
  role group, name Your lap, hidden and shown.
- The hint on a coarse pointer reads Tap a stop to open it. Drag to look
  around.; display none at 360x640; at 360x780 and 390x844 its box clears
  the Grid block and every chip.
- The timer is 28 px against the name's 30 at 1600 and 1440, whole seconds
  while driving (0:01, 0:02, 0:10), the chip and Your lap at weight 600.
- Open it: 36 px tall, 11 px, letter-spacing 1.98 px (0.18em).
- Phone clutter: while driving on 360 the Grid is three rows and a chip
  under the Grid block fades (is-under) instead of stacking.

### New, minor

At 1024x640 at rest the 01 About chip is faded under the name block: the
is-under test uses the whole .ring-hud box (352 by 221 px, pills and hint
included), and the chip's box [317,52,97,21] meets its blank right side, so
the About stop has no chip and no chip tap target until the visitor pans.
Not the case at 1280x720, 1366x620, 1440x900 or 1600x900 (rest.json). The
About mark itself is still there and still picks. rest-1024x640.png.

### Notes, not findings

- At 360 and 560 wide at rest the chips that sit under the Grid block
  (02 Betta, 03 Education, 07 Contact, and 04 Economics at 360x640) now
  fade rather than stack under the rows; the Grid already took their taps.
  The builder's documented decision on the pre-existing phone clutter.
- Hold to drive. Slide to steer. shows at 560 wide in a mouse context as
  well as on phones (the phone test is width or coarse pointer); the words
  hold for a pressed mouse too.
- In the verify captures the tip is still up on the end card because the
  lap was forced within four seconds; on a real lap it is long gone.
- The mid-run reading of a +91.97 gap on a restarted car was an artefact of
  the stepped test sequence: measured again on its own, a third car after
  two Drive agains answers the keys at 10.24 and laps in 68.7 s with five
  passes (again.json).

### Failed commands in this round, and what fixed them

- `/usr/bin/python3 -I contrast.py`: ModuleNotFoundError, no module PIL.
  The -I flag drops the user site-packages where Pillow lives. Re-run
  without -I (the crops are this round's own captures, the script's folder
  holds only its own files).
- `/usr/bin/python3 -P contrast.py`: Unknown option -P; Xcode's python3 is
  3.9.6. Re-run plain.

Verdict: pass. Every blocker and major is gone, no page error appeared,
one new minor at 1024x640 recorded above.
