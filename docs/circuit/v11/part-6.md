# V1.1, Part 6: collectibles and liveliness

Everything in this part is still. The ambient count does not move.

## The era spine
cases.js, shared by projects.html and the stop panels, so both change at
once. A 9-unit stripe across the top of the spine band in the district
colour (Wearables gold, Token Economics green, Robotics, IoT and Side
Quests cool grey; paper on Bluetooth Car's red spine) and a WADA RING
edition tag in the broadcast face above the serial. Art, monogram,
category wordmark, serial, tilt, gloss, flip and spread untouched.
Documented in tools/chrome-spec.md. Pair: part-6/sidebyside-spines.png.

## One or two static toy details per stop, in the new material
| stop | built |
| --- | --- |
| 01 About, the tower | a cool-candy dish on the head with its arm; a coil of three graphite cable rings at the base |
| 02 Betta, the court | a graphite rack with three gold candy balls at the court's corner; a bench with a folded smoky sleeve on it; Rep's statue on its plinth beside the court |
| 03 Education, the campus | three books in cardinal, gold, cardinal on the plinth; a graphite mortarboard with a gold tassel |
| 04 Economics, the Exchange | a round green vault door on the side wall with a graphite wheel and spokes; a stack of six gold coins by it |
| 05 Writing, the press room | a paper-white stack with a graphite pen across it; a cool-candy paper box with a graphite lid at the corner |
| 06 Projects, the garage | four graphite tyres on gold rims by the bay; a gold tool chest with three drawer lines |
| 07 Contact, the pit wall | a graphite headset on the wall; the chrome-visor helmet at rest by the board, with a graphite jaw and a gold fin, the easter-egg prop; Rep, small, by the flag |

All of it merges into each stop's meshes per material (mergeStatic), so it
lifts and opens with its stop and costs almost no draw calls.

## Trackside livery, his marks only
Four low cool-candy barrier walls with type on the face that shows: two
along the outside of the pit straight either side of the flag (WADA RING,
BETTA; FEEL EVERY REP, AWUS, TOP 4 OF 221), one outside the hairpin
(BETTA), one outside the back straight (AWUS, WADA RING). The Monaco
energy, none of its words. Curbs keep their stripes; BETTA stays painted
on the T1 run-off.

## Rep, in place
Part 5 closed with "you decide": Rep. It ships at the three places (court
statue, tower head, pit wall); Tap and Visor are out of the code.

## Measured after Part 6
60 fps desktop and phone proxy (tools/circuit/perf.py); 145 draw calls,
35,684 triangles. Draw calls sit inside the 150 budget with little room:
the transmission pass draws every opaque mesh twice, and Part 6 added the
four barrier text planes and Rep's materials at three places. If a later
part needs headroom, the first lever is folding the barrier type into one
atlas texture (four calls to one), the second is merging Rep's three
figures' materials across stops.
