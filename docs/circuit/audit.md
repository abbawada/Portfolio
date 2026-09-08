# Phase 0 audit: the current portfolio

Audited 2026-09-05 against ~/Documents/Portfolio-clean-recreate, branch
betta-renovation. Live main (d46a98f) is a squash of this tree, so this is
also the live site. Screenshot: docs/circuit/phase-0.png (home, shelf, the
Betta case open, the Betta page).

Gate for this phase: sections 2 and 3 below are the preserved-element list
and the project inventory. Abba confirms, then Phase 1 (flat SVG map) starts.
Section 5 lists the decisions that block Phase 1.

---

## 1. Stack, deployment, fonts, palette

- Static HTML, CSS, JS. No build step, no framework, no package.json, no
  node_modules. Vanilla JS in IIFEs. The build prompt's "match what exists"
  therefore means vanilla JS plus Three.js loaded as a plain script.
- Five pages: index.html, betta.html, projects.html, writing.html, about.html.
  One stylesheet, styles.css (38 KB). No footers on any page.
- Scripts: wave.js (8.4 KB), halftone-live.js (19.7 KB), script.js (5.1 KB),
  betta-capture.js (7.2 KB), and an inline shelf script in projects.html
  (about 20 KB). Roughly 60 KB of JS today, unminified, uncompressed.
- Hosting: GitHub Pages off main at https://abbawada.github.io/Portfolio/.
  No CNAME, no custom domain. No analytics of any kind (grep for gtag,
  plausible, umami, fathom, goatcounter: nothing).
- Fonts (Google Fonts): Schibsted Grotesk 400 to 800 (display, letterspaced
  caps eyebrows), Newsreader variable (body serif, italic). projects.html
  alone also loads Chakra Petch 600/700 italic for the case spine wordmark,
  per tools/chrome-spec.md. Chakra Petch is the obvious candidate for the
  single condensed "broadcast" face the build prompt allows for nav chrome;
  it already ships, so no fourth font.
- Palette, styles.css :root. Paper #f7f5f0, ink #141414, muted #6b675f,
  hairline rgba(20,20,20,0.12), accent #c6a15b, accent-ink #8a6b2f. Dark set
  (Betta showcase, case backs): bg #0b0b0c, text #f4f2ee, muted #a8a49c,
  faint #8b877f, hairline rgba(255,255,255,0.14). Case-back tints: cream
  #f0d9a8 (link buttons), #e8e4da (text), #b8b4aa (micro print), #14120f.
  Bluetooth Car spine red #A31621 (one case only). Wave stops: ivory
  (243,234,216), pale gold (230,211,168), blush (238,221,214).
- Spacing on an 8 px scale, radius 8. Shadows only on the phone frame, the
  cases, the stage faces and the round arrow buttons.
- Local dev: python http.server on port 8646 serving the repo (running,
  PID 92893). QA harness: tools/qa/capture.py and fliptest.py drive real
  Chrome over CDP with /usr/local/bin/python3.
- Motion policy already in force everywhere: prefers-reduced-motion gives a
  static wave, a static halftone, no reveal, an instant stage, no video
  autoplay; Save-Data blocks ambient video; visibilitychange pauses the
  canvases and the rig video. The world must match this.

---

## 2. Preserved elements and interactions

Everything below is kept as is. The shelves in Phase 4 are built from A and B
without visual change; C to H move into the world or a shelf but are not
redesigned.

### A. The game cases (projects.html, .pcase). The "game cards".
- 2:3 case, 232 by 348 px (176 by 264 under 720 px). Cover art from
  covers/<id>.webp (1024 by 1536) full bleed over a dominant colour (c.dom).
- Vector chrome mounted live over the art (chromeSVG): 12% black spine band,
  AW monogram, category wordmark in Chakra Petch 600 italic caps reading top
  to bottom, serial at the foot. Nothing depends on image contents.
- Grain overlay (SVG turbulence), gloss that follows the pointer (--gx), tilt
  on hover (rotateX up to 7 deg, rotateY up to 10 deg, .pcase-box), a 3D
  spine face (.pcase-spine3d) carrying the title.
