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
round; see round-6.md section 6, which also records the fix round that
followed the review). In the module: `drawHeli` (the cabin with BETTA on
its flank, the glass nose, the boom and fin, the rotor as one faint disc
about the length of the airframe, so it clears the altimeter plate at
every size, with no blades, since at this frame rate they would step a
fifth of the spacing a frame and strobe; the tail rotor a ring; the
skids; in the world's own tones, HELI_BODY #eceff2 and HELI_DARK
#2a2b2e), an `exitT` clock that runs for EXIT_S = 1.5 s from every
`resetJump`, during which the diver hangs from the near skid, lets go at
0.6 s (LETGO_S; steering ignored throughout the exit) and comes to the
centre at full size while the helicopter recedes out of the top; the
fall rate builds with a smoothstep over the same 1.5 s, so the exit
costs about 0.75 s of freefall time (the altimeter reads about 12,970 ft
when the helicopter is gone). A pull made while the diver still holds
the skid is kept (`pullWanted`, `holdingOn()`) and fires at the let-go;
a pull made later in the exit opens the canopy while the helicopter goes
on receding (`exitT` keeps running through `opening`, and arms that had
not finished opening go on opening). The exit is announced in a running
jump as the still is ("Exit from the helicopter, 13,500 feet"). The
compact idle shows the helicopter passing out of the top (PASS_S = 1.8 s,
`passT`) at mount, after a close and after each wrap back to 13,500 ft,
fading in over PASS_FADE_S = 0.25 s, the length of the digit dip (the
first cut's pass popped in whole; the fix round cut it, and the round
that followed brought it back with the fade, so a visitor who never
clicks still sees where the diver jumps from); under reduced motion
there is no pass. The first reduced-motion still is the
exit, held on the skid at EXIT_STILL = 0.3 of the exit, announced as
"Exit from the helicopter, 13,500 feet" (check.mjs updated to match, and
its click after the let-go now waits on the posted altitude rather than
the clock); reduced motion coming on in a running jump that has already
left the helicopter holds the altitude reached instead (`setStill(i,
alt)`) and says "Freefall" with that altitude. The check passes in full:
0 failed, zero page errors; captures in docs/circuit/v15/final/helicopter/
(refreshed after the fix round).

## The review round (2026-10-10)

dd49613 went to a review workflow the same night: five reviewers (world
code, skydive code, design, runtime, world runtime and docs) and a
completeness critic over what the five had not looked at; then a panel
of three lenses on every finding (code, is the defect in the source;
repro, does it show in headless Chrome against the review server on
8646; impact, does a visitor meet it, and is the proposed fix the
smallest one), a finding standing when two of the three agreed; then
fixers by file (world, skydive, docs), a recheck run alone on the fixed
tree, and the critic once more over the fixes. The helicopter section
above was rewritten by that round to the module as it stands; this is
the record of the round from the module's side. round-6.md section 7 is
the same record for the whole aircraft. Reviewers and verifiers wrote
nothing inside the repo; their probes and captures are in the session
scratchpad under review/ (skydive-defects and skydive-states for the
module, design-judge for the tile captures, and one folder per lens and
finding). Nothing committed.

| dimension | raised | confirmed |
| --- | --- | --- |
| world code | 5 | 5 |
| skydive code | 6 | 6 |
| design | 9 | 7 |
| runtime | 6 | 6 |
| world runtime and docs | 9 | 6 |
| completeness critic | 5 | 5 |
| all | 40 | 35 |

What the module's two reviewers read and ran. Skydive code: all 1,002
lines of circuit/skydive.js against the commit, with skydive.css, the
harness and check.mjs; verified by hand and found right the skid
placement (feet at y 64 in diver units, `k * scaleD * diverS` landing
them on the near skid at heliY + 42 heliS), `drawHeli`'s canvas state
(save and restore round the font, letterSpacing, alignment and line
settings, globalAlpha untouched), the font fallback, the per-frame cost
of the exit (about 25 path ops and one fillText for 1.5 s a jump), the
exit against the AAD (it cannot fire above 13,000 ft), `setStill(0)` and
`resumeStill(0)`, `onReduced` mid-exit, the 100 ms window between
ARM_MS and LETGO_S, keyboard steering held at 0 through the exit, the
IntersectionObserver freezing `exitT` with the loop, resize and destroy
mid-exit, two tiles in one host and the self-linked stylesheet.
Runtime: every state from a fresh load, one Chrome at a time: Escape
during the exit on the harness and the live page, arrows held through
it, Jump again from the end state, reduced motion from the start,
resize 1280 to 360 to 1280 mid-exit, scrolled out of view mid-exit and
mid-pass, destroy mid-exit, ?two=1, ?nocss=1 with the stylesheet
delayed 1.5 s, ?open=1, focus through the whole keyboard run, phones at
360x740 and 390x844, frame cost at DPR 3 (rAF callback 0.13 ms idle,
0.15 during the exit, p95 0.3). Zero page errors and zero module
console errors in every case. The design reviewer judged the tile from
captures at 1440x900 and 390x844 (the jump at 60, 350, 650, 950 and
1,300 ms, the compact wrap every 200 ms for 2.5 s, the reduced-motion
exit still): the exit itself reads as "jumping from the Betta
helicopter" in both tiles once the diver lets go, and the
diver-to-cabin proportion is about half the cabin length; neither was a
finding.

The findings on the module (17 of the 35 confirmed), and what became of
each:

- A pull between 0.6 and 1.5 s cut the exit: the helicopter vanished
  and the diver jumped to full size at the centre in one frame (raised
  by skydive code and again by runtime). Fixed, edit 10 below.
- A pull in the first 0.6 s was swallowed while the hint said "Click to
  pull" and the pill was live (raised twice as well). Fixed, edit 10.
- check.mjs path 7 relied on 700 ms of wall-clock to cover 0.6 s of
  simulated exit, so under throttled frames the click was swallowed.
  Fixed, edit 15.
- Reduced motion switched on during the compact pass froze the
  helicopter in the reduced idle still. Gone with the pass, edit 11.
- The compact pass popped in: the helicopter appeared whole, fully
  inside the frame, on the first frame after the wrap (raised by
  skydive code as a fade, by design as a cut, the design finding rated
  high). Cut, edit 11.
- This report's exit altitude was wrong: the exit ends near 12,970 ft
  and the cabin is out of the top by about 0.9 s (near 13,350 ft), not
  12,800 ft (raised twice). Corrected in the section above, edit 18.
- The reduced-motion exit still hid the B of BETTA behind the diver.
  Fixed, edit 12.
- The main rotor strobed, three solid blades stepping a fifth of the
  spacing a frame (the tile's half of a world finding). Fixed, edit 16.
- In the tile the rotor disc ran under the altimeter plate on the
  desktop (the "tail rotor clipped at 390" half did not hold: the ring
  sits 5.6 px inside the edge). Fixed, edit 13.
- Reduced motion switched on mid-jump rewound the dive to the exit
  still at 13,500 ft, and motion coming back replayed the exit. Fixed,
  edit 12.
- A motion jump never announced the exit to assistive tech; only the
  stills said "Exit from the helicopter". Fixed, edit 14.
- The compact tile showed no helicopter at mount and none after Back or
  Escape, only after the first wrap. Overtaken by the cut of the pass.
- On a 360x740 phone the Pull pill opens 12 px below the fold, and
  scrolling to it slides the scene under the sticky head. The round-6
  sheet layout, not from dd49613; left for Abba (below).
- The section above still documented PASS_S and passT, "no pull before
  the let-go" and a still "held just after the let-go" (the critic,
  reading the fixed tree). Rewritten, edit 18.
- The tile's helicopter differed from the world's once the world's
  blades went: the tile still stroked three blades and a spinning tail
  blade (the critic). Fixed, edit 16.
- After the cut, the compact tile never shows the aircraft, so a
  visitor who does not click never sees where the diver jumps from (the
  critic). Recorded as Abba's decision, not repaired (below).

The edits, by file (the whole round's, since the aircraft is one thing
in two places; the map regeneration counted once, though it ran twice):

1. circuit/world.js: the helicopter's ground shadow cut (the mesh, its
   placement and fade, the declaration): it lay on the paper past the
   plate edge, sat 560 px from the aircraft at opacity 0.07 and was
   gone for 42 percent of the lap. Three findings closed at once.
