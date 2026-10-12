# Round 7: the jump on the map, the Journey, a bigger plate, Start lap as a tour

2026-10-11. Branch betta-renovation, build query 16.0. Not pushed.

## Asked for

Abba, after round 6 went live:

1. The skydive: click the helicopter, then watch the character land on the map (the tile in the Projects grid missed the point).
2. The building journey (the lab timeline): loved, but it should populate a section on the map, "like being on the court or something". Make the map bigger to fit all of this.
3. The drive feature: remove it.
4. Start lap: more interactive; when it reaches each point on the map it opens it automatically.
5. Betta: clicking it should take you to the website, with an image of the sleeve like the new Betta site's hero, linking to the site.

## Built

### 1. The jump, from the helicopter, onto the map
- The Betta helicopter is a click target: a hit box on the aircraft (layer 1, id `helicopter`) and a chip, Skydive, that rides above it (`.ring-heli-pin`, a real button, so Tab and Enter reach it). Hover lights the cabin.
- A click flies the aircraft on a jump run to a drop zone on the lawn left of the court (`L.DZ`: a target in paper, gold and ink, and a windsock in the SKY car's pale blue). The diver hangs from the near skid, lets go, turns belly to earth, falls, feels the pulse on the left wrist at 4,000 ft (gold rings, the altimeter chip turns gold), pulls, and the canopy (seven cells, the centre one gold) carries them down a spiral onto the bullseye. They stand; the canopy settles on the grass and stays until the next jump.
- The camera holds one wide shot from the aircraft to the target the whole way down, then moves in on the landing and shows a card: the existing skydiving line, Watch the reel, Jump again, Back to the map. The altimeter reads 13,500 ft at the exit and 0 on the grass.
- After the exit the helicopter climbs away up the screen and waits there until the diver lands, then goes back to the race (in the isometric view an aircraft flying toward the camera looks like it is diving with the diver and covers them).
- Escape or Back to the map leaves early; the jump plays out on the map. A click on the helicopter during a jump the visitor left rejoins it. The Projects panel keeps its skydiving line and gains a Jump from the helicopter pill. Opening a jump feeds the SKY car, as the tile did.
- Code: `circuit/jump.js` (new: diver, canopy, drop zone, the sequence), `world.js` (`heliTask` lets the jump borrow the aircraft, with a top speed; the hit box; `world.jump`), `nav.js` (the shot, the chip, the altimeter, the card).
- Removed: the 2D skydiving tile (`circuit/skydive.js`, `circuit/skydive.css`, `tools/circuit/harness/skydive.html`) and the 76vh phone-sheet rule that existed only for it.

### 2. The Journey, a section on the map (stop 08)
- A new stop, `journey` (08 Journey, kicker "08 The lab", violet `#8b5cf6`), behind the court's right end, beside the BETTA pylon.
- A big screen faces the camera head on and plays the lab, the same drawn timeline from round 6, rendered offscreen by `circuit/lab.js` (new options: `offscreen`, `external`, `onStage`, a numeric `start`; new api: `tick`, `canvas`, `fade`, `goTo(i, holdMs)`) and shown as a texture with its number top left and the date and title along the bottom. It redraws at most 30 times a second (20 on a phone) and not at all while off screen.
- In front of it, six plinths rise left to right, one per stage, each with its prop (the robot car, the posture board, the ball, the cheque, the rig, the sleeve) and its date on the face the camera sees. A violet ring sits on the plinth of the stage on the screen and moves with it.
- The JOURNEY mark stands on the screen's top edge (a new mark face, `d`, head on to the camera).
- Clicking the Journey opens its panel: the lab at the stage the screen is showing, plus betta.live and The full case. Scrubbing the panel moves the screen on the map too.

### 3. A bigger map
- The plate runs v -40 to 210 instead of 0 to 210 (`L.PLATE`). The far side of the circuit moved back 40: the back straight, the hairpin and the Exchange inside it, the grandstand, the two far boards, the LOS ANGELES barrier and the hairpin gravel. The right side gained a long climb to a new sweep.
- The new band holds the Journey (behind the court) and the drop zone (left of the court). Trees re-seeded (`tools/circuit/trees.js` now reads the plate, keeps clear of both).
- The view, the minimap, the pan limits and the flat map (`docs/circuit/map.svg`) follow the plate. The no-WebGL poster and its click areas were regenerated (eight areas).
- On a phone the plate keeps round 6's scale, and the Grid shows its top three rows so the bigger map is visible beside it.

### 4. The drive is gone
- Removed from `world.js` (the player car, the wall, the drive state and API), `nav.js` (input, the chase, toasts, the card, the D key), `index.html` and `circuit.css`; `tools/circuit/drivetest.mjs` deleted. The race itself is unchanged.

### 5. Start lap, a tour that opens every stop
- The HUD has one pill again, Start lap (filled ink); on the lap it reads Leave lap.
- The camera leaves the start line and rides the track; as it reaches each stop it pulls in and opens it. A bar at the bottom shows the lap (stop n of 8), a clock that runs out in 9 s, Next stop and Leave lap. Then the panel closes and the ride goes on. After the last stop it crosses the line, says Lap complete and goes home. Order, from the line: Projects, Contact, Education, Betta, Journey, Economics, Writing, About.
- The clock stands still while the pointer is on the panel, and stops for good once the visitor scrolls, clicks or types in it, until they press Next stop. Leave lap, Escape, Start lap again, a drag, the wheel, a label, the minimap or a Grid row end the lap there.
- Under reduced motion there is no ride: each stop is a cut and Next stop moves on.
- With a panel open the bar sits bottom left of the world, clear of the minimap; on a phone it sits above the sheet on two lines. Open stops are framed left of the Grid on a wide screen.

### 6. Betta goes to the site
- The Betta panel leads with the sleeve from the Betta site's new hero (`Jude_Betta_hero.png` from ~/Projects/BettaSite, swept for watermarks at all four corners, none) as one link to https://betta.live (new tab), with a betta.live pill on it. Under it: The full case and a pill to the Journey. Side quests unchanged.
- Files: `images/betta_sleeve_hero-{800,1600}.{jpg,webp}` (29 to 82 KB).

## Copy added
Start lap, Leave lap, Next stop, Skip ahead, Finish, Lap complete, To the line; the hint "Click a stop to open it, or the helicopter to jump." (Tap on touch); Skydive; Jump from the helicopter; The journey; the Journey line "building Betta, from a robot car to the sleeve"; Watch the reel, Jump again, Back to the map; the card reuses the existing skydiving line. No em dashes, none of the banned words (swept).

## Checks (all on the review server, real Chrome over Playwright)

| check | result |
| --- | --- |
| race contract, seeds 7, 11, 42 (240 s) | pass on all three: 0 touches, max lateral 3.1, mean change interval 13.6 / 16.0 / 17.2 s, longest wait 19.6 / 23.9 / 22.9 s |
| gate audit, 1600 and 1440 | every overlap category empty at both widths; Journey chip 4 to 6 px clear of its mark before the last lift; 221 draw calls (round 6: 204); 58.5 and 59.1 fps |
| label test | 8 of 8 stops pass; no hover-only titles; no errors |
| lab contract check (docs/circuit/v15/lab) | ALL PASS after the lab.js changes; 0.48 ms a frame at DPR 2 |
| jump, 1440x900 | run, exit, freefall, cue at 4,000 ft, canopy, landed on the target centre (70, 62) at about 17 s; card at about 19 s; 59 to 60 fps throughout; no errors |
| lap, 1440x900 | all 8 stops opened in track order, lap complete at 110 s, back home; no errors |
| phone 390x844 and 360x740 | rest view, lap (first five stops) and jump: no errors |
| reduced motion | the jump lands at once and shows its card with the focus on Watch the reel; Escape closes it; the lap cuts and Next stop moves on; the screen shows the last stage's still |
| interactions | clicking the aircraft itself starts the jump; Tab reaches the Skydive chip and Enter jumps; the Jump pill closes Projects and jumps; the hero links to https://betta.live in a new tab; the Journey pill opens the Journey; scrubbing the panel's lab moves the screen |

Captures: this folder, `01-` to `10-`.

## Review
An independent read of the code found six defects, five confirmed in the browser; all fixed in the same commit and re-run:

| defect | fix | re-run |
| --- | --- | --- |
| a scroll or drag during a camera move dropped what the move was for: a stop's panel stayed hidden, the jump's card never came | `interruptFly()` in nav.js stops the move and still runs its arrival step | panel opens after a wheel or a drag mid-move; card shows after a wheel during the landing move |
| leaving the jump by keyboard dropped the focus on the page (the chip was still hidden) | the chip is shown before the focus goes to it; the exit pill hides under the card | focus on the Skydive chip |
| the lap moved on while the focus was inside the panel | focus arriving in the panel holds the clock | still on the stop after 10.5 s |
| Watch the reel kept feeding the SKY car | one bump through the world, no dwell | 0, 10 on the click, 9.6 six seconds later |
| at 1024 the lap bar beside a panel was 152 px wide and spilled onto the minimap | the bar spans the world beside the panel and wraps; the minimap steps aside on the lap; below 1120 px the Grid steps aside beside a panel | bar inside its box, name 224 px wide |
| the altimeter read 12,090 ft on the skid | it counts from where the diver starts | 13,410 ft on the skid |

Also: a dead motion hook removed, the helicopter's comment corrected, the reduced-motion canopy laid behind the diver, every helicopter flight capped at 78 units a second. After the fixes: the jump lands with its card, the label test is 8 of 8, and a full lap opens all eight stops in 110 s with no errors.

## Not verified
- No real phone: the phone captures are Chrome's emulation, and the screen's 20 fps redraw on a phone was not measured on a device.
- Safari and Firefox were not run.
- The 221 draw calls and 59 fps are this Mac's headless Chrome; the fps harness can read 30 or 60 depending on the display state.

## For Abba
- The Journey's name and line: "Journey" with "08 The lab", and "building Betta, from a robot car to the sleeve". Say if you want other words.
- Its place: behind the court's right end, beside the BETTA pylon. It could sit on the court itself instead (a screen over centre court), at the cost of covering half the court from this camera.
- Start lap's clock is 9 s a stop. Longer or shorter is one number (`TOUR_DWELL` in nav.js).
- The jump is watched, not steered: the pull is automatic at the pulse. A click-to-pull can come back if you want the visitor to do it.
- On a phone the Grid now shows three rows instead of eight.