- Keyboard: tabIndex 0, role=button, aria-label "<title>, <cat> project.
  Press Enter to flip the case." Enter or Space opens. Arrow keys move focus
  along the shelf and brighten the wave near the focused case (setFocus).
- Shelf: horizontal overflow, hidden scrollbar, drag to scroll with a 6 px
  dead zone so a drag never opens a case, wheel converts vertical to
  horizontal, prev and next round buttons appear only when the cases
  overflow and dim at either end (syncShelfNav, stepShelf). Hint line under
  the shelf, small caps.
- Filters: round chips with inline SVG icons (ICONS: wearables, robotics,
  iot, tokens, quests), aria-pressed, accent border when active. Filtering
  closes the stage and re-renders.

### B. The case flip to a spread (openStage, closeStage, stepStage). My
reading of "the portrait panel flip": the portrait 2:3 case turns over and
opens out into a landscape spread. Confirm.
- Beat one (300 ms): the case lifts from its shelf slot to screen centre
  (slotTransform). Beat two (500 ms, 240 ms after): rotateY 180 while the
  flipper widens from case size to a spread of up to 1060 by 620 px (90vw,
  80vh caps). Backdrop is paper at 82% with a 6 px blur.
- Back of the case: media panel (hero shot, or an autoplaying muted looping
  video with a caption, or a typographic plate with the category icon when
  there are no shots) beside an info panel: kicker, title in 800 caps, one
  line, then a sticky bar with serial, CSS barcode and link buttons (lead
  link filled cream). Under 920 px the spread stacks.
- Stage nav arrows and ArrowLeft/Right step to the next case without
  closing (170 ms swap fade). Esc, the X, or a press and release on the
  backdrop closes. Close reverses both beats and lands the case in its slot.
- Focus: the close button takes focus on open, the source case on close.
  role=dialog aria-modal.
- The Betta case also mounts betta-capture.js: a recorded-session graphic,
  19 rep bars against the best rep, an auto-playing slider (950 ms per rep),
  tempo bar and range readout. Data baked from the 4 Aug 2026 capture.
  Reduced motion opens on the best rep and does not play.

### C. "Icon animations": not found as such in the shipped site.
- The filter chip icons are static SVG; only colour changes on press and
  hover. The shelf, stage and directory arrows nudge 4 px on hover.
- The unshipped XMB prototype in the design workspace
  (~/Downloads/portfolio_senna/proto/projects-xmb.html) had a sliding
  category row with icons scaling 0.92 to 1.1 as the row translates over
  450 ms. That is the closest match to the phrase.
- Needs Abba's answer at the gate: which icon animation is meant, and where
  it lives.

### D. Home page motion (index.html)
- HalftoneLive in dragon mode over images/page_halftone.png (2956 by 3768):
  a body of light crawls a spine path down the silhouette for 30 s, rests
  15 s, face excluded by a feathered ellipse, lift #b8b2a6, ember #c6a15b.
- RibbonWave: two ribbons cycling ivory, gold and blush over 60 s, 26
  particles, pointer parallax, a focus glow the shelf drives.
- Both are approved motion pieces: tune parameters, do not rewrite (repo
  CLAUDE.md). Both are continuously animated, so both count against the
  restraint rule if they stay on the landing page.

### E. Betta page (betta.html)
- Crest, kicker, 8.5rem title, tagline, lede. Dark showcase panel with the
  sleeve and a phone frame (the one permitted drop shadow). Three stats with
  hairline rules, the cheque figure, two 9:16 videos through the data-src
  lazy loader with posters, the rig video with a play/pause toggle
  (aria-pressed, aria-controls), tag chips, the betta.live link.
- Reveal on scroll via IntersectionObserver: 16 px rise, 500 ms.

### F. Site chrome shared by the four subpages
- Header: name left, Primary nav right in 11 px 600 caps 0.18em, aria-current
  underlined in accent. .shell max 1160 px. Eyebrow style. Hairline rules
  between rows. "VIEW ALL →" pattern. Publication rows (date column, serif
  title turning accent on hover). About sections, skills-grid chips, contact
  rows with label over value.

