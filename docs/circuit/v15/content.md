# Round 15, content: the court clip, the third video, Skydiving on the shelf page

Scope: cases.js, betta.html, projects.html, two new files in videos/, two new
posters in images/. No circuit file, no index.html, no styles.css touched.
Checked with Playwright over real Chrome (tools pattern from gate.mjs) on port
8655, 50 checks, all passing, zero page errors and zero console errors at 1440
and 390, with JS off, and under reduced motion. Captures and the check log sit
in docs/circuit/v15/content/.

## 1. The court clip

(This section describes the first cut, the pitch edit, which the fix round
below replaced with a plain cut of rep 6 straight from the raw footage; the
numbers here are history. Corrected on 2026-10-10: the pitch edit showed rep
6 at real time and at half speed, then rep 18 as the no-buzz rep; an earlier
draft of this paragraph said "rep 8", and there was no rep 8 in it.)

Source: ~/Techstars_Betta/pitch/la-tech-week/one-rep_9x16.mp4 and
one-rep_16x9.mp4, the LA Tech Week cut of rep 6 (then rep 18) from the first
court session (8 Oct 2026). Both are 37.3 s, H.264 High, 30 fps, 1080x1920 and 1920x1080,
with an AAC stereo track at about 84 kbps. The audio is not room sound: the
edit plays each vibration the sleeve made as a low tone (mean level -22 dB,
peaks at -5 dB), so it is meaningful and was kept.

Encode: libx264 High, yuv420p, crf 26, preset slow, lanczos scale, AAC 96k
target, faststart (moov sits at byte 36 in both files). A crf 27 pass was made
first and came in at 1.72 MB and 1.70 MB; with half the budget unused, crf 26
was taken for the real footage. The AAC encoder reports about 44 kbps on the
finished files against the 96k target, because most of the track is silence
between tones; nothing was dropped.

| file | before (source) | after |
| --- | --- | --- |
| videos/betta_court_rep.mp4 (720x1280) | 9,699,835 B (9.25 MiB) | 1,902,375 B (1.81 MiB) |
| videos/betta_court_rep_wide.mp4 (1280x720) | 10,252,637 B (9.78 MiB) | 1,875,113 B (1.79 MiB) |
| images/betta_poster_court.jpg (720x1280) | none | 116,138 B |
| images/betta_poster_court_wide.jpg (1280x720) | none | 112,218 B |

New weight in the repo: 4,005,844 B (3.82 MiB). Nothing else in videos/ or
images/ changed; betta_rig.mp4 stays, betta.html still uses it.

Posters: frame at t = 7.0 s in both clips, the player at his set point with
the ball up, the SLEEVE callout on his arm and "Set" lit (the one firm buzz).
Cut from the source at full size, scaled with lanczos, JPEG quality 82
(Pillow, 4:2:2, progressive). Corner sweep on both posters: top corners carry
only the dark margin and the rounded video window (the wide one has the
clip's own time stamp top right), bottom corners carry the clip's own footnote
line. No watermark, no mark from any tool.

Overlay text in the clip: a title card ("One free throw, as he felt it."),
rep tags, a hand-tilt dial, vibration and hand-speed traces, "HALF SPEED"
tags, a closing card and a footnote that reads, in full: "Real sensor data
from the sleeve, synced to the video. One player, first session, 8 Oct 2026.
Vibration shown as sound. Rep 18 used the set point the sleeve re-learned
after rep 6." No person is named anywhere in either clip.

Wiring. The Betta case 'video' in cases.js now points at the portrait clip
with the given alt and caption; the case back renders it as before through
mediaHTML() (plain src and poster, muted, loop, playsinline,
preload metadata, autoplay unless reduced motion), and capture: true still
mounts the recorded-rep graphic from betta-capture.js beside it. Verified
flipped at 1440 and 390: the clip is playing, muted, with the caption
"RECORDED · OCT 8, 2026 · FIRST COURT SESSION. 21 OF 28 REPS BUZZED." and
the rep graphic live; Esc closes. Under reduced motion the clip sits on its
poster and the graphic opens on the best rep, as designed.

betta.html gets a third figure.betta-video with the landscape clip, same
markup as the others (data-src, data-poster, controls, preload none,
playsinline, width 1280, height 720, aria-label), and the figcaption in the
page's caption style. The script.js data-src loader attaches the file when
the figure comes within 400 px and the poster loads at 1280x720 (checked).

The "Working prototype" stat said "Next comes moving the electronics into an
actual sleeve." That is no longer true: prototype 1 arrived 5 Oct with the
board inside the sleeve and a player shot in it on 8 Oct. It now reads:
"Everything runs end to end inside the sleeve. On Oct 8, 2026 a player shot
free throws in it on a real court." The other two stats were still true and
were left alone, as was every other line on the page.

## 2. Skydiving on the projects page

EXTRA in cases.js has a third row: id skydiving, cat Wearables, title
"Skydiving Project #2", serial AWUS-30510, line "A jump instrument in the
making: barometer, LiDAR, GPS, haptics.", one link, WATCH THE REEL, to
https://www.instagram.com/reel/Ddv8Qr_gruP/ (links in the same shape CASES
uses, so a renderer can treat them alike). The plain list in projects.html
has the matching row under Wearables, after Posture Cue, with target _blank
and rel noopener noreferrer. No cover art, nothing added to CASES.

