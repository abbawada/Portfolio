# Skydiving: the jump tile for the Projects stop (round 6)

A live tile for the Projects panel: the diver falls through clouds in a
2:3 case-sized tile, opens to a 16:10 jump the visitor steers and pulls,
lands on the Wada Ring, then offers the reel. Nothing on the page claims
more than a jump instrument in the making; the module itself says one
number, the altitude, plus its chrome (seven labels) and one line of hint
copy (four words in freefall, three under the canopy).

Fix round 1 (2026-10-10) and its second pass are at the end of this
file; the body below is corrected to match the module as it now stands.

## Files (new, nothing existing edited)

| file | what |
| --- | --- |
| circuit/skydive.js | the module, one ES export `mountSkydive(el, opts)`, canvas 2D, no fetches, no libraries, 911 lines |
| circuit/skydive.css | the tile, the open scene, the pills, the grid span, the phone rule, the scroll margin under a sticky head |
| tools/circuit/harness/skydive.html | stands the tile in a `.ring-grid` beside a 232x348 grey box; `?open=1` mounts open, `?two=1` mounts two tiles in one host, `?nocss=1` leaves the stylesheet out the way index.html does |
| docs/circuit/v15/skydive/check.mjs | the Playwright check, 81 assertions, keyboard only where it matters |
| docs/circuit/v15/skydive/*.png | 18 captures, listed below |
| docs/circuit/v15/skydive/check-report.json | the last run: errors, frame times, every assertion |
| docs/circuit/v15/skydive-fix/ | the fix round's evidence: fix-report.json and 14 captures from the live page, the phone sheet and the harness |
| docs/circuit/v15/skydive-fix2/ | the second pass: live-report.json, live-arrows-report.json, cold-report.json and 22 captures from index.html, the phone sheets and the harness |

## API, as asked

`mountSkydive(el, { href, compact = true, onJump, onLink })` returns
`{ destroy(), open(), close(), jump() }`. Inside `el`: `figure.sky` with
`button.sky-tile` (aria-label "Skydiving, press to jump"; the label
changes to "arrow keys steer, press to pull" once open, "arrow keys steer
the canopy" after the pull and "press to jump again" at the end), the
canvas (aria-hidden) and a bottom band with "Skydiving" and the "Jump"
pill; then `.sky-controls` with the hint, `button.sky-pull`,
`button.sky-next` (reduced motion only), `a.sky-reel` (href, `_blank`,
`noopener noreferrer`, accessible name "Watch the reel, opens in a new
tab") and `button.sky-again` inside `.sky-end`, and `button.sky-close`
"Back" (hidden at the end state). A visually hidden `aria-live` span
announces the phase with the altitude for screen readers ("Pull height,
4,000 feet", "Canopy open, 3,120 feet", "Landed"; each reduced-motion
still is announced too); they never show.

`open()` expands and starts the jump (a click on the tile does the same),
`jump()` restarts it (opening first if needed), `close()` returns to the
compact idle and ends the jump. `compact: false` mounts already open.
`onJump` fires on every start the visitor makes, `onLink` on the reel
click. After `destroy()` all four are no-ops.

The figure also carries `data-phase` (idle, freefall, opening, canopy,
flare, landed) and `data-alt` (rounded to 10 ft, posted at mount, every 8
frames in every mode and at every phase change) so tests and anything
watching the DOM can follow the jump without reading pixels.

The module links `circuit/skydive.css` itself (next to its own URL, same
build query) when the page has not, keeps the figure out of sight (in
flow) until that sheet lands or fails, and sets the canvas out of flow
and in px inline, so a page without the stylesheet can never be inflated
by the canvas and never shows the raw controls. index.html still ought
to link the stylesheet (see the fix round).

## The grid

The exact rule asked for is in the CSS: `.ring-grid > .sky.is-open {
grid-column: 1 / -1 }`. When the orchestrator mounts into a wrapper div
inside the grid (as the harness does), the module gives that wrapper
`.sky-host` with `display: contents`, so the figure is the grid item
either way and the same span applies; `el.classList` also mirrors
`is-open`. When `el` is the grid itself the figure is a direct child and
no host class is added. Open, the tile is 16:10 and capped at 70vh.
Compact at 232px the tile is 232x348 beside the grey box on one row;
open it spans to 492x307.5 and the box drops below. Under 720px the grid
is `auto-fill 176px`, which at 360px is a single 176px column, so one
rule `.ring-grid:has(.sky.is-open) { grid-template-columns: minmax(0,
1fr) }` makes the open scene take the whole sheet (320x200 at 360px, no
horizontal overflow). `:has()` has shipped in every current browser; a
browser without it keeps the 176px scene, which still works. On opening,
the tile scrolls itself into view with `scroll-margin-top: 170px`, so in
the phone sheet it lands just under the sticky panel head instead of
behind it.

## The jump

- Camera straight down past the diver. The diver is drawn in flat cel
  shapes from above and behind, in the site's own colours: graphite suit
  with gold piping and harness, near-black rig and helmet, the goggle
  strap and rims in the SKY car's pale sky (#8fd3ff, the one accent),
  gold altimeter on the left wrist. Limbs are two-segment strokes from
  five keyframe poses (arch, track, forward, hang, flare) mixed by the
  steering and the phase. Banking rotates the body up to 25 degrees and
  contracts the low side's limbs.
- Three cloud layers at fixed altitudes (10 near, 9 mid, 8 far) stream
  up as the altitude drops, with parallax against the steering shift;
  the near layer is thin (alpha 0.4) so the diver always reads. The sky
  runs from deep blue at 13,500 ft to pale at the ground.
- The ground is the plate from `circuit/layout.js`: the live
  `window.CircuitLayout` when the page has it, otherwise the same TRACK
  and PIT control points copied in, sampled with the same Catmull-Rom (8
  steps per segment), built once as `Path2D` in iso units and scaled per
  frame: cream diamond, grass infield and a grass verge around the loop,
  asphalt loop 9 wide, pit lane, start line, the court in wood, the
  garage and grandstand in roof grey (details only once the plate is big
  enough to read them). Plate width on screen is `1.6 w * 900 / (alt +
  900)`, and it surfaces out of the haze: invisible above 6,000 ft, solid
  by 2,000 (a smoothstep on `globalAlpha`), so at altitude there is sky
  and clouds and nothing else. The point under the diver starts at plan
  (100, 203), the grass beside the pit straight, and steering slides it
  (clamped to the plate), so the diver lands wherever the visitor
  steered, on the circuit by default.
- The one number: the altimeter top left in Chakra Petch italic 600 with
  0.06em tracking, "13,500 FT" ticking in tens, on a graphite plate (the
  tile band's rgba(42,43,46,0.86)) sized to the widest reading so it
  never twitches, with a thin barometer scale inside the plate whose
  gold tick slides down as the air thickens (the scale is dropped under
  240 px of width: the compact tiles, 176 and 232 px, show the number
  alone). Nothing else is ever written on the canvas.
- Time: freefall at 176 ft/s with one real second standing for four
  seconds of fall, 13.5 s from 13,500 to 4,000 ft. At 4,000 ft the cue: a
  burst of three gold rings from the left wrist (repeating every 3 s
  until the pull), the Pull pill lights gold, and the clock eases to half
  speed over 0.8 s, so the 2,500 ft left to decide in last about 7 s. Pull
  by click, tap, space or Enter on the tile, or the Pull button; a click
  within 500 ms of the jump starting (the second half of a double click,
  an impatient tap) is not a pull. On the pull: pilot chute at 0 to 0.25
  s, the bag rises, cells inflate from the centre with a little
  overshoot, the slider rides the lines down; at 0.7 s the snatch, an 18
  px damped camera jolt, the diver drops to 0.62 scale and the fall rate
  eases from the freefall rate to the canopy rate over 0.7 s.
- The canopy: a cream rectangle with seven gold cells (centre cell solid
  gold), straight lines from the near edge to the shoulders, the pilot
  chute trailing at the far edge as a small cream disc with a gold rim
  once the cells are open. Steering yaws the whole system up to 22
  degrees and the hand on the turn side pulls its toggle down; the ground
  drifts the other way. The canopy rate is 210 ft per real second from a
  pull at the cue (one second for fourteen), and a pull from higher up
  scales it so the glide is always about 15 s. Two-step flare at 50 ft
  (90 ft/s) and 20 ft (35 ft/s), the toggles come down, then touchdown:
  the figure stands (helmet, shoulders and the tips of the shoes from
  straight above, with a small shadow at the feet), the canopy drops
  behind and deflates on straight lines, the falling shadow hands over.
  One second later the end state: "Watch the reel" (gold pill) and "Jump
  again", Back hides, the hint hides; the loop stops two seconds after
  that.
- No pull by 1,500 ft: the AAD opens the canopy and the jump carries on,
  without a word on the canvas (checked in the ?open=1 run, capture 18).
- Compact idle: the diver sways 4 degrees, the altimeter counts 13,500
  to 9,000 at half speed (12.8 s), the digits dip out and back in over
  250 ms at the wrap while the clouds stream on a loop and the sky eases
  back to deep blue; the frame never fades. Hover or focus lights the
  Jump pill. Escape or Back closes. Whenever a control hides itself while
  it holds keyboard focus (Pull, Next, Jump again, Back), the tile takes
  the focus first, so Escape always ends the jump and leaves the panel
  open, and the arrows keep steering. While the scene is open the arrow
  keys belong to it from anywhere inside the figure: prevented and
  stopped there, so neither the page's left/right stop hop (nav.js) nor
  the case shelf's own arrow handler (cases.js, which ignores
  defaultPrevented and would move the focus to a case) ever sees them.
- Reduced motion: no loop at all. Compact shows the still diver at
  13,500. Open shows four cut stills, exit, pull cue (rings and lit
  Pull), canopy at 2,000, landed with the end state, advanced by Pull and
  Next and each announced; Jump again returns to the first. The hint
  hides. A live change of the media query converts a running jump to the
  matching still, and motion coming back resumes the same moment of the
  jump without a restart and without `onJump`.

## Flags for the orchestrator

1. Canopy time. Freefall is at the four-times compression asked for. The
   glide at 15 ft/s times four would last 54 s for 3,300 ft, so under the
   canopy one real second stands for fourteen (210 ft per real second,
   about 15 s from the cue to the flare). The altimeter stays truthful;
   only the clock runs faster. `CAN_RATE` and `GLIDE_S` if a longer
   glide is wanted.
2. The hint is now two lines of copy, "Move to steer. Click to pull."
   and "Move to steer." (touch: "Drag to steer. Tap to pull." and "Drag
   to steer."). Yours to change.
3. The screen-reader announcements (Pull height, Canopy open, Landed,
   plus the altitude and the four stills) are phrases beyond the listed
   words, never visible; delete `say()` calls if the list is strict.
4. index.html does not link `circuit/skydive.css`; the module links it
   itself now, but a plain `<link rel="stylesheet"
   href="circuit/skydive.css?v=15.0">` after line 17 of index.html is
   still the right thing to add, so the first paint of the tile is styled
   without a round trip.
5. `git status` showed `circuit/layout.js` modified before this task
   started (the SKY grid entry). Not touched here.

## Measured (docs/circuit/v15/skydive/check-report.json, fix round, pass 2)

Real Chrome, headless, 1280x900 at 2x then 360x740. Zero page errors,
zero console errors, 81 of 81 assertions. Frame callback (update and
draw, hooked through requestAnimationFrame): idle mean 0.12 ms, freefall
mean 0.07 ms (p95 0.2, max 1.1), canopy mean 0.08 ms (p95 0.2, max 0.4).
The loop stops under reduced motion, when the end state settles, and on
destroy; `destroy()` leaves the container empty with no host class
unless another tile shares it, and a second call or a call to
open/jump/close after it is a no-op that fires no callback.

The check, in order: compact size and the dummy beside it, data-alt in
the idle, idle frames, one stylesheet, Tab then Enter jumps (onJump
once), open size 492x307.5, the freefall hint, the reel's name, arrows
held (none reach the window, the shelf-like listener never runs, focus
stays on the tile), Tab to Pull and the four arrows there (same), the
cue at 4,000 ft with its announcement, Enter on
Pull (focus stays on the tile, hint changes, Pull hides), canopy
announced, the glide timed, landing, the end state with Back hidden,
onLink, Jump again by keyboard (focus on the tile, altimeter reset),
Escape closes with focus still on the tile, a double click that opens
without pulling and a later click that does, 360px compact 176 wide and
open 320 wide with no overflow, reduced motion (no frames, four
announced stills by keyboard with focus kept, the canopy still's label,
motion back on the landed still with no onJump, Jump again, Escape),
motion back (frames resume), destroy from an open tile (empty, frames
stop, jump() silent), two tiles in one host (the survivor keeps its host
class and still spans when open), `?nocss=1` (the module links its own
stylesheet and the tile is still 232x348), `?nocss=1` with the sheet
delayed 1.5 s (the figure is hidden and in flow until it lands, then
232x348), `?open=1`, and the AAD run with no pull (1,490 ft, 6.7 s after
the cue, lands).

## Captures

01 compact in the grid, 02 compact hover (Jump lit), 03 open freefall
banked left on ArrowLeft, 04 pull cue (rings, Pull lit), 05 canopy
opening (slider on the lines), 06 canopy glide with the plate, 07
landing flare at 40 ft, 08 end state, 09 phone 360 compact, 10 phone 360
open, 11 reduced phone compact, 12 reduced compact, 13 to 16 the four
stills, 17 the ?open=1 harness mode, 18 the AAD opening at 1,320 ft.

## Run it

```
/usr/local/bin/python3 tools/circuit/serve.py 8660 &
open http://127.0.0.1:8660/tools/circuit/harness/skydive.html
node docs/circuit/v15/skydive/check.mjs http://127.0.0.1:8660 docs/circuit/v15/skydive
```

## Fix round 1 (2026-10-10)

Reviewed findings, each with what was done. Files touched:
circuit/skydive.js, circuit/skydive.css, tools/circuit/harness/skydive.html,
docs/circuit/v15/skydive/check.mjs (the module's own check, extended to
cover the findings) and this report. Evidence: the check (76 of 76, zero
errors) and docs/circuit/v15/skydive-fix/fix-report.json (30 of 30, zero
errors, over index.html, the phone sheet and the harness; script in the
session scratchpad, skydive-fix/fixes.mjs).

1. Double click or second tap pulls at 13,480 ft (major). Two guards:
   a click on the tile within 500 ms of the jump starting is ignored
   (`ARM_MS`), and a pull from any height scales the canopy clock so the
   glide is about 15 s (`canRate = max(210, (alt - 850 - 50) / 15)`).
   Measured: a double click opens at 13,320 ft in freefall with one
   onJump; 15 clicks at 30 ms from idle give one jump, freefall at 12,940
   ft; a click 700 ms later pulls.
2. jump() after destroy() fired onJump (minor). `startJump` and `jump()`
   return when destroyed, and destroy clears `open`. Measured: jump()
   after destroy leaves the count unchanged.
3. destroy() stripped a shared host's classes (minor). The classes are
   removed only when no `.sky` remains in the host. Measured with
   `?two=1`: the survivor keeps `sky-host` and spans 492 px when open.
4. and 7. Keyboard focus dropped to body when a control hid itself; Escape
   then closed the whole panel on the live page (minor and major, one
   cause). `refocus()` moves focus to the tile before Pull, Next, Jump
   again, Back or the reel hide (pull, landing, each still, close).
   Measured on the harness and on index.html: after Enter on Pull the
   active element is the tile; Escape then ends the jump and leaves the
   Projects panel open; the second Escape closes it (fix-report live
   checks, captures live-03 and the check's focus assertions).
5. A reduced-motion change restarted the jump and fired onJump (minor).
   Motion coming back now calls `resumeStill()`, which turns the still
   into the same moment of a running jump (freefall at 13,500, the cue at
   4,000 with the slowed clock, the canopy at 2,000, or landed) with no
   reset and no callback. Measured: motion back on the landed still stays
   landed with the count unchanged; twelve rapid toggles leave it
   unchanged.
6. data-alt missing in the compact idle and frozen after Back (minor).
   `postAlt()` runs at mount and every 8 frames in idle too. Measured:
   a number at mount; 12,620 two and a half seconds after Back.
8. Arrows with focus on Pull, Next or Back hopped the panel to another
   stop (major). The figure's keydown handles and preventDefaults the
   four arrows whenever the scene is open and focus is anywhere inside
   the figure (steering only when motion is on); key state resets on
   focusout of the figure. Measured at the window in the harness
   ({key: ArrowLeft, prevented: true, target: sky-pull}) and on
   index.html: ArrowLeft on Pull keeps the Projects panel and the jump
   (capture live-02).
9. The altimeter failed contrast for most of the jump and three stills
   (major). The number now sits on a graphite plate, the tile band's own
   tone, sized to "13,500 FT" so it never twitches, with the scale
   inside it. Measured off the live canvas, the worst pixel of the plate
   rows above and below the digits against paper: open jump 3,908 frames,
   worst 8.93:1 (freefall at 9,180 ft, a cloud under the plate), medians
   freefall 10.7, canopy 9.73, flare and landed 9.25; zero frames under
   4.5:1. Compact idle worst 9.55:1. Stills 12.8, 10.38, 9.75 and 8.79:1.
   Phone 320x200 at 12 px, 3,829 frames, worst 8.79:1.
10. and 20. "AAD" in red, jargon and off palette (minor and major). The
   label and the red tick are gone; the canopy simply opens. `S.aad`
   stays as a flag with no drawing.
11. No altitude for assistive tech, silent stills, misleading label
   (minor). The live region now says "Pull height, 4,000 feet", "Canopy
   open, 3,120 feet" (the real figure) and "Landed"; each still is
   announced ("Exit, 13,500 feet" and so on); the canopy still's tile
   label is "Skydiving, press to land".
12. "Watch the reel" opens a new tab without saying so (minor). The link
   carries aria-label "Watch the reel, opens in a new tab".
13. and 18. The hint kept saying press space to pull under the canopy
   (minor and major). The line is "Move to steer. Click to pull." in
   freefall and "Move to steer." from the pull on (touch: "Drag to
   steer. Tap to pull." and "Drag to steer."), set by `setHint()` at
   reset, pull, touch detection and the reduced-motion resume. Measured
   both lines in the check.
14. The report overstated two things (minor). The body above is corrected:
   the Escape claim now describes the focus hand-off that makes it true,
   the "one number" line names the hint copy, the arithmetic is 54 s, and
   the check is keyboard-only at Pull, Jump again and Next.
15. index.html never loads skydive.css, the tile inflated to 2^25 px
   (blocker). In scope here: `ensureStyles()` links the stylesheet once
   from the module's own URL with the same build query when no link to
   skydive.css exists, and the canvas is set `position: absolute; left:
   0; top: 0; display: block` inline with its px size written beside its
   backing size in `resize()`, so the canvas can never size its button.
   Measured on index.html with no change to it: the page's source has no
   skydive.css, the module links `/circuit/skydive.css?v=15.0`, the tile
   is 232x348 beside Posture Cue and the panel is 1,512 px tall (capture
   live-01); `?nocss=1` on the harness gives the same. The index.html
   link itself is the orchestrator's (flag 4 above); both are wanted.
16. Only 2.1 s between the lit Pull and the AAD (major). After the cue the
   clock eases from 704 to 352 ft per real second over 0.8 s and the AAD
   fires at 1,500 ft. Measured: 6.72 s from the lit pill to the opening
   with nothing pressed (the ease costs the 0.4 s against the 7.1 s of
   the reviewer's arithmetic); the opening at 1,320 ft still lands.
17. The ground plate read as a cream postcard at altitude (major).
   `drawGround()` returns above 6,000 ft and ramps `globalAlpha` with a
   smoothstep to solid at 2,000 ft, which also mixes every fill toward
   the sky it sits on. The idle tile shows no hip triangle (capture 01);
   at 7,790 ft there is nothing beside the diver (03); the plate is half
   through at the 4,000 ft still (skydive-fix/harness-04).
18. The landed frame read as a purple bug in a net (major). The lines are
   straight from the near edge to the shoulders at every stage, the
   canopy drops and deflates flat behind them; the standing figure is
   the shoulders as a 30x12 rounded bar, the helmet over them, the rig's
   top edge above, the two shoe tips below, no leg strokes, with a 26x11
   shadow at the feet; the falling shadow fades out as the figure
   settles. Captures 08 and live-05.
19. The idle tile blacked out every 6.4 s (major). The frame never fades:
   the count runs at half speed (12.8 s per cycle), the digits dip out
   and back in over 250 ms at the wrap, the cloud field streams on a loop
   driven by a scroll that never resets, and the sky eases back to the
   13,500 tone over about a second. Measured: 14 s of 100 ms samples of
   the frame's mean luminance across one wrap, largest change between
   samples 0.012 (the old fade painted navy at 0.9 alpha over the whole
   frame in 350 ms).
21. The sticky head covered the altimeter on a 360x740 phone (major).
   `doOpen()` scrolls the tile into view on the next frame
   (`block: 'nearest'`, smooth unless reduced) with `scroll-margin-top:
   170px` on the open tile; since pass 2 a pull the visitor makes does
   the same (see below). Measured in the real sheet after a tap:
   360x740 head bottom 493, tile top 511, covered 0 (was 16); 390x844
   covered 0; both still 0 under the canopy (captures phone-*).
22. The diver dressed as a game avatar (minor). Suit #2a2b2e with the
   gold piping, rig and helmet #1b1b1d, strap and goggle rims #8fd3ff
   (the SKY car), gloves and shoes #121214, canopy unchanged.
23. The barometer scale read as a dagger at tile size (minor). The scale
   sits inside the plate as a 55 percent paper hairline with the gold
   tick, and is dropped under 160 px of width.
24. Tracking, six pills, cloud wash (minor). `ctx.letterSpacing =
   '0.06em'` on the digits; `.sky.is-landed .sky-close { display: none }`
   so the end offers the reel and another jump (Escape and the panel's
   Close still work); clouds 10/9/8 per layer with the near layer at
   alpha 0.4.
25. The pilot chute sat as a lollipop over the canopy (minor). While the
   cells open it is the graphite round on its bridle doing its job; once
   open it is a 4-unit cream disc with a 1-unit gold rim trailing 10
   units past the far edge on a 0.6 bridle (captures 06 and 08).

Not applied: nothing. Two choices of mine beyond the findings, both
stated here so they can be reversed: the idle count runs at half speed
rather than the old 6.4 s cycle (the reviewer offered either), and the
canopy clock scales with the pull height (the reviewer's third option
for finding 1) so a high pull is a 15 s glide rather than a minute.

Hard rules swept after the changes: no banned words, no em dashes, no
raster images, no footers, no new external links, no network fetches
beyond the module's own stylesheet link. Nothing committed; the server
on 8675 was stopped.

## Fix round 1, pass 2 (2026-10-10)

The three findings that remained after the reviewer's verification of
the first pass, each with what was done. Files touched:
circuit/skydive.js, docs/circuit/v15/skydive/check.mjs (the module's own
check, extended to cover the three) and this report; circuit/skydive.css
and the harness needed no change. Evidence: the check
(docs/circuit/v15/skydive/check-report.json, 81 of 81, zero page errors,
zero console errors, the 18 captures regenerated) and
docs/circuit/v15/skydive-fix2/ (the reviewer's own live.mjs and
live-arrows.mjs re-run against index.html, plus cold.mjs for the cold
cache and the altimeter plates; scripts in the session scratchpad,
skydive-fix2/). Real Chrome, headless, port 8677, stopped afterwards.

1. The case shelf still took the arrows on index.html (major). The
   figure's arrow branch now calls `e.stopPropagation()` beside the
   `e.preventDefault()`. Both of the page's listeners sit on `window` at
   the bubble phase (the stop hop in nav.js, which honours
   defaultPrevented, and the shelf's own handler in cases.js, which does
   not and calls `shelf.children[focused].focus()`), so neither sees an
   arrow pressed anywhere inside the open figure. Measured with the
   reviewer's live-arrows.mjs on index.html at 1280x900: all eleven
   states (ArrowLeft, Right, Up, Down and a held ArrowLeft, with focus
   on the tile and then on Pull) keep the active element on the tile or
   on Pull, the title Projects and the jump running; Tab from the tile
   reaches Pull again. The reviewer's live.mjs now passes all four "8
   live" checks that failed (ArrowRight on the tile, ArrowLeft next,
   ArrowRight on Pull, a held ArrowLeft on Pull; capture
   live-02b-held-arrowleft-on-pull.png shows the banked diver, the
   focus ring on Pull and the Projects panel). The module's check gained
   a shelf-like window listener (bubble phase, no defaultPrevented
   check, moves the focus to the dummy box on ArrowLeft or ArrowRight)
   and asserts it never runs and that no arrow reaches the window from
   the tile or from Pull (four new assertions). The reviewer's
   robustness suggestion for cases.js (`if (e.defaultPrevented) return;`
   at the top of its window handler) is outside the files of this task
   and is not needed now that the event never arrives; still cheap, the
   orchestrator's call.
2. index.html has no skydive.css link, so a cold cache showed the raw
   controls for one round trip (minor). index.html is outside the files
   of this task, so the half that is the module's is done here: when
   `ensureStyles()` has to link the stylesheet itself, every figure
   mounted before that sheet has loaded is set `visibility: hidden`
   inline (in flow, so nothing jumps) and revealed on the link's load or
   error event, or by a 3 s timer, whichever is first; destroy clears
   the timer. Measured on index.html with skydive.css delayed 2.5 s
   (cold.mjs): while the sheet is in flight the figure is hidden, its
   slot is 232x348, no text in the figure is visible and the panel is
   1,512 px tall (capture cold-01-before-css.png shows the empty slot
   beside Posture Cue); once it lands the tile is 232x348 and visible
   (cold-02-after-css.png). A 404 on the stylesheet reveals the figure
   through the error event. The check covers the same in the harness
   (`?nocss=1` with the sheet delayed 1.5 s, two assertions). The other
   half is still wanted and is one line for the orchestrator, after
   line 17 of index.html:
   `<link rel="stylesheet" href="circuit/skydive.css?v=15.0">`.
   With it in place `ensureStyles()` returns early and nothing is ever
   hidden. The reviewer's live.mjs check "15 index.html source links
   skydive.css itself" therefore still reads FAIL in live-report.json;
   it is the one failing check there, 25 of 26.
3. The barometer scale read as a T before the number on the compact
   tiles (minor). The scale is now drawn only from 240 px of width
   (`scale = w >= 240`), so the 176 px phone tile and the 232 px desktop
   tile show the number alone, one number and nothing else, and the open
   scenes (320 px on a phone, 492 px in the panel) keep the scale with
   the tick sliding down. Captures plate-176-phone-compact.png,
   plate-232-compact.png, plate-320-phone-open.png and plate-492-open.png
   (3x zoom of the plate), plus the regenerated 01 and 09 in
   docs/circuit/v15/skydive/.

Beyond the findings, two choices of mine, both stated so they can be
reversed:

- A pull the visitor makes (the Pull pill, or a click or tap on the
  scene) now calls the same `settleIntoView()` as opening does, on the
  next frame. Reaching the Pull pill at the foot of a 360x740 sheet
  scrolls the scene up under the sticky head (the reviewer's live.mjs
  logged "21 phone 360x740: still uncovered under the canopy" FAIL with
  213 px covered in their own run and in my first run), and the canopy
  is the part worth watching. The AAD's pull at 1,500 ft does not move
  the page. Measured: both phone sheets now show 0 px covered under the
  canopy (360x740 scrollTop 73, 390x844 scrollTop 77; captures
  phone-360x740-canopy.png and phone-390x844-canopy.png); on the desktop
  the tile is already in view and `block: 'nearest'` does nothing.
- The scratch copy of the reviewer's live.mjs retries a screenshot once
  if Chromium's capture stalls (see Failures); the final run needed no
  retry.

Measured on the final code (one sequential run): the module check 81 of
81 with frame means idle 0.12 ms, freefall 0.07 ms (p95 0.2, max 1.1),
canopy 0.08 ms (p95 0.2, max 0.4); live.mjs 25 of 26 (the index.html
link); live-arrows.mjs 11 of 11 states; cold.mjs 4 of 4. Zero page
errors everywhere; the one console line in cold-report.json is the 404
I served on purpose to prove the error path.

Hard rules swept after the changes (skydive.js, skydive.css, the
harness, check.mjs, cold.mjs, this report): no banned words, no em
dashes, no raster images, no footers, no new external links, no network
fetches beyond the module's own stylesheet link. Nothing committed.

### Failures

Every command that failed while I worked, and what fixed it:

1. `sed -n 570,630p circuit/cases.js`: "No such file or directory". The
   shelf lives at the repo root (cases.js, loaded by index.html line
   103), not under circuit/. Read it there.
2. `grep -rn ... --include=*.js .` under zsh: "no matches found:
   --include=*.js" (zsh globbed the unquoted pattern). Dropped the flag
   and grepped the root file directly.
3. `echo ==== ARROWS` under zsh: "=== not found" (a leading `=` is a
   command lookup in zsh). Quoted the separators and re-ran; the runs
   themselves had completed.
4. First run of the reviewer's live.mjs: `page.screenshot` timed out
   after 30 s on the 360x740 context at the canopy capture (Chromium's
   capture stalled once; the log ends at "fonts loaded"), so the script
   threw before writing live-report.json. A re-run of the unchanged
   script completed; the scratch copy now wraps each screenshot in a
   15 s attempt with one retry (`shotTo`), and the final run logged no
   retry.
5. live.mjs "21 phone 360x740 / 390x844: still uncovered under the
   canopy" FAIL (213 px and 1 px covered), the same failure the
   reviewer's own run logged: Playwright's tap on the Pull pill below
   the fold scrolls the pill into view and the scene under the head.
   Fixed at the root in the module (the settle on a visitor's pull
   above); both pass in the final run.

## The helicopter round (2026-10-10)

The jump now starts on the Betta helicopter, the aircraft that flies over
the race leader on the Wada Ring (it replaced the blimp in the same
round; see round-6.md section 6). In the module: `drawHeli` (the cabin
with BETTA on its flank, the glass nose, the boom and fin, the spinning
rotor, the skids, in the world's own tones), an `exitT` clock that runs
for EXIT_S = 1.5 s from every `resetJump`, during which the diver hangs
from the near skid, lets go at 0.6 s (LETGO_S: no pull before that,
steering ignored throughout) and comes to the centre at full size while
the helicopter recedes out of the top; the fall rate builds with a
smoothstep over the same 1.5 s, so the exit costs about 0.7 s of freefall
time (alt is about 12,800 ft when the helicopter is gone). The compact
idle shows the helicopter passing out of the top for PASS_S = 1.8 s after
each wrap back to 13,500 ft (`passT`). The first reduced-motion still is
the exit, held just after the let-go, announced as "Exit from the
helicopter, 13,500 feet" (check.mjs updated to match). The check passes
in full: 0 failed, zero page errors; captures in
docs/circuit/v15/final/helicopter/.
