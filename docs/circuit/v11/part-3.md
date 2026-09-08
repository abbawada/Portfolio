# V1.1, Part 3: the signage district

The tower area is the media district's Times Square, in the dot-matrix
neon style of ref-dotmatrix-neon-signage: black boards of round dots, a
5x7 LED font, five neon colours (cyan, magenta, gold, lime, white). Every
mark is his. Density from colour, not motion: one board flickers.

| board | where | reads |
| --- | --- | --- |
| A | on posts right of the tower, 14 by 9 | a jump-shot figure with the sleeve arm in gold and the ball in white (the Osaka runner's energy, his world's figure), then BETTA, FEEL, EVERY, REP |
| B | down the tower's right face, 2.4 by 25 | WADA RING, one letter under the next |
| C | on the tower's front face | C++, IMU, SQL |
| D | on posts left of the tower, 18 by 5.6 | POSTURE CUE, VISUAL MAPPING, BLUETOOTH CAR |
| E | on posts far right, 16 by 5.6, the flickering one | TOP 4 OF 221, A TAP ON, THE WRIST |

Copy: BETTA, FEEL EVERY REP (his cover line), TOP 4 OF 221 (his stat), A
TAP ON THE WRIST (from his lede), the project titles, the tool names, the
circuit name. Nothing invented, nothing borrowed.

Flicker: board E holds three pre-rendered frames with 6 percent of its lit
dots dimmed differently; it swaps frames every 0.25 to 0.85 s. That is one
draw-call swap, no canvas work per frame. Off under reduced motion.

Ambient count after Part 3: car, flag, sleeve shimmer, board flicker, 4 of
8. Boards are opaque, so they read through the candy shells around them;
board D sits clear of the tower so the shell's blur never softens it.

Measured: 60 fps desktop and phone proxy, 94 draw calls. Screenshots:
part-3/before-1-tower, after-1-tower, before-2-default, after-2-default,
sidebyside-*.png; part-3.png is the tower close-up.