2. circuit/world.js: the tail-rotor disc gets a back face in the merged
   graphite Builder, so it shows from either flank round the lap.
3. circuit/world.js: the environment blur 0.05 to 0.04, the widest that
   fits the PMREM generator's twenty taps; the console is empty on load.
4. circuit/layout.js, circuit/world.js, tools/circuit/map.js: HELI.at
   [150, 22, 70] to [150, 22], height the one altitude; the stale
   shadow rotation line and comment went with the shadow.
5. tools/circuit/map.js: the glyph's shadow circle cut, to match the
   world.
6. circuit/layout.js: HELI.height 92 to 68, the lowest height still
   above the blimp's 62 and clear of every mark (the About roof at 55.8
   cleared by 5.7 units); at the 1440x900 rest view the hull is
   entirely above the frame for 4.4 percent of track frames (about 25
   at 92) and cut by the top edge for 36; at 390x844 it never fully
   leaves. Both height findings closed.
7. circuit/world.js: the three blades, the rotor group and the spin
   cut; the main rotor is one disc at opacity 0.14. One draw call
   fewer.
8. circuit/world.js: M.cabin, an opaque MeshStandardMaterial #eceff2,
   for the cabin mesh alone (M.white, three districts' candy, untouched).
9. circuit/world.js: the dead `if (loc.sky) continue;` in the LOCATIONS
   loop deleted.
10. circuit/skydive.js: one defect behind four findings, fixed at the
    root. `doPull` no longer sets `exitT` to -1; the clock runs on
    through `opening`, `draw()` computes the exit progress `e` for any
    jump phase (`S.mode !== 'idle' && S.exitT >= 0`) and draws the hang
    pose only in freefall, and `hangT = max(1 - letgo, snatch)` carries
    the let-go roll over, so a pull before the helicopter has gone
    leaves it receding at its own speed while the pilot chute comes out
    (cabin pixels after a pull at 13,380 ft: 8268, 7269, 5978, 4069,
    1997, 112, 0, the same slope as before the click). A press while
    the diver still holds the skid (`holdingOn()`, the first LETGO_S)
    is kept in `S.pullWanted` and fires as `doPull(true)` at the
    let-go, the canopy opening at 13,440 ft; the flag is cleared in
    `resetJump`, `setStill` and when a pull proceeds. No new UI state,
    no new copy; the whole jump, the AAD at 1,490 ft, Jump again and
    Escape run as before.
11. circuit/skydive.js: the compact pass cut: PASS_S, `S.passT`, the
    idle bookkeeping (`if (S.wrap >= 1) S.wrap = 0;` again) and the idle
    branch of `draw()`; the header comment no longer mentions it. After
    Escape the compact tile sits at 13,500 with 0 cabin pixels, and ten
    captures across the 9,000 to 13,500 wrap show the digits dip and
    return with nothing switching on.
12. circuit/skydive.js: `EXIT_STILL = 0.3` holds the exit still in one
    place: `setStill` puts `EXIT_S * EXIT_STILL` in `S.exitT` and
    `draw()` reads `e` from it (the old literal 0.42 inside `draw()` is
    why editing `setStill` alone changed nothing). `setStill(i, alt)`
    takes the altitude reached: a fresh open or a toggle during the exit
    gives the exit still at 13,500 with the helicopter; a toggle in a
    jump that has already left it holds that altitude in the arch, no
    helicopter, and says "Freefall, N feet" (10,440 ft in the probe),
    and motion coming back continues from there. The still's data-alt
    goes through `postAlt()` like every other state; `resumeStill`
    needed no change.
13. circuit/skydive.js: the rotor radius 150 to 105 in `drawHeli`: a
    replay of the module's formulas gives 0 px of plate intrusion
    through the exit at 490x306 and 348x217 (150 intruded 29 and
    18.6 px; 115 still 4.0 and 0.9).
14. circuit/skydive.js: `startJump`'s motion branch calls
    `say(STILL_SAY[0])` after setting the tile label; a MutationObserver
    on .sky-status saw ['', 'Exit from the helicopter, 13,500 feet'] on
    Enter, the cue, canopy and landed announcements unchanged.
15. docs/circuit/v15/skydive/check.mjs: path 7's `waitForTimeout(700)`
    is `waitForFunction` on data-alt 13,440 or lower (alt at 0.6 s is
    13,446, posted 13,450), with a two-line comment; since simulated
    time never outruns wall time this covers the 500 ms arming window
    too, and the 80 ms "opening" assertion stays.
16. circuit/skydive.js: `drawHeli`'s three-blade loop and tail blade
    cut, the disc fill 0.16 to 0.22, the signature `drawHeli(x, y, s)`,
    `spin` gone; the rotor comment says why. Pixel change per frame over
    the rotor band during the hang: 0 on the working tree, 4.1 to 5.5
    every frame with the committed module served through a route.
17. docs/circuit/map.svg, docs/circuit/map.html: regenerated with node
    tools/circuit/map.js, twice (at the committed layout, then after the
    world edits). Only the sky group changed.
18. docs/circuit/v15/round-6.md, docs/circuit/v15/skydive.md and
    docs/circuit/v15/final/helicopter/: section 6 and the helicopter
    section above rewritten to the working tree, the exit altitude
    corrected, and the twelve captures refreshed under the same names
    (exit-01 to exit-04 and reduced-still-exit from the harness on
    state waits, the two live exits from index.html, world-rest-1440 and
    world-helicopter-close from the live page; compact-pass.png deleted
    with the pass; gate-report.json and skydive-check-report.json
    replaced).

Not done, and why: the no-WebGL poster (images/wada-ring-poster.jpg)
still shows the blimp, no fixer owned it (run
/usr/local/bin/python3 tools/circuit/poster.py
'http://127.0.0.1:8646/index.html?poster=1' after the world edits; the
?poster=1 hides the HUD, pins, map and grid so they are not baked in
twice); the dead loc.sky guard at tools/circuit/poster.py line 84 and
the dead sky field at tools/circuit/gate.mjs line 177, not owned; the
shadow's rim-fade and clipping-plane variants and the compact pass at
mount and after Back, all overtaken by the two cuts; a frame-aware
altitude clamp in placeHeli, not taken (it couples the world to the
viewport, pins the hull to the canvas edge for a third of the lap and
needs a floor and a zoom gate); the phone sheet, left for Abba; the map
glyph's BETTA banner running past its cabin rect, a docs-only nit
recorded in round-6.md section 6.

Three decisions this round left to Abba; right after the round the first
two were taken against the ask as written (the height is now a band, 92
over the near half of the plate and 68 over the far half, and the compact
pass is back with a fade on the digit dip, see the section above), and
the third stays open:

1. The height: 68 is above the blimp (6 units, about 26 px at the
   desktop rest view), and the hull still leaves the top of the
   1440x900 frame over the far half of the lap; the height that never
   leaves that frame is 50 to 55, below the blimp. Higher than the
   blimp, or always in frame.
2. The compact tile: the diver and the count alone, the aircraft seen
   only after the click (as now), or the pass back at each wrap as a
   fade in the digit dip with the smaller disc kept clear of the plate
   (a one-line change either way).
3. The phone sheet: grow it to 76vh while the jump is open
   (`.ring-panel:has(.sky.is-open)` in circuit.css's max-width 760px
   block, so the Pull pill sits at 589 to 629 of 740 with no scroll),
   or leave it at 54vh with the pill one short scroll down. The
   in-module alternative (hide the touch hint on phones, cap the scene
   at calc(54vh - 224px)) would cut the only words that tell a phone
   visitor to drag to steer and squash the scene to 122 px at 360x640,
   so it was not taken.
   Decided 2026-10-11: 76vh while the jump is open, as the rule above.
   Measured live at 360x740: sheet 400 before, 562 open, the pill at 589
   to 629 with the hint showing, 400 after Back; 1440x900 unchanged;
   skydive check 81 of 81, no page or console errors.

Rechecked alone on the fixed tree, twice (after the fixes, and again
after the docs were rewritten); the second run's numbers, the first in
brackets where they differ:

| check | result |
| --- | --- |
| the module check (docs/circuit/v15/skydive/check.mjs, run alone) | 81 of 81, 0 failed, pageErrors [] and consoleErrors []; frames idle 0.20 ms mean (p95 0.5), freefall 0.13 (p95 0.4, max 5.6), canopy 0.09 (p95 0.3) [0.16, 0.11 and 0.12]; the cue at 3,990 ft, the glide from the cue 18.1 s, the AAD at 1,490 ft 6.69 s after the cue, the post-let-go pull waited on the posted altitude and opened, reduced-motion still 1 at 13,500 ft announced "Exit from the helicopter, 13,500 feet" with the diver on the skid under BETTA; no timing retry |
| gate audit (tools/circuit/gate.mjs, 1600x900 and 1440x900) | every overlap category empty at both widths; 204 draw calls and 51,184 triangles; 59.5 fps at 1600 and 59.7 at 1440 [59.1 and 60.3]; gate errors [] |
| live page (Playwright over Chrome, DPR 2, 1440x900 and 390x844, one browser at a time) | zero page errors and zero console errors at both sizes; the Projects pin clickable at both, the tile first in the grid and idle (13,170 ft, "Skydiving, press to jump"); at 405 and 395 ms after the tile click data-phase freefall, data-alt 13490, the live region "Exit from the helicopter, 13,500 feet", the label "Skydiving, arrow keys steer, press to pull", the diver hanging arms-up from the near skid under BETTA with the whole aircraft in frame; at 1,855 and 1,846 ms still freefall at 12,760 and 12,800 ft, the arch over clouds, the helicopter gone out of the top; the helicopter in the world the one Group at scale 1.4 with five children and no shadow mesh, on screen in both rest views; 204 calls, 59.3 and 58.8 fps |
| the hull up close (zoom 4, twelve frames) | on screen in all twelve as it follows the leader, 87 draw calls at that zoom; the cabin, BETTA, boom, fin, tail ring and skids read |

docs/circuit/v15/final/helicopter-review/ holds that evidence: 48 files,
6.36 MB. The check's 18 harness captures (01-compact-grid.png to
18-aad-fires.png) with check-report.json and check.log;
gate-wide-1600.png, gate-wide-1440.png, gate-report.json and gate.log;
eight live captures (rest, Projects open, the jump at 350 ms and at
1,800 ms, at each size; the jump shots clip figure.sky with its pill,
hint and status) with live-report.json and live.log; frame-01.png to
frame-12.png with frames-report.json and frames.log. The 18 PNGs over
300 KB were quantized with pngquant (quality 80 to 100) and all 40 run
through oxipng to bring the folder under the 8 MB budget, dimensions
unchanged; the lossless originals are in the scratchpad
(review/final-verify/originals/). The folder is review scratch written
inside the repo by the recheck stage and stays untracked; the module's
evidence for the commit is docs/circuit/v15/final/helicopter/,
refreshed by edit 18.

### Failures

Every command that failed across the review workflow (the whole round,
not the module alone), by stage, and what fixed it. The world-code and
runtime reviewers had no failed command, and the recheck's four runs
(check, gate, live, frames) all exited 0 and fell short only on the
folder's size. Everything here was fixed at the root and re-run, except
item 40, which says so.

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