What a visitor actually sees: with JS off, the Wearables group shows the
Skydiving row with the reel link (captured at 1440 and 390). With JS on,
projects.html hides the plain list and shows the shelf, and nothing in the
working tree renders EXTRA (it is only exported on window.CaseShelf), so the
shelf page itself shows no Skydiving. That matches the brief (the circuit
panel gets its own tile from another module) but it is worth saying plainly.

## 3. Checks

Playwright, chrome channel, headless, pageerror and console error listeners
plus a listener for any response of 400 or more. At 1440x900 and 390x844:
the shelf renders with the Betta case, the plain list is hidden, EXTRA holds
skydiving with the right category, serial and link, the Betta case video
data is the new file, the flipped case shows the new clip playing muted with
the new caption and the rep graphic, Esc closes the stage, betta.html has
three figures, the third gets its src and poster from the loader, the poster
decodes at 1280x720, the figure is 16:9 on screen (760x428 at 1440, 350x197
at 390) and its caption matches. JS off at both widths: the Skydiving row
with its link and group. Reduced motion at 1440: the same set passes with the
clip on its poster. Zero page errors, zero console errors, zero failed
requests on every pass.

Grep of cases.js, betta.html and projects.html: no banned word (the only
hit is inside the proper name of the USC seed competition, already on the
page), no em dash, no organisational first-person plural. The same grep was
run on this report.

Captures (docs/circuit/v15/content/): projects-shelf-1440.png,
projects-flip-1440.png, projects-flip-390.png,
projects-flip-1440r-reduced.png, projects-nojs-1440.png,
projects-nojs-390.png, betta-videos-1440.png, betta-videos-390.png,
betta-full-1440.png, betta-full-390.png, check-results.json.

## Flags

- Third-party marks in the footage. The gym is USC's: the SC crest is on the
  wall banners and on the player's shirt, and a courtside sign carries the
  MUSCLE MILK and PECHANGA RESORT CASINO logos at his feet. They are
  incidental, in real footage the player approved, and the brief named this
  clip; but the hard rule says no third-party logos on any page, so this is
  Abba's call before it ships. The old rig clip had none of this.
- The clip is the pitch cut, not a plain court clip: title cards, a dial, two
  traces and a footnote, all baked in. On the case back the 9:16 panel crops
  it and the first seconds read as a title card. Abba's taste rule puts dense
  readouts in reports; this is his own LA Tech Week edit, so it is flagged,
  not changed. A plain cut of the same rep (court window only) would suit the
  case back better if he wants one.
- On a phone, the case-back caption wraps to two lines and sits over the
  clip's own baked words for most of the loop (the kicker "BETTA · FIRST
  COURT SESSION · 8 OCT 2026" first, then the traces and the footnote; an
  earlier draft of this note said "the first four seconds", the reviewer
  measured most of the loop), see projects-flip-390.png. Resolved by the fix
  round: the clip now on disk has no baked words at all.
- Two inline styles in betta.html, because styles.css is not mine:
  grid-column: 1 / -1 on the new figure (it spans the two-column grid, a wide
  clip under the two tall ones) and aspect-ratio: 16 / 9 on the video
  (.betta-video video is fixed at 9/16 with object-fit cover, which would have
  shown only the middle third of a landscape clip). A one-line rule such as
  .betta-video.is-wide in styles.css would replace both.
- The stat paragraph change is new copy on a frozen page, made only because
  the old line had become untrue; easy to revert if Abba prefers the old one.
- The audio stream reports about 44 kbps, not 96, for the reason above.
- The "21 of 28" figure is the hand-only count from the session memory (28
  reps, 21 rewarded) and matches the brief; the video analysis in the coach
  demo report counts 19 of 21 real shots buzzed, a different denominator. Both
  are true; the page uses the brief's number.

## Fix round (2026-10-10)

