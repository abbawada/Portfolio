# Round 2: Abba's notes on Gate A, built 2026-09-08

Six asks in one message; all six are in. Captures in round-2/:
r2-wide-1600.png and r2-wide-1440.png at the default view, r2-01 to
r2-08 close shots, wall-*.png and grandstand.png for the hoardings,
blimp-screen.png, cars.png, panel-board.png, panel-projects.png,
lap-follow-1.png and lap-follow-2.png. Reports: r2-report.json (overlap
audit), r2-labels.json (label contract, eight stops), r2-race.json.

## 1. Getting out of a section, and into the next
- The panel head is sticky: Close and two hop buttons (the previous and
  next stop on the lap, the blimp last) stay on screen however far the
  body scrolls. Left and right arrow keys hop too.
- Closing no longer flies the camera anywhere. You stay where you are,
  the labels are all around, and the mini-map slides left of the panel
  so its numbered dots stay usable while a section is open.
- A click on empty ground with a section open closes it. Clicking any
  label switches directly.

## 2. The images, on the track
Every image you attached is in the world as itself, plus the sleeve
render and three crops from the composite (GTA IV, Jordan,
LittleBigPlanet), twenty in all. Originals sit in
docs/circuit/refs/board/ (gitignored, like the v11 refs); the resized
set is images/board/ (1.9 MB, committed), listed in circuit/board.js
with a title each, yours to edit. tools/circuit/board.py rebuilds both.
| where | what |
| --- | --- |
| top-right wall, behind the sweep | Monaco aerial, Dotonbori, the Ferrari at Monaco, AWUS · RATED W |
| top-left wall, behind the hairpin | Palace Seoul, LittleBigPlanet, C++ · PYTHON · SQL |
| left wall, outside the return leg | Senna and the trophy, the visor, the 911, Nigo and Milo |
| bottom-right wall, behind the car park | Jeff Hardy, iMac G3, IMU · HAPTICS · FIRMWARE |
| grandstand roof | Big Box Collection twice, the GTA/Jordan/LBP trio, the fisheye street, GTA IV |
| the Exchange, under the ticker | Apple Pro Mouse, Jordan with the Xbox |
| the garage front, left of the bay | the sleeve render, Spider-Man |
All of it is one atlas texture and one merged mesh: twenty pictures for
two draw calls. The three type billboards you could not read are now
the 18 to 22 unit panels on the walls.

## 3. The cars represent projects, and nothing is fetched
Four cars, one per shelf project, in that project's livery: Betta gold
number 10, Posture Cue white 23, Yield Vaults green 4, Bluetooth Car red
12. They lap from the first frame, never park, run a racing line, and a
scripted pass every 7 to 13 s takes the car behind round the outside
into the slot ahead. The standings block is now THE GRID: your order,
hardcoded in layout.js, no numbers from anywhere, each row a button that
opens the stop its project lives in. Deleted: circuit/standings.json,
tools/circuit/standings.py, tools/circuit/racetest.py, the standings
fetch in index.html, the netlify build command, the README line, and
every comment or aria string that claimed live data. Race test over 240
simulated seconds: closest two cars 2.69 units apart (cars are 1.8
wide), widest lateral 3.27 (the line is at 4.5), 15 order changes.

## 4. The blimp
Stop 08, The Board. It drifts over the top-right corner with a screen
either side that cycles the twenty images every seven seconds, BETTA
under the screen, a label chip that follows it, and a hit box. Clicking
it opens the Board: every image as a leaned, taped card with its title,
three to a row, in an 820 px panel.

## 5. Start lap follows the cars
The camera picks up the Betta car wherever it is, at lap zoom, and rides
seven units ahead of its nose for one lap; each stop's label lights as
the car passes it, so any label is one click off the ride. Skip lap and
Escape end it. Under reduced motion it still cuts between the stops.

## Measured
160 draw calls (the four cars cost most of the rise from 149; the sidepod
name plates were dropped to hold it there), 36,700 triangles, 58 to 62
fps in the harness at both widths. Overlap audit at 1600 and 1440: zero
in every category, hoardings included. Label test: eight of eight pass,
no hover-only titles. Poster and flat map regenerated.

## Flags
- The Board's one line, "games, films, cars, machines, streets", and
  the twenty titles are new copy; edit them in circuit/board.js and
  circuit/stops.js.
- The local CLAUDE.md rule against third-party art and public-figure
  photos is overridden for the circuit world at your instruction;
  the note is in CLAUDE.md. The branch still never pushes without you.
- The sleeve monument by the garage (section 6 of the brief) is still
  untouched; that decision stays open.
- Phones are not tuned: the hoardings and eight chips will crowd at 390
  wide.
