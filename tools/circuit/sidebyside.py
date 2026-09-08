"""Compose before/after pairs into one image per angle, plus a stacked sheet.
Usage: /usr/bin/python3 tools/circuit/sidebyside.py DIR   (expects before-N-*.png and after-N-*.png)"""
import os, sys, glob, re
from PIL import Image, ImageDraw, ImageFont

d = sys.argv[1]
befores = sorted(glob.glob(os.path.join(d, "before-*.png")))
rows = []
for b in befores:
    a = b.replace("before-", "after-")
    if not os.path.exists(a): continue
    B, A = Image.open(b).convert("RGB"), Image.open(a).convert("RGB")
    w, h = B.size
    gap, cap = 24, 40
    out = Image.new("RGB", (w * 2 + gap, h + cap), "#f7f5f0")
    out.paste(B, (0, cap)); out.paste(A, (w + gap, cap))
    dr = ImageDraw.Draw(out)
    try: font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
    except Exception: font = ImageFont.load_default()
    name = re.sub(r"^before-\d-", "", os.path.basename(b)).replace(".png", "")
    dr.text((12, 9), f"BEFORE  ·  {name}", fill="#6b675f", font=font)
    dr.text((w + gap + 12, 9), f"AFTER  ·  {name}", fill="#141414", font=font)
    path = os.path.join(d, os.path.basename(b).replace("before-", "sidebyside-"))
    out.save(path, optimize=True); rows.append(out); print(path, out.size)
if rows:
    W = max(r.width for r in rows); H = sum(r.height for r in rows) + 16 * (len(rows) - 1)
    sheet = Image.new("RGB", (W, H), "#f7f5f0"); y = 0
    for r in rows: sheet.paste(r, (0, y)); y += r.height + 16
    sheet = sheet.resize((W // 2, H // 2), Image.LANCZOS)
    p = os.path.join(d, "sidebyside-sheet.png"); sheet.save(p, optimize=True); print(p, sheet.size)
