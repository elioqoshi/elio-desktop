#!/usr/bin/env python3
"""Build a single self-contained index.html from src/, vendor/ and assets/.

The words come from content/*.md (About, Help, Imprint, desktop links, Clients).
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
# ---------- content/*.md ----------
# The text of About, Help and Imprint, the desktop links and the Clients menu live in content/
# as Markdown. This is a small renderer for just what those files use:
#   ## heading          a bold heading (Imprint: a fieldset with that legend)
#   **bold**  *muted*   bold text, grey text (the pixel font has no italic)
#   [text](url)         a link; external ones open in a new tab
#   line\              a line break inside a paragraph
#   - item              a list
#   ---                 the etched Windows 98 separator
#   a line of links     a row of buttons; [**text**](url) is the default one, [text](#close) closes the window
LINK = re.compile(r'\[([^\]]+)\]\(([^)\s]+)\)')

def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

def md_inline(t):
    t = esc(t)
    def link(m):
        text, url = m.group(1), m.group(2)
        ext = url.startswith('http')
        return '<a href="%s"%s>%s</a>' % (url, ' target="_blank" rel="noopener"' if ext else '', text)
    t = LINK.sub(link, t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'\*(.+?)\*', r'<span class="muted">\1</span>', t)

def md_button(m, win):
    text, url = m.group(1), m.group(2)
    default = text.startswith('**') and text.endswith('**')
    text = esc(text.strip('*'))
    if url == '#close':
        return '<button type="button" data-close="%s">%s</button>' % (win, text)
    ext = url.startswith('http')
    return '<a class="btn98%s" href="%s"%s>%s</a>' % (' default' if default else '', esc(url), ' target="_blank" rel="noopener"' if ext else '', text)

def md(name, win, fieldsets=False):
    text = re.sub(r'<!--.*?-->', '', (ROOT / 'content' / (name + '.md')).read_text(), flags=re.S).strip()
    out, first, open_set = [], True, False
    for block in re.split(r'\n\s*\n', text):
        block = block.strip()
        if not block:
            continue
        lines = block.split('\n')
        h = re.match(r'#{1,6}\s+(.*)', block)
        if h and len(lines) == 1:
            id_ = ' id="%s-p"' % win if first else ''
            first = False
            if fieldsets:
                if open_set: out.append('</fieldset>')
                out.append('<fieldset><legend%s>%s</legend>' % (id_, md_inline(h.group(1))))
                open_set = True
            else:
                out.append('<h2%s>%s</h2>' % (id_, md_inline(h.group(1))))
        elif re.fullmatch(r'-{3,}', block):
            out.append('<div class="sep98" role="separator"></div>')
        elif lines[0].startswith('- '):
            items = []
            for line in lines:
                if line.startswith('- '): items.append(line[2:].strip())
                else: items[-1] += ' ' + line.strip()
            out.append('<ul class="tree-view">' + ''.join('<li>%s</li>' % md_inline(i) for i in items) + '</ul>')
        elif re.fullmatch(r'(\s*\[[^\]]+\]\([^)\s]+\))+\s*', block):
            out.append('<div class="btns98">' + ''.join(md_button(m, win) for m in LINK.finditer(block)) + '</div>')
        else:
            out.append('<p>' + ''.join(md_inline(l[:-1]) + '<br>' if l.endswith('\\') else md_inline(l) + ' ' for l in lines).strip() + '</p>')
    if open_set:
        out.append('</fieldset>')
    return '\n'.join(out)

def md_links(name):
    rx = re.compile(r'^- \[([^\]]+)\]\(([^)\s]+)\)(?:\s*<!--\s*icon:\s*([\w-]+)\s*-->)?', re.M)
    return [{'name': m.group(1), 'href': m.group(2), 'icon': m.group(3)} for m in rx.finditer((ROOT / 'content' / (name + '.md')).read_text())]

body = (ROOT / 'src/body.html').read_text()
for name, win, sets in [('about', 'about', False), ('help', 'contact', False), ('imprint', 'imprint', True)]:
    body = body.replace('<!-- md:%s -->' % name, md(name, win, sets))
body = inline(body)
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
js = 'window.LINKS = %s;\nwindow.CLIENTS = %s;\n' % (json.dumps(md_links('links')), json.dumps(md_links('clients'))) + js

# wallpapers/ is not inlined either: the dithered Ghosts I-IV artwork from tools/dither.py.
# The inlined desert (assets/wallpaper-ghosts.png) is the first of the set; a script in <head>
# picks one per 15 minutes before the page is drawn, so a refresh after that shows the next
walls = [None] + ['wallpapers/' + urllib.parse.quote(p.name) for p in sorted((ROOT / 'wallpapers').glob('*.png'))]
head_js = '''window.WALLPAPERS = %s;
window.wallpaperNow = function () { return WALLPAPERS[Math.floor(Date.now() / 9e5) %% WALLPAPERS.length]; };
(function () {
  var w = wallpaperNow(), saved = null;
  try { saved = JSON.parse(localStorage.getItem('elio98:wallpaper')); } catch (e) {}
  if (w && !saved) { var s = document.documentElement.style; s.backgroundImage = 'url("' + w + '")'; s.backgroundPosition = 'center bottom'; }
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
