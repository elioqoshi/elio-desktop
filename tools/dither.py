#!/usr/bin/env python3
"""Dither the photos in photos/originals/ for the desktop photos folder.

For every original it writes two palette PNGs with a 4x4 ordered (Bayer)
dither, each at the exact 1x size it is shown at, so the page's zoom:2 draws
every pixel as a clean 2x2 block:

  photos/<name>.png         fits the viewer window (VIEW_W x VIEW_H)
  photos/thumbs/<name>.png  fills a folder thumbnail (THUMB_W x THUMB_H)

It does the same for the rotating wallpapers in wallpapers/originals/:

  wallpapers/<name>.png         WALL_W wide, keeping the original's shape
  wallpapers/view/<name>.png    for the Wallpapers folder's viewer, like photos
  wallpapers/thumbs/<name>.png  its folder thumbnail

The inlined desert (assets/wallpaper-ghosts.png) gets a viewer and thumbnail
copy too, as ghosts-00, so it comes first in the folder.

Only new or changed originals are redone; outputs whose original is gone are
removed. Needs Pillow (pip install -r requirements.txt).

Usage: python3 tools/dither.py [--force]
"""
import pathlib, sys
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'photos' / 'originals'
OUT = ROOT / 'photos'
THUMBS = OUT / 'thumbs'
EXT = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}

VIEW_W, VIEW_H = 308, 230    # inside of the viewer's sunken panel
THUMB_W, THUMB_H = 56, 42    # .pthumb img in styles.css
COLOURS = 16
WALL_W = 716                 # same width as assets/wallpaper-ghosts.png; covers the screen at 2x
WALLS = ROOT / 'wallpapers'

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def dither(img, colours=COLOURS):
    """Ordered-dither an RGB image to its own `colours`-colour palette."""
    pal = img.quantize(colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).getpalette()
    pal = sorted(set(tuple(pal[i:i + 3]) for i in range(0, colours * 3, 3)), key=sum)
    # the usual gap between neighbouring palette colours sets how far the pattern nudges a pixel
    gaps = sorted(min(sum((a - b) ** 2 for a, b in zip(c, o)) ** .5 for o in pal if o != c) for c in pal)
    spread = gaps[len(gaps) // 2] if gaps else 32
    w, h = img.size
    px = img.load()
    out = Image.new('P', (w, h))
    out.putpalette([v for c in pal for v in c])
    dst = out.load()
    cache = {}
    for y in range(h):
        row = BAYER[y & 3]
        for x in range(w):
            t = (row[x & 3] / 16 - .5) * spread
            r, g, b = px[x, y]
            key = (int(r + t) >> 2, int(g + t) >> 2, int(b + t) >> 2)
            k = cache.get(key)
            if k is None:
                q = (r + t, g + t, b + t)
                k = cache[key] = min(range(len(pal)), key=lambda i: sum((q[j] - pal[i][j]) ** 2 for j in range(3)))
            dst[x, y] = k
    return out


def load(path):
    img = ImageOps.exif_transpose(Image.open(path))
    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGBA')
        bg = Image.new('RGBA', img.size, (0, 0, 0, 255))
        img = Image.alpha_composite(bg, img)
    return img.convert('RGB')


DESERT = ROOT / 'assets' / 'wallpaper-ghosts.png'


def small(src, stem, force):
    # the viewer and thumbnail copies, like a photo's
    view, thumb = WALLS / 'view' / (stem + '.png'), WALLS / 'thumbs' / (stem + '.png')
    if not force and all(p.exists() and p.stat().st_mtime >= src.stat().st_mtime for p in (view, thumb)):
        return
    img = load(src)
    v = img.copy(); v.thumbnail((VIEW_W, VIEW_H), Image.LANCZOS)
    dither(v).save(view, optimize=True)
    dither(ImageOps.fit(img, (THUMB_W, THUMB_H), Image.LANCZOS)).save(thumb, optimize=True)


def walls(force=False):
    src_dir = WALLS / 'originals'
    if not src_dir.is_dir():
        return
    for d in ('view', 'thumbs'):
        (WALLS / d).mkdir(exist_ok=True)
    stems = {'ghosts-00'}
    small(DESERT, 'ghosts-00', force)
    for src in sorted(p for p in src_dir.iterdir() if p.suffix.lower() in EXT):
        stems.add(src.stem)
        small(src, src.stem, force)
        out = WALLS / (src.stem + '.png')
        if not force and out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
            continue
        img = load(src)
        img = img.resize((WALL_W, round(img.height * WALL_W / img.width)), Image.LANCZOS)
        dither(img).save(out, optimize=True)
        print('dithered wallpaper %s -> %dx%d' % (src.name, img.width, img.height))
    for folder in (WALLS, WALLS / 'view', WALLS / 'thumbs'):
        for p in folder.glob('*.png'):
            if p.stem not in stems or (folder == WALLS and p.stem == 'ghosts-00'):
                p.unlink(); print('removed %s' % p.relative_to(ROOT))


def main(force=False):
    walls(force)
    if not SRC.is_dir():
        print('no photos/originals/ folder, nothing to do')
        return
    THUMBS.mkdir(parents=True, exist_ok=True)
    stems = set()
    for src in sorted(p for p in SRC.iterdir() if p.suffix.lower() in EXT):
        stems.add(src.stem)
        view, thumb = OUT / (src.stem + '.png'), THUMBS / (src.stem + '.png')
        mtime = src.stat().st_mtime
        if not force and all(p.exists() and p.stat().st_mtime >= mtime for p in (view, thumb)):
            continue
        img = load(src)
        v = img.copy(); v.thumbnail((VIEW_W, VIEW_H), Image.LANCZOS)
        dither(v).save(view, optimize=True)
        t = ImageOps.fit(img, (THUMB_W, THUMB_H), Image.LANCZOS)
        dither(t).save(thumb, optimize=True)
        print('dithered %s -> %dx%d' % (src.name, v.width, v.height))
    for folder in (OUT, THUMBS):
        for p in folder.glob('*.png'):
            if p.stem not in stems:
                p.unlink(); print('removed %s' % p.relative_to(ROOT))


if __name__ == '__main__':
    main(force='--force' in sys.argv[1:])
