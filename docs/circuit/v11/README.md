# V1.1, the liveliness pass

Structure, navigation, shelves and the perf harness from V1 stay. This
pass is materials, colour, signage, ambient life and the race. One report
per part in this folder; captures and side-by-sides beside them.

| part | what | gate |
| --- | --- | --- |
| 1 | material and colour pass: candy translucent shells, district colours, internals in the hero objects, matte ground | approved 2026-09-07 |
| 2 | the sleeve monument, one slow shimmer | no gate |
| 3 | the signage district, five dot-matrix boards, one flicker | no gate |
| 4 | the race: three cars from standings.json, parked when idle, timing tower | approved 2026-09-07 with the gh-free deploy path |
| 5 | the mascot: three concepts, Rep picked ("you decide") | closed 2026-09-08 |
| 6 | era spines, toy details per stop, trackside barriers | approved as listed; final gate below |

## Ambient count (ceiling 8)
Lapping cars (up to three, one today), the start flag, the sleeve
shimmer, one board flicker: six at most, four today. Two in reserve. The
Exchange ticker, the blimp and the garage scope hold still since Part 1.

## Budgets
60 fps desktop and 30 fps phone emulation required; measured 60 and 60
after every part. Draw calls under 150: 145 after Part 6. The phone proxy
runs the transmission texture at half resolution; that is the lever if a
real phone dips, before any object is cut.

## Deploy
- Refresh standings locally: python3 tools/circuit/standings.py (gh signed
  in), commit circuit/standings.json. Without gh the script exits 0 and
  ships the committed file (netlify.toml runs it as the build command).
- index.html carries ?v=11.4 on every asset URL; bump it when modules
  change so a deploy never pairs a new page with a cached module.
- The poster (images/wada-ring-poster.jpg, circuit/poster-areas.js)
  regenerates from the world with tools/circuit/poster.py.

## Files touched in V1.1
circuit/world.js, circuit/nav.js, circuit/circuit.css, index.html,
cases.js, tools/chrome-spec.md, README.md, netlify.toml,
circuit/standings.json, circuit/poster-areas.js, images/wada-ring-poster.jpg,
tools/circuit/{standings,racetest,sidebyside,panels}.py and the cache-off
change in every capture tool, docs/circuit/refs/v11/, docs/circuit/v11/.