Scope unchanged: cases.js, betta.html, projects.html, videos/, images/. The
court clip was cut again from the raw footage, the case back got its engine
fixes, the shelf page got its rows, and betta.html became the three-beat
timeline. 112 checks pass over seven contexts (1440, 540 and 360 wide, JS off
at 1440 and 360, reduced motion at 1440 and 360) with zero page errors, zero
console errors and zero failed requests; the circuit page passes its own
listener and error check in both motion modes. Check script and build script
sit beside the captures: docs/circuit/v15/content/fix-check.mjs and
build_court_clip.py (the venv they ran in is the pitch render's, see the
script header). Captures: fix-flip-{1440,540,360}.png and the -t8 variants
(the half-speed replay under the caption), fix-flip-{1440r,360r}.png,
fix-shelf-*.png, fix-betta-videos-*.png, fix-check-results.json.

### The clip, cut again

The reviewers' crop was taken from the pitch edit. The raw iPhone footage
behind it exists (Betta_coach_demo/data/video/2026-10-08_144137_IMG_6681.MOV,
1080x1920 HLG, gitignored there), with no title card, no SLEEVE callout, no
dashboard and no footnote, so the plain cut comes straight from it:

- Crop 506x900 at (563, 375) of the raw frame, scaled to 720x1280 with
  lanczos. The pylon with its three logos and the left banner fall outside
  the crop. The player stands head to toe at about 57 percent of the frame
  height, a quarter in from the left, the gym opening to his right.
- Rep 6 at real time, video 50.9 to 56.3 s (5.4 s), then the same rep from
  51.867 to 56.0 s at half speed (8.27 s, every frame twice, no pause), 0.3 s
  fades at each end so the loop dips once. 13.67 s, 410 frames.
- Tone map: the pitch render's own function (HLG to BT.709, the same look as
  the stills Abba has seen). Encode: libx264 slow, crf 26, yuv420p, tagged
  BT.709, faststart (moov at byte 36). 1,488,730 B (1.42 MiB).
- Sound: the court at -14 dB under the real-time part (the ball, his shoes),
  plus the pitch render's motor tones at the sleeve's own intervals from the
  session log: three pulses, one 300 ms set buzz, one 500 ms good-rep buzz,
  each twice as long in the replay. Normalised to -16 LUFS, true peak under
  -1 dBTP. The case back plays it muted; betta.html has controls.
- Poster: the frame at 2.3 s (source 53.2 s, the set, the ball up), from the
  finished pipeline, JPEG quality 82 progressive 4:2:2, 125,516 B, no tool
  tags, all four corners plain gym.

The marks. What the crop leaves of the right banner is blurred, and so is the
pylon's last edge: the blur touches only pixels that match the empty court
(aligned frame by frame, because the phone on the floor jolts a few pixels
when the ball lands, 54.8 to 55.3 s) or that are the object's own ground,
with its lettering filled in, so the player in front of it keeps every pixel.
The gold SC on his shirt is painted out with a colour-masked inpaint: a strict
core (yellow against red, too little blue for skin, too much green for the
ball) grown into the mark's shaded edges and highlights, filled from the
maroon around it, capped so it can never swallow the ball. Checked on every
sixth frame: no gold left on the chest, the ball and the arms untouched. The
visible traces are a soft white patch beside his left shoulder, which reads
as an out-of-focus sign, and a dark soft shape at the lower left edge.

What remains is the player's own kit, which no crop or static blur reaches:
the ball's lettering and swoosh (about 41 by 13 and 22 by 9 CSS px on the
1440 case back at the set point, smaller everywhere else and a smear once it
moves), the swoosh on each shoe (about 11 by 4 CSS px) and a small white
swoosh on the shirt (about 9 by 6 CSS px). The reviewers drew the line at
the venue marks and the crest and said the kit may be Abba's to accept; I
drew it in the same place. If he wants the ball clean too, a tracked blur of
the ball's disc is a day's small work on the same script, at the cost of a
soft ball in the hero's hands. His call before push, as before.

Removed: videos/betta_court_rep_wide.mp4 and images/betta_poster_court_wide.jpg
(the 16:9 dashboard cut; it still carries the marks and the readouts, and it
stays available at pitch/la-tech-week/one-rep_16x9.mp4 if he ever wants it
linked).

### Each finding

1. Third-party marks on screen, both pages (major), and the two blockers on
   the posters and the clip. Remedied as above: venue marks cut or blurred,
   the shirt crest painted out, the wide files removed. The kit marks remain
   and are listed above for Abba.
2. Case back promises sound it cannot play (minor). Gone: there is no title
   card. The tones now live in the file's own track; the case back is muted
   and says nothing about sound, betta.html's caption says "sound on".
