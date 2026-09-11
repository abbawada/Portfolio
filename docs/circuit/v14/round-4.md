# Round 4: a live order, seven cars, the candy tech, the blimp with a job

Asked for in one message: make the order live and real and engaging, add
more cars if it will not ruin the site, replace the AWUS board with
something actually relevant, add more colourful futuristic tech, and give
the blimp a purpose. Two reference images came with it: the 1999 iMac G3
five colour advert and a translucent Apple Pro Mouse beside a PlayStation
memory card.

Captures in round-4/: r4-wide-1600.png and r4-wide-1440.png at the
default view, r4-01 to r4-07 close on each stop, r4-tech.png (the
machines), r4-blimp.png (the airship over the leader), r4-phone.png.
Reports: r4-report.json (the overlap audit), r4-labels.json.

## 1. The order is live, and the live thing is the visitor

The honest answer to "live and real" turned out not to be a feed. I
checked: the public GitHub account has six repositories, none of them the
shelf projects, every one at zero stars, and the newest push outside the
portfolio is from July. Wiring the order to that would give three cars no
data at all and a number that never moves, which is the exact failure the
v1.2 brief called dead on arrival. Nor is there an honest mapping from
any public number onto Posture Cue or Bluetooth Car. Inventing one would
be a lie told with a straight face.

So the live input is the person looking at the page. Opening a section
deposits attention on the cars whose projects live there, staying there
keeps feeding them, and opening a project's case on the shelf feeds that
one car exactly. Attention decays with a 110 second half life, so the
order is always about the last couple of minutes and never freezes. It is
read as a share of the field, so no car runs away. It buys a capped pace
edge, so what runs underneath is still a race: the simulation from
Session 3 is untouched in structure, and a visitor who touches nothing
sees exactly the race that shipped.

Measured, seed 3, the field settled for 90 seconds and then Economics
opened and read for ten: Yield Vaults climbed P4 to P3 and Ethereum
Validators P6 to P4, while the fight for the lead carried on between two
cars nobody had touched. The Grid carries a bar per row showing that
car's share of the attention spent, and one line under it saying what it
is: open a section and its car picks up pace, your visit only, kept on
this device. It is kept in localStorage on the visitor's own machine,
nothing is fetched and nothing is sent.

New file: circuit/pulse.js. It is wrapped so a browser that refuses
storage, such as a private window, degrades to a session with no memory
rather than an error.

## 2. Seven cars

One per shelf project: Betta, Posture Cue, Yield Vaults, Bluetooth Car,
Visual Mapping, Ethereum Validators, Home Temperature Monitor. I did not
take this on argument. I patched a scratch copy, served it separately and
ran the real race contract against it before touching the repo.

| measure | 4 cars, shipped | 7 cars, now |
| --- | --- | --- |
| cars touching, 240 s | 0 | 0 |
| widest lateral (white line at 4.5 less half a car) | 3.1 | 3.1 |
| slowest speed seen | 4.7 | 4.7 |
| mean seconds between changes of order | 16.8 to 21.8 | 16.3 to 18.3 |
| longest wait for a change | 24 to 45 s | 21.8 to 24.1 s |

It races better, not worse: more cars means more adjacent pairs, so the
order turns over more often and the longest dead patch nearly halves. The
single pass at a time rule is kept. I tested nothing beyond it because
the contract already passes on every seed.

Numbers and codes: BET 10, POS 23, YLD 4, BLU 12, MAP 7, ETH 32, TMP 21.
ETH runs 32 because that is what a validator stakes.

## 3. Colour, and the one rule this round bends

Seven cars could not keep taking their accent from their stop, because
four projects live in Projects and two in Economics: four orange cars and
two green ones, indistinguishable at speed. Each car now carries its own
colour from the 1999 flavour set in the reference image, and so do the
machines in section 4.

This is a deliberate amendment to the Session 2 rule, and it is the one
thing this round changes that you did not ask for, so it is the first
thing to say no to. The rule was: one saturated colour per stop, on its
mark and accents and nowhere else. It now reads: the buildings keep that
discipline exactly as built, and the moving and made things, the cars and
the machines, are a second family in candy flavours. The seven building
marks are untouched.

## 4. The machines

Five translucent machines on the lawn between the court and the garage,
in tangerine, lime, bondi, grape and strawberry, with a paper bezel and a
dark screen on the face the camera sees and their boards and ribs reading
through the shell.

The world had the candy material since v1.1 but had never made an object
out of it: saturated colour only ever appeared as a flat unlit strip or
an extruded letter, and the one job the v1.1 brief gave the two
translucent reference images, be the material bible, was the job the
2026-09-09 audit found unfulfilled. This is that job done.

One thing worth knowing for anything similar later: a transmissive
material does not render another transmissive material behind it, so
everything meant to be seen through these shells is built opaque. Every
shell is one vertex coloured mesh and every gut is one unlit mesh, so the
whole bench costs two draw calls.

## 5. The blimp has a job

It was pure decoration after the Board was removed. It now rides over
whoever is leading, a little ahead of their nose, easing across when the
lead changes, so the front of the race is findable in the wide shot
without reading the Grid. It stays high and slow and lags on purpose: a
pass shows as the airship drifting over to the other car.

It does not become a stop. No label chip, no hit box, not clickable, no
photographs, and no board in the sky duplicating what the Grid already
says. The BETTA banner is intact. Its gas cell rings and gondola are now
one merged mesh, which gave back seven draw calls and paid for the
machines.

## 6. The trackside copy

AWUS appeared in four places. Three were real and one was dead code
iterating an empty array, which is deleted.

| where | was | now |
| --- | --- | --- |
| hoarding behind the back straight | AWUS · RATED W | ARSENAL · FORMULA ONE |
| pit straight barrier | FEEL EVERY REP · AWUS · TOP 4 OF 221 | FEEL EVERY REP · USC · TOP 4 OF 221 |
| hairpin barrier | AWUS · WADA RING | LOS ANGELES · WADA RING |
| world.js sign array | AWUS · RATED W | deleted, it never rendered |

Every replacement is something the site already says about you: Arsenal
and Formula One from the About panel, USC and Los Angeles from About, the
award stat unchanged. The AWUS serials stay on the shelf cases, where
they are the case spines and the printed cover art depends on them.

## Measured
Overlap audit at 1600 and 1440, marks and chips included: zero in every
category. Label test seven of seven. Race contract: pass on three seeds.
194 draw calls, up 17 from Session 3's 177, holding 60 fps when the Mac
is not capping the display at 30. Poster and flat map regenerated, the
poster from a fixed seed so it is reproducible.

## Flags
- The colour amendment in section 3 is the decision to make. Say the word
  and the cars go back to their stop's colour, at the cost of four orange
  cars.
- A car only moves for a project that has a car. Opening a case with no
  car on the grid, the side quests, moves nothing and claims nothing.
- On a phone the Grid block is hidden while a section is open, which
  takes the line explaining the pace with it. The phone pass is still not
  in any brief.
- Under reduced motion the race does not run at all, so attention has
  nothing to move. That was already true of the race before this round.
- The blimp now crosses the whole plate instead of sitting in its corner.
  If it reads as busy in the wide shot, the fix is one number, its ease.