### G. Home directory
- Four dir-rows (name, description, arrow) with the arrow nudge; Featured
  Project thumbnail (images/betta_thumb.jpg) whose border turns accent on
  hover. Single viewport (100dvh) above 720 px.

### H. No-JS fallback (projects.html #plainProjects)
- A plain list, hidden once the shelf renders, with the same links plus two
  inline videos. It is also the only place Wheelchair Basketball and The
  Medici Network appear today.

### Must keep working (repo rules, verbatim intent)
data-src video loader in script.js; filters, drag, wheel and arrow keys on
the shelf; reduced-motion fallbacks everywhere; width and height attributes;
aria; alt text; every external link exactly as it is. Copy is frozen. No em
dashes. No footers.

---

## 3. Project inventory

### Cases on the shelf (CASES in projects.html)

| id | Title | Category | Serial | Media on the back | Links |
| --- | --- | --- | --- | --- | --- |
| betta | Betta | Wearables | AWUS-30250 | videos/betta_rig.mp4, recorded-session graphic | betta.html, https://betta.live |
| posture-cue | Posture Cue | Wearables | AWUS-30311 | images/Posture_Cue_Thumbnail.jpg | YouTube Hr_AOARKWCw |
| visual-mapping | Visual Mapping for Autonomous Robots | Robotics | AWUS-30342 | images/Visual_Mapping_Robot.jpg | github.com/abbawada/Robot-Facility, YouTube rWP7KaduHdg |
| bluetooth-car | Bluetooth Car | Robotics | AWUS-30188 (red spine) | images/Bluetooth_Car.jpg | YouTube rMxsd21XIwQ |
| home-temp-monitor | Home Temperature Monitor | IoT | AWUS-30129 | images/Home_monitor.jpg | videos/Temp_Home_Monitor.mp4 |
| yield-vaults | Plume Token Yield Vaults | Token Economics | AWUS-30366 | typographic plate | 1drv.ms document |
| ethereum-validators | Ethereum Validators | Token Economics | AWUS-30402 | typographic plate | Google Slides |

Covers exist for all seven (PNG plus WebP pairs in /covers). Repo notes say
the current art still ghosts baked third-party marks until Abba's regen
(tools/cover-prompts.md); the two Token Economics covers still bake the old
SIDE QUEST rating. The shelves reuse covers as files; the regen is his
pipeline and does not block this build.

### Projects without a case yet (no-JS list only)

| Title | Category | Serial reserved | Media | Cover |
| --- | --- | --- | --- | --- |
| Wheelchair Basketball Volunteering | Side Quests | AWUS-30437 | videos/Wheelchair_Basketball.mp4, images/wheelchair_poster.jpg | pending, prompt 8 |
| The Medici Network | Side Quests | AWUS-30475 | none | pending, prompt 9 |

### Betta page content (betta.html)
Crest, tagline, lede. Stats: Top 4 of 221 at USC's 2026 New Venture Seed
Competition, $10,000 award, April 2026 cheque photo; hand-built breadboard
to protoboard; working prototype. Two videos. Tags: C++, Python, IMU
Sensors, Haptics, Embedded Firmware, Circuit Design. Link to betta.live.

### Writing (writing.html), three Medium essays
- NOV 22, 2025. Redeeming the Internet's Original Sin: X402 Autonomous
  Economies.
- JUL 22, 2024. A New Hope.
- MAY 10, 2024. The World is Yours.
- VIEW ALL to medium.com/@abbawada_63188.

### About (about.html)
Three lines (USC, economics and hardware; East of Eden; running, bike rides,
filmmaking, Arsenal, Formula One). Education block (USC, BA Economics, Dean
Scholar, minor Mathematical Finance, graduated May 2026, Viterbi Connected
Devices and Making). 22 skill chips. Contact: abba.wada10@gmail.com,
linkedin.com/in/abba-wada-63b999266.