3. Caption over the baked kicker at 360 and over the trace under reduced
   motion (minor), and the two majors on the caption printing over the clip's
   words. Gone: nothing is baked into the picture. The caption is one line
   at 1440, 540 and 360 and sits on the floor reflection or the shorts.
4. destroy() leaves the stage's pointerdown and click listeners (minor).
   Both now go through on(), so destroy() removes them. Measured: #stage
   listener count unchanged across five mount/destroy cycles on
   projects.html; #ringStage stays at 0 across four Projects panel cycles on
   index.html (it was +2 per cycle).
5. destroy() during an animated close leaves the timers alive (minor). A
   closing flag and a shared settle(): an instant close now finishes an
   in-flight animated close and clears its timer; an open token makes the
   late frames of a cancelled open do nothing (the E4 cosmetic). The E5
   script passes: the second engine's Betta case is still open, with its
   flipper and body.stage-open, 1.1 s after the first engine's destroy.
6. No focus trap (minor, reported twice). Tab and Shift+Tab now cycle
   through the stage's visible controls (prev, next, close, the clip's
   button, the rep graphic's pause and slider, the two links) while a case is
   open; Esc still closes and returns focus to the case. Verified at all
   three widths, with and without reduced motion.
7. Report facts (minor). Corrected: the pitch cut showed rep 6 at real time
   and at half speed, then rep 18 as the no-buzz rep; there was no rep 8.
   The new cut is rep 6 only. The overlap was not the first four seconds, it
   was most of the loop, as the reviewer measured.
8. A 37 s muted loop with no way to stop it (minor). The clip now has its
   own button (the site's existing .video-motion-toggle style, top right of
   the picture): "Pause video" while it plays, "Play video" when stopped,
   aria-pressed follows. Under reduced motion it starts stopped on the
   poster and the button starts it. The loop is 13.7 s.
9. Copy notes (minor). "At the wrist" is gone (the clip's own card said both
   motors). Each caption now carries one number. The "Working prototype"
   stat stays as the builder wrote it; it is still Abba's call.
10. Two raster JPEGs (minor). One now, the poster, a frame of the clip, in
    the pattern every other video on the site uses.
11. Two inline styles on the third figure (minor, twice). Gone: the third
    figure is the portrait cut with the same markup as its siblings.
12. At 540 the shooter has no head (major). The crop puts the head top at
    about row 290 of 1280 at the set; the 540 panel shows rows 260 to 673, so
    the head, the ball and the torso are in (fix-flip-540.png). At 1440 the
    panel shows rows 200 to 1079: head to shoes. At 360, head to knees.
13. Eight of 37 s a paragraph (major). Gone; every frame is the player.
14. Two sessions share one case back (major). On my side the caption no
    longer says RECORDED and carries no date, so the two records no longer
    claim one name. The graphic's own kicker is betta-capture.js, outside
    this module: the ask stands, either relabel it "RECORDED · AUG 4, 2026 ·
    19 CURLS ON THE RIG" or rebuild it from the Oct 8 log, 28 bars, gold for
    a buzz on reps 2 to 7, 9, 10, 13 to 17, 19 to 24, 27 and 28 (21), graphite
    for silence on reps 1, 8, 11, 12, 18, 25 and 26 (7), kicker "OCT 8 · 28
    REPS · 21 BUZZED".
15. Four numbers in the caption (major). Case back: "FIRST COURT SESSION ·
    21 OF 28 REPS BUZZED." betta.html: the date is the number, see 19.
16. betta.html's third figure the densest frame on the page (major). It is
    now the portrait cut, 720x1280, controls, preload none, playsinline, the
    poster at 720x1280, 9:16 on screen at every width (checked at 1440, 540
    and 360). The three figures sit in the page's two-column grid, so the
    third stands alone on the left of its row; if that reads as unbalanced a
    one-line styles.css rule can centre it.
17. Skydiving invisible with JS on (major). mount() takes an extra host (a
    .plain-group under the shelf, heading "No case yet", projects.html) and
    render() fills it from EXTRA in the same filter as the cases: Wheelchair
    Basketball Volunteering with its video, The Medici Network, and
    Skydiving with the reel link. Those two ride along because they are the
    same kind of thing, projects without a case, and the circuit's Projects
    panel already lists them the same way. The chips filter the rows too
    (Wearables shows Skydiving alone). The circuit's grid mount passes no
    host, so nothing changes there.
18. "Skydiving Project #2" (minor). Now "Skydiving" in cases.js and in the
    plain list, the name circuit/layout.js gives the car.
