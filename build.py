#!/usr/bin/env python3
"""Build a single self-contained index.html from src/, vendor/ and assets/.

Every asset referenced as url(assets/...) in CSS or src="assets/..." in HTML is
inlined as a data URI, so the output is one file with no outside requests except
the YouTube and SoundCloud embeds and the
photos in photos/ (dithered by tools/dither.py), which are listed but loaded
as separate files.

Usage: python3 build.py   (writes index.html next to this script)
"""
import base64, json, mimetypes, pathlib, re, urllib.parse

ROOT = pathlib.Path(__file__).parent
MIME = {'.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg'}

def data_uri(rel):
    path = ROOT / rel
    mime = MIME.get(path.suffix) or mimetypes.guess_type(path.name)[0]
    return 'data:%s;base64,%s' % (mime, base64.b64encode(path.read_bytes()).decode())

def inline(text):
    text = re.sub(r'url\((assets/[^)]+)\)', lambda m: 'url(%s)' % data_uri(m.group(1)), text)
    return re.sub(r'src="(assets/[^"]+)"', lambda m: 'src="%s"' % data_uri(m.group(1)), text)

css98 = (ROOT / 'vendor/98.css').read_text()
css = inline((ROOT / 'src/styles.css').read_text())
body = inline((ROOT / 'src/body.html').read_text())
js = (ROOT / 'src/app.js').read_text()

# photos/ is not inlined: the page lists the dithered files from tools/dither.py
# and loads them next to index.html; the original is the full-size link
PHOTO_EXT = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
src_dir = ROOT / 'photos' / 'originals'
originals = sorted(p for p in src_dir.iterdir() if p.suffix.lower() in PHOTO_EXT) if src_dir.is_dir() else []
photos, stale = [], []
for p in originals:
    view, thumb = ROOT / 'photos' / (p.stem + '.png'), ROOT / 'photos' / 'thumbs' / (p.stem + '.png')
    if not (view.exists() and thumb.exists()):
        stale.append(p.name); continue
    q = urllib.parse.quote
    photos.append({'name': p.name, 'src': 'photos/' + q(view.name), 'thumb': 'photos/thumbs/' + q(thumb.name),
                   'full': 'photos/originals/' + q(p.name)})
if stale:
    print('not dithered yet, run python3 tools/dither.py: ' + ', '.join(stale))
js = 'window.PHOTOS = %s;\n' % json.dumps(photos) + js

# wallpapers/ is not inlined either: the dithered Ghosts I-IV artwork from tools/dither.py.
# The inlined desert (assets/wallpaper-ghosts.png) is the first of the set; a script in <head>
# picks one per 15 minutes before the page is drawn, so a refresh after that shows the next
walls = [None] + ['wallpapers/' + urllib.parse.quote(p.name) for p in sorted((ROOT / 'wallpapers').glob('*.png'))]
head_js = '''window.WALLPAPERS = %s;
window.wallpaperNow = function () { return WALLPAPERS[Math.floor(Date.now() / 9e5) %% WALLPAPERS.length]; };
(function () {
  var w = wallpaperNow(), saved = null;
  try { saved = JSON.parse(localStorage.getItem('elio98:wallpaper')); } catch (e) {}
  if (w && !saved) { var s = document.documentElement.style; s.backgroundImage = 'url("' + w + '")'; s.backgroundPosition = 'center'; }
})();''' % json.dumps(walls)

html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Elio Qoshi</title>
<meta name="description" content="hi! i’m Elio. i design things for open source, privacy and security software.">
<link rel="icon" href="{data_uri('assets/favicon.png')}">
<script>
{head_js}
</script>
<style>
{css98}
</style>
<style>
{css}
</style>
</head>
<body>
{body}
<script>
{js}
</script>
</body>
</html>
'''
(ROOT / 'index.html').write_text(html)
print('wrote index.html (%d KB, %d photos)' % (len(html) // 1024, len(photos)))