### Not in the repo
No resume or CV file anywhere in the tree. The Pit Lane "download the resume"
click has nothing to point at until Abba adds a PDF.

---

## 4. Proposed shelf mapping (input to the [FILL] location gate)

| Location | Shelf contents from the inventory |
| --- | --- |
| 1. Pit Garage | Betta, Posture Cue, Bluetooth Car, Visual Mapping, Home Temperature Monitor (5 cases: Wearables, Robotics, IoT) |
| 2. The Exchange | Plume Token Yield Vaults, Ethereum Validators (2 cases). The X402 essay is econ-adjacent and could cross-list here. |
| 3. The Court | Betta story crossover (the betta.html content), Wheelchair Basketball Volunteering (cover pending) |
| 4. Campus Corner | Education block, the NVSC award and cheque. The Medici Network is an event, not USC; it fits The Exchange or Media Tower better. |
| 5. Media Tower | About lines, skills, the halftone portrait panel. Writing has no location in the six; either the tower carries a Press Room shelf for the three essays or Writing becomes a seventh stop. |
| 6. Pit Lane | Email copy (abba.wada10@gmail.com), LinkedIn. Resume download blocked, see section 3. |

Every project is then two clicks from load (location, then case), which is
the Phase 4 gate.

---

## 5. Conflicts and decisions that block Phase 1

1. Driver likeness. images/page_halftone.png is a halftone abstraction of a
   photograph of an F1 driver. Repo rules allow it only in that form, with
   the source untracked. The build prompt's section 9 bans driver likenesses
   in the world. Options: keep it inside the Media Tower shelf only, off the
   map; drop it from the new landing; or Abba rules the abstraction is not a
   likeness. His call.
2. Restraint rule. The wave and the halftone are two continuous animations
   already. If both stay on the landing page under the diorama, only three
   of the five ambient slots remain for the world. Recommendation: the
   diorama replaces the home canvases; the halftone moves into the Media
   Tower panel and the wave becomes the shelf backdrop, so the world keeps
   its five.
3. No hero. The current home (name, mission line, location, directory,
   featured thumbnail) is the landing page the diorama replaces. Copy is
   frozen, so the name and line move rather than change. Proposal: a
   timing-tower corner block. Needs a yes.
4. Git. The kickoff asks for branch circuit-v1 and one commit per phase.
   Both CLAUDE.md files forbid this side from running git. Abba creates the
   branch and commits; each phase report lists the files.
5. Screenshots. The kickoff asks for Playwright and forbids raw headless
   Chrome. Playwright is not installed (no ~/.cache/ms-playwright, no
   node_modules, no global package) and installing it downloads a browser,
   which was not done. This phase's screenshot used the repo's own CDP
   harness approach with real Chrome. To switch, run in the repo:
   npm init -y, npm i -D playwright, npx playwright install chromium, and
   add node_modules to .gitignore.
6. Where the build lives. The session's working directory is
   ~/Downloads/portfolio_senna, an Aug 16 design workspace with its own
   CLAUDE.md for a different paper redesign; its site/ folder is behind the
   repo. docs/circuit/ was created in the repo root because the diorama
   replaces the repo's index.html. Confirm.
7. Reference images. The kickoff says docs/circuit/refs/ holds references.
   The folder does not exist. Supply them or drop the line.
8. Domain. The prompt keeps the existing domain and deployment. That means
   the diorama ships as the repo's index.html on GitHub Pages, with the
   current five pages kept as deep links until Phase 6 decides otherwise.

---

## 6. Baseline numbers for the budgets

| Item | Today |
| --- | --- |
| JS, raw | about 60 KB across five scripts |
| Largest home asset | page_halftone.png, 578 KB |
| Home thumbnail | betta_thumb.jpg, 184 KB |
| Cover, WebP | 85 to 366 KB each, seven covers |
| Videos | 1.4 MB (rig) to 16 MB (prototype), all lazy |
| Budget for the world | 350 KB gzipped JS total, 60 fps desktop, 30 fps mid phone, under 150 draw calls |