19. The page does not yet read as the timeline (minor). The rig caption
    reads "Aug 4, 2026. The capture rig on a real arm, every rep recorded."
    (the date from the old case caption Abba shipped). The court caption
    reads "Oct 8, 2026. First court session, sound on: one long buzz means a
    good rep." The first clip keeps its line: its file stamp is 14 Aug 2026
    20:17 UTC, the same minute as the rig file's, which is the day both were
    exported, not a recording date, so I have no date to print for it. The
    arm-strap beat in Abba's sentence is the lab's Jan 2026 stage (the
    posture board on a forearm), which has no clip on this page, so the rig
    caption does not claim to be it.

### Noted, not changed

- In fix-betta-videos-360.png the first figure shows black: my script jumps
  straight to the last figure, and the data-src loader attaches a poster
  only within 400 px of the viewport, so the first one was never reached.
  A visitor who scrolls passes it and it loads, as in the builder's capture.
- The ball lands near the phone about a second after each release and the
  picture jolts a few pixels for half a second. It is the real footage and
  it stays.
- The "No case yet" rows put the 12 MB wheelchair video on the JS projects
  page for the first time, preload none, poster only until pressed, exactly
  as the no-JS list has always had it.

## Fix round 1 (second pass, 2026-10-10)

This pass follows the "Fix round" section above and the interrupted second
fixer, whose two changes were already on disk and were kept: the pause pill
in the picture's top-left corner (an inline left/right on the button in
cases.js mediaHTML, since styles.css is not this module's) and the Escape
guard (preventDefault and stopPropagation when an Esc actually closed a case).
Same scope: cases.js, betta.html, projects.html (unchanged this pass),
videos/, images/. The check script docs/circuit/v15/content/fix-check.mjs
was extended and re-run on port 8657: 150 checks pass over ten contexts
(1440, 540 and 360 wide; JS off at 1440 and 360; reduced motion at 1440 and
360; the engine contract at the three widths; the Wada Ring's Projects panel
with and without reduced motion), zero page errors, zero console errors, zero
failed requests. Captures overwritten in place (fix-flip-*, fix-shelf-*,
fix-betta-videos-*, fix-check-results.json).

### The clip, as shot (Abba's direction, recorded by the orchestrator)

Keep the real footage real: no blur, no inpaint, no mask on any banner, shirt
mark or hoop-base mark. videos/betta_court_rep.mp4 was rebuilt from the same
scratch build (build.py, now with a PAINT=0 switch that returns each frame
untouched; the copy beside the captures, build_court_clip.py, carries the
same switch): the same raw iPhone source, rep 6 at real time then at half
speed, the same 506x900 crop at (563, 375) scaled to 720x1280, the same tone
map, the same court sound and motor tones. 410 frames, 13.67 s, 1,526,258 B
(1.46 MiB, 37.5 KB more than the painted file: flat paint compresses better
than lettering), moov at byte 36, audio -16.0 LUFS. The poster is the frame
at 2.3 s from this pipeline, JPEG quality 82 progressive 4:2:2, 129,528 B,
720x1280, no EXIF, no ICC, no tool comment.

The painted version is parked for comparison, not in the repo:
/private/tmp/claude-501/-Users-abbawada-Techstars-Betta/d2cbf270-c5b8-4a97-b867-e345c7e716ea/scratchpad/content-fix3/betta_court_rep_painted.mp4
(and betta_poster_court_painted.jpg beside it; frames/compare.png puts the
two cuts side by side at 2.3 s and 4.9 s).

What the unpainted clip now shows, for Abba's sweep before push: the gold SC
on his shirt in 77 of 410 frames (the reviewer's pixel count, max 92 pixels
in the chest window, first at frame 111 as he lowers the ball; at the set it
is hidden behind his arm); the right banner's "Trojans", SC and NCAA text
beside his shoulder; the pylon's right edge at the lower left of the frame
with partial sponsor lettering ("CHANGA" and the edge of the mark above it,
about 50 px wide in the 720 px file, about 30 CSS px on the 1440 case back),
which the crop could not drop because the raw frame has no room to the
right (563 + 53 + 506 exceeds 1080); the hoop-base lettering; and the kit
marks listed in the earlier round (ball, shoes, shirt). The venue marks are
USC's own; the pylon sliver is the one commercial mark in the picture, and
the painted file is there if he wants that single blur back.

### Each finding

1. Crest comes back for 18 frames, kit marks and hoop base remain (major).
   Overtaken by the direction above: nothing is painted now, the crest is
   simply in the footage, and all of it is listed for his waiver.
