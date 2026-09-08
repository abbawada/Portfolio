"""Row of panels with a caption: python3 tools/circuit/panels.py OUT.png "Title" img1 img2 img3"""
import sys
from PIL import Image, ImageDraw, ImageFont
out, title, paths = sys.argv[1], sys.argv[2], sys.argv[3:]
imgs = [Image.open(p).convert("RGB") for p in paths]
def centre(i, w=900, h=640):
    x0, y0 = (i.width - w) // 2, (i.height - h) // 2
    return i.crop((x0, y0, x0 + w, y0 + h))
imgs = [centre(i) for i in imgs]
h = 600; imgs = [i.resize((int(i.width * h / i.height), h), Image.LANCZOS) for i in imgs]
gap, cap = 16, 44
W = sum(i.width for i in imgs) + gap * (len(imgs) - 1); sheet = Image.new("RGB", (W, h + cap), "#f7f5f0")
try: font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
except Exception: font = ImageFont.load_default()
ImageDraw.Draw(sheet).text((12, 10), title, fill="#141414", font=font)
x = 0
for i in imgs: sheet.paste(i, (x, cap)); x += i.width + gap
sheet.save(out, optimize=True); print(out, sheet.size)
