# Case chrome spec

NOTE (2026-08-16, Abba's call): the FLAGSHIP category below is retired. Betta
files under WEARABLES with rating W, keeping serial AWUS-30250. The chrome is
generated in code (chromeSVG in projects.html), not from per-instance files;
this spec is kept for the geometry and type values.

Vector chrome mounted over the raster cover art in code. Grid: 600 by 900 units per 2:3 cover. All text is real and editable; nothing is outlined or rasterized. Mount every SVG inline in the DOM (never through img src) with the fonts loaded on the page:

https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,500;0,600;0,700;1,600;1,700&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap

## Color
- Chrome white: #FFFFFF
- Case black: #141414
- Greatest Hits red: #A31621 (AWUS-30188 only)
- Back tint, variable per cover: color-mix(in oklab, #141414 88%, cover accent 12%). Default #1A1A1A. Betta example #211B14. Lives on the rect marked data-token="back-tint".
- Hairlines: white at 14 to 22% alpha. No gradients anywhere in the chrome.

## Type
- Spine wordmark: Chakra Petch 600 italic, caps, 30u, letter-spacing 0.34em, reading top to bottom (rotate 90).
- Back eyebrow: Chakra Petch 600, 12u, letter-spacing 0.32em. Back title: Chakra Petch 700, 46u.
- Rating letter: Chakra Petch 700, 78u. Rating word: Chakra Petch 600, 13u (12 for WEARABLES, 11.5 for SIDE QUEST), black.
- Serials and micro print: Schibsted Grotesk 600, 9 to 13u (spine serial 9u). Blurb body: Schibsted Grotesk 400, 13.5u, line height 1.65.

## Components
- aw-monogram.svg: 96 grid, single 5u stroke, square radius 17, round caps and joins, white only. Clear space 10u. Minimum render 18 px.
- spine-*.svg: 72 by 900, the full left edge at 12% of cover width. Monogram 40u wide at x16 y22. Wordmark starts y108 on the x36 axis. Serial centered, baseline 882. Art-side hairline at x71.25, white 14%.
- rating-*.svg: 120 by 156. White ground, 5u black border, 3u divider rule at y113, word beneath in black. Front mount: left = spine width + 12u, bottom 12u, width 15% of cover.
- back-template.svg and back-example-betta.svg: 600 by 900 on the tint ground. Padding 40u. Eyebrow y66, title y116, rule y144. Monogram 36u at top right (x524 y40). Shots row y170: one to three 160 by 190 boxes, gap 20, keyline 1.5u. Blurb: foreignObject at x40 y384, width 330 (HTML text, wraps naturally). Feature column x420, rows every 28u, 5u square markers. Bottom bar: rule y790, rating at 0.42 scale (x40 y806), serial baseline 830, links row 858, barcode 140 by 66 at x420 (bars are one stroke-dasharray line; digits repeat the serial).

## Instances
| Spine | Category | Serial | Band |
| --- | --- | --- | --- |
| spine-flagship | FLAGSHIP | AWUS-30250 | #141414 |
| spine-wearables | WEARABLES | AWUS-30311 | #141414 |
| spine-robotics-30342 | ROBOTICS | AWUS-30342 | #141414 |
| spine-robotics-30188-red | ROBOTICS | AWUS-30188 | #A31621 |
| spine-iot | IOT | AWUS-30129 | #141414 |
| spine-tokenecon-30366 | TOKEN ECONOMICS | AWUS-30366 | #141414 |
| spine-tokenecon-30402 | TOKEN ECONOMICS | AWUS-30402 | #141414 |

Ratings: rating-flagship (B), rating-wearables (W), rating-robotics (R), rating-iot (I), rating-tokenecon (T), rating-sidequest (S).

NOTE (2026-08-17, Abba's call): AWUS-30366 and AWUS-30402 recategorized from
SIDE QUEST to TOKEN ECONOMICS. The live spine already renders the new label;
the shipped cover art still bakes S / SIDE QUEST in the rating box until the
regen. Rating word TOKEN ECONOMICS needs roughly 8u to fit the 120u box.
SIDE QUEST remains valid for AWUS-30437 and AWUS-30475 (covers pending).

## Binding
Curly-brace tokens are slots, not copy: {CATEGORY} {TITLE} {SERIAL} {SHOT n} {BLURB HEADLINE} {BLURB BODY} {FEATURE} {LINK}. Replace text content only; geometry stays put. back-example-betta.svg is fully bound, wording verbatim from betta.html, and references ../../site/images/ (adjust the relative path to wherever it mounts).

## Grain
feTurbulence fractalNoise, baseFrequency 0.8, 2 octaves, white at 4 to 5% alpha, always painted under the type. Decorative only: delete the two grain rects for a flat build.

## Rules
- Chrome frames the art. It never overlaps a face or the focal subject; only the spine region and the two bottom corners carry chrome.
- Do not change any wording. Categories and serials above are the full set.
- Spine type is legible at case widths of 220 px and up. The shelf currently renders cases at 244 px.