2. Two sessions share the case back (major). The rig graphic
   (betta-capture.js, 4 Aug curl session) has no label option and that file
   is outside this module, so it cannot carry an honest kicker of its own
   from here. Chosen: capture: false on the Betta case; the court clip
   stands alone on the case back, with its one-number caption, and the rig
   keeps its place on betta.html under its own dated caption. Checked:
   no [data-live] slot and no .live node on the open case at any width or
   motion setting. The gist side of the spread is now the kicker, the
   title, the line and the bar, so it has open space at 1440 and in the
   stacked spread; if that reads as empty, a shorter stacked panel is one
   styles.css rule (the 40 percent media row), not mine.
3. Wheelchair poster on the JS projects page (minor). Left as it is: the
   same poster has been in the no-JS list since the first publish and in
   the circuit's Projects panel since round 4 went live, and the direction
   on real footage applies to it as well. Listed here so he sees it before
   push: images/wheelchair_poster.jpg shows kids and volunteers at the
   programme, a USC-print shirt, a swoosh on a polo and a mark on the wall
   banner, at 420 px wide under "No case yet". The 12 MB video stays
   preload none and is never fetched on load (verified again, zero
   requests to videos/Wheelchair_Basketball.mp4 across all contexts).
4. "rep 8" and "first four seconds" in section 1 and Flags (minor). Both
   corrected in place at the top of this file, with a note that section 1
   describes the superseded pitch cut.
5. Pause pill under the close X below 920 px (major). The second fixer's
   placement verified at 360, 540 and 1440 (and the circuit grid): the
   pill's top-left corner sits 12 px inside the picture, 144 px of clear
   air to the X at 360, 308 at 540, 852 at 1440; 0 of 290 sampled pill
   points resolve to the X; the reviewer's tap 6 px inside the pill's
   top-right corner pauses the clip and the case stays. Top band captures
   from the second fixer (fix2-flip-*-topband.png) still match.
6. One Esc under reduced motion closes the Projects panel too (major). The
   second fixer's guard verified: in the Wada Ring at 1440, reduced and
   animated, one Esc hides #ringStage and leaves #ringPanel open with
   body.ring-open; the second Esc closes the panel; zero page errors.
7. destroy() inside the 170 ms swap throws at cases.js:453 (minor). The
   swap timer is now swapTimer, carries the open token, bails if the token
   moved or nothing is flipped or the front face is gone, and settle()
   clears it. The reviewer's repro (open, step, destroy 40 ms in) runs
   clean at 1440, 540 and 360: stage hidden and empty, no page error.
8. destroy() leaves the shelf alive and a second mount triples the chips
   (minor). Every listener the engine adds now goes through on(): the
   chips, the prev/next arrows, the shelf's scroll, pointerdown and wheel.
   destroy() removes them, then empties the shelf (the cases and their
   listeners go with the nodes), empties and hides the rows under the
   shelf, removes the chips it appended and hides the arrows. Two
   mount/destroy cycles on the page's own hosts: chips 5 before and after,
   #shelf listeners 3 and 3, #shelfPrev 1 and 1, zero cases and rows left,
   stage hidden. Note for the record: on projects.html the page's own
   engine shares those hosts, so that abuse path now leaves it an empty
   shelf until a chip re-renders it; nothing on either page calls destroy
   on a shared host.
9. Live reduced-motion change and hidden tab ignored (minor). cases.js
   listens to the media query's change (addEventListener, with addListener
   as the fallback) and to visibilitychange: motion reduced or tab hidden
   pauses the open case's clip, and clicks the rep graphic's own Pause
   button if a case ever mounts one, so betta-capture.js needs no change;
   motion allowed again or tab visible resumes only what this code
   stopped, and a clip the visitor paused stays paused. Verified at 1440,
   540 and 360: visitor pause holds through all four changes; playing,
   reduce stops it (button "Play video"), no-preference resumes it; hidden
   stops it, visible resumes it. Under reduced motion a hidden tab stops a
   clip the visitor started and nothing restarts it on return.
