"""The Board pipeline. Reads the source images in docs/circuit/refs/board/
(gitignored, Abba's originals as supplied), writes images/board/<id>.jpg at
1000 px on the long side and circuit/board.js with sizes and titles.
Usage: /usr/bin/python3 tools/circuit/board.py   (needs Pillow)
Titles are Abba's to edit here; crops pick a panel out of a composite."""
import json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "docs", "circuit", "refs", "board")
OUT = os.path.join(ROOT, "images", "board")

# id, source file, crop box or None, title
ITEMS = [
    ("osaka",        "osaka.jpeg",        None,                   "Dotonbori, Osaka"),
    ("spiderman",    "spiderman.jpeg",    None,                   "Spider-Man"),
    ("porsche",      "porsche.jpeg",      None,                   "911, number 12"),
    ("ferrari",      "ferrari.jpg",       None,                   "Ferrari, Monaco"),
    ("monaco",       "monaco.jpeg",       None,                   "Monaco, race week"),
    ("senna",        "senna.jpeg",        None,                   "Senna and the trophy"),
    ("jeffhardy",    "jeffhardy.jpeg",    None,                   "Jeff Hardy"),
    ("helmet",       "helmet.jpg",        None,                   "The visor"),
    ("trio",         "trio.png",          None,                   "GTA IV, Jordan, LittleBigPlanet"),
    ("gta4",         "trio.png",          (0, 0, 548, 585),       "Grand Theft Auto IV"),
    ("jordan",       "trio.png",          (578, 0, 1146, 495),    "Jordan, Xbox in hand"),
    ("lbp",          "trio.png",          (578, 520, 1146, 1150), "LittleBigPlanet"),
    ("fisheye",      "fisheye.png",       None,                   "Night street, fisheye"),
    ("palace",       "palace.png",        None,                   "Palace, Seoul"),
    ("nigo",         "nigo.png",          None,                   "Nigo and Baby Milo"),
    ("mouse",        "mouse.png",         None,                   "Apple Pro Mouse"),
    ("imac",         "imac.png",          None,                   "iMac G3"),
    ("moreira",      "moreira.png",       None,                   "Big Box Collection"),
    ("moreira-site", "moreira-site.png",  None,                   "Big Box Collection, on the site"),
    ("sleeve",       "sleeve.png",        None,                   "Betta, the sleeve"),
]

def main():
    os.makedirs(OUT, exist_ok=True)
    out, missing = [], []
    for id_, src, crop, title in ITEMS:
        path = os.path.join(SRC, src)
        if not os.path.exists(path):
            missing.append((id_, src)); continue
        im = Image.open(path)
        if crop: im = im.crop(crop)
        im = im.convert("RGB")
        im.thumbnail((1000, 1000), Image.LANCZOS)
        dst = os.path.join(OUT, id_ + ".jpg")
        im.save(dst, "JPEG", quality=82, optimize=True, progressive=True)
        out.append({"id": id_, "file": id_ + ".jpg", "w": im.size[0], "h": im.size[1], "title": title})
        print(f"{id_:13s} {im.size[0]}x{im.size[1]}  {os.path.getsize(dst) // 1024} KB")
    js = ("/* The Board (V1.2): Abba's images, the ones he grew up on, shown as\n"
          "   themselves on the track hoardings, the blimp screen and the Board\n"
          "   panel. Files live in images/board/, resized to 1000 px by\n"
          "   tools/circuit/board.py from the originals in docs/circuit/refs/board/;\n"
          "   titles are his to edit there. */\n"
          "window.CircuitBoard = " + json.dumps({"dir": "images/board/", "items": out}, indent=1) + ";\n")
    open(os.path.join(ROOT, "circuit", "board.js"), "w").write(js)
    print("items", len(out), "| total KB", sum(os.path.getsize(os.path.join(OUT, o["file"])) for o in out) // 1024)
    for id_, src in missing: print("MISSING", id_, "expected", os.path.join("docs/circuit/refs/board", src))

if __name__ == "__main__":
    main()
