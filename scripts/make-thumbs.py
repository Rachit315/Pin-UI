"""
Card-sized WebP posters for every clip's still.

The posters in public/clips/loop are 1280x720 JPEGs, kept as the clips' own
first frames. Everywhere a poster is shown it is card-sized — the shelf, the
hero wall, the Pinterest peek, the star card — so those places use these
instead: 768x432 (sharp at 2x on a ~384px card) WebP, a fraction of the bytes.
`thumbOf()` in components/library/registry.ts maps one path to the other.

    python scripts/make-thumbs.py        # after adding or re-rendering a poster
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "public" / "clips"
SRC, OUT = ROOT / "loop", ROOT / "thumb"
OUT.mkdir(exist_ok=True)

before = after = 0
for jpg in sorted(SRC.glob("*.jpg")):
    webp = OUT / (jpg.stem + ".webp")
    with Image.open(jpg) as im:
        im = im.convert("RGB")
        im.thumbnail((768, 432), Image.LANCZOS)
        im.save(webp, "WEBP", quality=78, method=6)
    before += jpg.stat().st_size
    after += webp.stat().st_size
    print(f"{jpg.name:32} {jpg.stat().st_size // 1024:4}KB -> {webp.stat().st_size // 1024:3}KB")
print(f"total {before // 1024}KB -> {after // 1024}KB")