10. The what-counted figure on betta.html (new). Added after the court
    clip in .betta-videos, class betta-video for the page's caption style:
    images/betta_what_counted_1x.jpg with betta_what_counted.jpg at 2x,
    width 1600 height 900, loading lazy, decoding async, the given alt and
    figcaption. Verified: fourth and last figure, right after the court
    clip, 1x file served at DPR 1 (800x450), 16:9 on screen, no inline
    style. It takes the right slot beside the court clip at 1440 (360 px
    wide, so the picture's small print is a texture at that size) and the
    last row at 360; a one-line styles.css rule (grid-column: 1 / -1, and
    a border-radius to match the videos) would give it the full width.
    Both JPEGs carry a libavcodec encoder comment (Lavc63.1.102), not a
    visible mark; left as supplied. The picture itself is real footage with
    the same venue marks as the clip, plus the pylon's sponsor logos in its
    left panel, so it rides on the same waiver.

Grep of cases.js, betta.html, projects.html, fix-check.mjs and this report:
no banned word (the one hit is the proper name of the USC seed competition,
already on the page), no banned phrase, no em dash, no organisational
first-person plural.

### Failures

- `/usr/bin/python3` crest-pixel count: a missing numpy module (that
  python has Pillow only). Re-run with the render venv's python
  (/private/tmp/claude-501/-Users-abbawada-Techstars-Betta/9471b3bd-40eb-4900-badd-36b117006fae/scratchpad/video/venv/bin/python),
  which has numpy and Pillow; same for every later array step.
- The second fixer's fix2.mjs logged 8 "pill clear of the X" FAILs with the
  pill already clear (its overlap test asked for zero rows shared as well
  as zero columns); not re-run. The pill geometry is asserted in
  fix-check.mjs with the correct test (no shared area, no pill point under
  the X, the corner tap lands on the pill) and passes at every width.
- No other command failed. The serve log shows BrokenPipe lines from the
  browser cancelling range requests on the clip, the usual noise of a
  video element closing a connection, not a failure of the server.

## Fix round 2 (2026-10-10)

Same scope: cases.js, betta.html, images/ (projects.html and videos/ untouched this
pass). The check script docs/circuit/v15/content/fix-check.mjs was extended and
re-run on port 8658: 165 checks pass over the same twelve contexts as round 1
(1440, 540 and 360 wide; JS off at 1440 and 360; reduced motion at 1440 and 360;
the engine contract at three widths; the Wada Ring's Projects panel with and
without reduced motion), zero page errors, zero console errors, zero failed
requests. The fix-* captures are overwritten in place by that run; new this
round: fix3-pill-360r.png and fix3-pill-560r.png (the hero under reduced motion,
the poster at the set), fix3-flip-360r.png and fix3-flip-560r.png (the whole
case), fix3-betta-videos-{1440,560,360}.png (the section) and
fix3-betta-fig4-{1440,560,360}.png (the fourth figure alone). Scratch work
(still.py, measure.mjs with measure.log, captures.mjs, the pill study in pill/,
the three candidate crops, the backups of the files before this pass) sits in
/private/tmp/claude-501/-Users-abbawada-Techstars-Betta/d2cbf270-c5b8-4a97-b867-e345c7e716ea/scratchpad/content-fix4/.

### 1. The what-counted picture (major): applied, in Abba's own pattern

The picture on the page was the LA Tech Week pitch render: the cinema still from
Betta_coach_demo/graphics/what-counted-v2/render.py (1920x1080, resized to
1600x900). That script also has a --web mode, and its own docstring says what
the web gets: the photos only, "no number and no caption (the site sets '21 of
21' and the words in HTML)". So the fix follows his pattern rather than the
pitch: the figure keeps its place after the court clip and becomes a real frame
of him, with the one number in the caption.

- The still: rep 14's release, the hero frame of the graphic (video t = 146.47
  s, the ball leaving his fingertips), decoded and tone-mapped with the court
  clip's own function (build.py's, the pitch render's HLG to BT.709), cropped
  458x814 at (622, 372) of the raw 1080x1920 frame and scaled with lanczos to
  720x1280 (2x) and 360x640 (1x): images/betta_counted_shot.jpg (120,741 B)
  and images/betta_counted_shot_1x.jpg (46,256 B), JPEG quality 82,
  progressive, 4:2:2, no EXIF, no ICC, no comment. Four corners swept: ceiling
  duct, ceiling, his shoe over the floor, floor. It is 9:16 like its three
  siblings, so the section is four tiles in two rows at 1440 (360x640 each),
  one column at 560 (420x747) and 360 (320x569); a DPR 2 context fetches the
  2x file (captures.log).
- The crop starts 2 px right of the pylon's edge, so the pylon with its SC,
  MUSCLE MILK and PECHANGA marks is out of the picture entirely, and the left
  banner with it. What remains is the clip's own waived set and nothing more:
  the right banner's edge behind his hip and shoulder (NCAA / NATIONAL /
  CHAMPIONS and "ojans SC" fragments at the left edge), the gold SC on his
  chest at release (small, in colour), the swoosh on each shoe and the ball's
  lettering. He stands about 17 percent in from the left: the crop cannot
  centre him without bringing the pylon back, and the ball and the sleeve keep
  35 to 40 px from the edge.
