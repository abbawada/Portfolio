"""Halftone dot-matrix generator for the portfolio's backdrop art.

Turns a photo into a field of ink dots on a transparent background, sized by
darkness, fading out toward the edges so the figure dissolves into the page
(the araesf.xyz treatment).

Usage:
  python3 tools/halftone.py --src images/senna_source.jpg --out images/page_halftone.png
  python3 tools/halftone.py --src images/senna_source.jpg --out images/page_halftone.png \
      --crop 0,120,736,985 --cell 10 --scale 2.0 --threshold 0.12 --fade 1.9 --fade-exp 1.6

Notes:
  - Crop out ALL sponsor text (Marlboro, Nacional, etc.) before dotting, or pick
    a threshold high enough that it dissolves; legible third-party branding must
    never survive into the output.
  - Output is RGBA; dots are near-black (#111). Keep the file under ~400 KB by
    raising --cell if needed.
"""
import argparse, math, os
from PIL import Image, ImageDraw, ImageOps, ImageEnhance

p = argparse.ArgumentParser()
p.add_argument("--src", required=True)
p.add_argument("--out", required=True)
p.add_argument("--crop", help="L,T,R,B in source pixels", default=None)
p.add_argument("--cell", type=int, default=10, help="dot grid pitch in output px")
p.add_argument("--scale", type=float, default=2.2, help="output size vs source")
p.add_argument("--threshold", type=float, default=0.12, help="min darkness 0..1 that draws a dot")
p.add_argument("--max", dest="max_darkness", type=float, default=1.0,
               help="max darkness 0..1 that draws a dot; band-pass to drop dark backgrounds")
p.add_argument("--fade", type=float, default=1.9, help="edge fade strength; lower = dots reach farther")
p.add_argument("--fade-exp", type=float, default=1.6, help="edge fade curve exponent")
p.add_argument("--contrast", type=float, default=1.3)
p.add_argument("--invert", action="store_true",
               help="dots follow brightness instead of darkness (light subject on dark background)")
args = p.parse_args()

img = Image.open(args.src)
if img.mode in ("RGBA", "LA", "PA"):
    # flatten transparency onto white so masked-out regions draw no dots
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    img = Image.alpha_composite(bg, img.convert("RGBA"))
img = img.convert("L")
if args.crop:
    l, t, r, b = (int(v) for v in args.crop.split(","))
    img = img.crop((l, t, r, b))
img = ImageOps.autocontrast(img, cutoff=2)
img = ImageEnhance.Contrast(img).enhance(args.contrast)

CELL = args.cell
ow, oh = int(img.width * args.scale), int(img.height * args.scale)
small = img.resize((max(1, ow // CELL), max(1, oh // CELL)), Image.LANCZOS)

canvas = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
d = ImageDraw.Draw(canvas)
cx, cy = small.width / 2, small.height / 2

px = small.load()
for gy in range(small.height):
    for gx in range(small.width):
        darkness = px[gx, gy] / 255.0 if args.invert else 1.0 - px[gx, gy] / 255.0
        if darkness < args.threshold or darkness > args.max_darkness:
            continue
        dist = math.hypot((gx - cx) / cx, (gy - cy) / cy) / math.sqrt(2)
        fade = max(0.0, 1.0 - (dist ** args.fade_exp) * args.fade)
        r = (CELL * 0.62) * (darkness ** 0.85) * fade
        if r < 0.8:
            continue
        alpha = int(255 * min(1.0, 0.45 + 0.55 * fade) * min(1.0, 0.35 + darkness))
        x, y = gx * CELL + CELL / 2, gy * CELL + CELL / 2
        d.ellipse((x - r, y - r, x + r, y + r), fill=(17, 17, 17, alpha))

canvas.save(args.out, optimize=True)
print(args.out, canvas.size, os.path.getsize(args.out) // 1024, "KB")