- Caption: "21 of 21 free throws counted." Alt: "A player releases a free
  throw in the Betta sleeve. The sleeve counted 21 of 21 free throws." One
  number, the same in both; the check asserts the caption's numerals are
  exactly 21 and 21 and that neither line carries 144 or 148. The markup is
  the siblings' (class betta-video, width 720, height 1280, loading lazy,
  decoding async, srcset 1x and 2x, no inline style).
- The dashboard picture went back to the report: moved (not deleted) to
  docs/circuit/v15/content/betta_what_counted.jpg and
  betta_what_counted_1x.jpg; the pitch originals stay at
  ~/Techstars_Betta/pitch/la-tech-week/what-counted_cinema_1920x1080.png and
  what-counted_cinema_1080x1920.png. The check asserts the page no longer
  references it and that both old URLs answer 404. If Abba waives it after
  all, the old figure was: img src images/betta_what_counted_1x.jpg, srcset
  with images/betta_what_counted.jpg 2x, width 1600 height 900, loading lazy,
  decoding async, alt "The sleeve counted 21 of 21 free throws; two other
  quick hand moves it ignored", figcaption "21 of 21 free throws counted. 144
  of 148 other quick hand moves ignored.", with the two files copied back
  into images/.
- Square corners: .betta-video video carries the 8 px radius and no rule
  covers an img, so the still has square corners beside the clips' rounded
  ones (fix3-betta-videos-1440.png). One line in styles.css, .betta-video img
  { border-radius: var(--radius); }, would match them; no inline style was
  added, as round 1 chose.
- Not changed, for the record: the same crop (x0 = 622, 458 wide, a 1.57x
  upscale instead of the clip's 1.42x) would drop the pylon fragment from the
  court clip as well, with no blur. The clip keeps the crop the direction
  named, and its lower-left fragment (SC, MUSCLE MILK, P / CHANGA pieces,
  visible in fix-flip-1440r.png) stays on the round-1 list for his sweep.

### 2. The pause pill on the ball (minor): applied

- The pill keeps the site's top-right corner: he stands a quarter in from
  the left, the ball at the set is top-left, and the gym opens to his right,
  so that corner never holds the subject. In the stacked spread (under 920
  px) the case's close X sits in that corner, so there the pill drops
  2.75rem: mediaHTML emits one inline top:2.75rem when window.innerWidth is
  under 920 (the same break as stageSize() and the 919 px media block) and
  nothing in the wide spread. The old left:0.75rem;right:auto is gone, and
  the comment above it says why and names the one styles.css rule that would
  replace it.
- Measured on the poster at the set (measure.log, reduced motion) at 360,
  390, 430, 540, 560, 768 and 919: the pill's top sits 45 px into the hero,
  13 to 14 px from its right edge and 14 to 15 px under the X's bottom; the X
  and the pill share 17 px of width but no height, 0 of 270 sampled pill
  points resolve to the X, and the corner tap is the pill's. At 920, 1024 and
  1440 the X is at the card's far corner and the pill is in the hero's own
  corner, 12 px in. fix3-pill-360r.png and fix3-pill-560r.png show the ball
  and his hands clear of it; the round-1 X check still passes everywhere.
- Check added: "pause pill top-right, off the ball" at the five flip
  contexts (right of the hero's 55 percent mark, 10 to 16 px from its right
  edge, under the X by at least 10 px when stacked, in the corner when wide).

### 3. The wheelchair poster (minor, no fix asked): unchanged

Listed again so it is in front of Abba before push: images/wheelchair_poster.jpg
under "No case yet" (420 px wide at 1440 and 560, 320 at 360) shows real people,
a USC-print shirt, a swoosh and a wall mark; the 12 MB video stays preload none
and the check's failed-request listener saw no fetch of it in any context.

### Noted, not changed

- In fix3-betta-videos-360.png the first two figures show black: the capture
  jumps straight to the fourth figure and the data-src loader attaches a
  poster only within 400 px of the viewport, as noted in round 1.
- The Lavc encoder comment the round-1 report mentioned belonged to the
  dashboard JPEGs, which are now out of images/; the new pair carries none.

### Failures

- No command failed in this pass (every exit was 0; the check script's exit
  line is "exit 0"). Two outputs were too large for the harness to show
  inline (the first read of this report and of cases.js) and were re-read in
  parts; not failures. The serve log on 8658 holds only the usual BrokenPipe
  tracebacks from the browser cancelling range requests on the clip
  (serve.py silences request logging, so those are its only lines), not a
  server failure.
- Housekeeping in this file: the round-1 Failures entry above named the
  Python exception for a missing module, whose letters contain a banned word
  when grepped case-insensitively; reworded to "a missing numpy module" so
  the grep gate stays clean. Same meaning.
