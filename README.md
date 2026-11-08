# elio-desktop

Elio Qoshi's personal homepage: a retro desktop in the style of Windows 95/98
with a touch of Poolsuite. Draggable icons open windows with an about page,
talks, clients, a clock, a radio and an imprint.

Live at https://elioqoshi.github.io/elio-desktop/

## Build and run

The site is plain HTML, CSS and JavaScript with no framework and no
dependencies. You only need Python 3.

```
python3 build.py                 # writes index.html
python3 -m http.server 8000      # then open http://localhost:8000
```

`build.py` inlines all CSS, JS, fonts and images as data URIs, so `index.html`
is a single self-contained file (apart from `photos/`). Opening it straight from disk works too, but
the YouTube embed and the music stream work best served over http.

`index.html` is generated and not committed. Edit `src/`, `vendor/` and
`assets/` instead. See `CLAUDE.md` for the design rules.

## Photos

Put `.jpg`, `.png`, `.gif` or `.webp` files in `photos/originals/`, then
dither and rebuild:

```
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # once
.venv/bin/python tools/dither.py
python3 build.py
```

The same command dithers new wallpapers dropped in `wallpapers/originals/`.

`tools/dither.py` gives each new or changed photo a 16-colour ordered dither,
like the wallpaper, at the exact size it is shown at: `photos/<name>.png` for
the viewer and `photos/thumbs/<name>.png` for the folder. The desktop shows
the dithered versions; "View Full Size" in the right-click menu opens the original. Photos are sorted by
file name, which is also the label. They are not inlined into `index.html`.

## Deploying

Every push to `main` runs `.github/workflows/pages.yml`. It builds the page
and publishes `index.html`, `photos/` and `LICENSES/` to GitHub Pages.

## Project layout

| Path | What it is |
| --- | --- |
| `src/body.html` | All markup: menu bar, desktop, every window |
| `src/styles.css` | Desktop styling and dark mode |
| `src/app.js` | Windows, icons, menus, clock, media player, radio, theme |
| `vendor/98.css` | 98.css, lightly modified (see below) |
| `assets/` | Font, icons, wallpaper, cursors, portrait |
| `photos/` | Photos for the desktop photos folder (see below) |
| `wallpapers/` | Rotating Ghosts I–IV wallpapers, dithered by `tools/dither.py` |
| `tools/dither.py` | Dithers the photos |
| `IMPRINT.md` | Imprint and credits, the same as the Imprint window |
| `LICENSES/` | License texts for third-party assets |
| `build.py` | Builds `index.html` |

## Assets and credits

| Asset | Files | Source | License |
| --- | --- | --- | --- |
| 98.css (windows, buttons, controls) | `vendor/98.css` | [jdan/98.css](https://github.com/jdan/98.css) by Jordan Scales | MIT, [`LICENSES/98.css-MIT.txt`](LICENSES/98.css-MIT.txt) |
| MS Sans Serif font (regular and bold) | `assets/ms-sans-serif.woff2`, `assets/ms-sans-serif-bold.woff2` | [MS Sans Serif](https://fontstruct.com/fontstructions/show/1384746) and [MS Sans Serif Bold](https://fontstruct.com/fontstructions/show/1384862) by lou, made with FontStruct, as shipped with 98.css 0.1.21 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), [`LICENSES/MS-Sans-Serif-*`](LICENSES/) |
| Desktop icons (32x32) | `assets/icons.png` (sprite) | [SerenityOS](https://github.com/SerenityOS/serenity), © the SerenityOS developers | BSD 2-Clause, [`LICENSES/SerenityOS-BSD-2-Clause.txt`](LICENSES/SerenityOS-BSD-2-Clause.txt) |
| Pixel clock | `src/app.js` (`Clock`) | Ported from SerenityOS AnalogClock, © 2021 Erlend Høier | BSD 2-Clause |
| Cursors | `assets/cursors/` | SerenityOS default cursor theme: arrow, hand, I-beam, the four resize arrows and the 14-frame hourglass, plus pixel-doubled `@2x` copies | BSD 2-Clause |
| Winamp icon | in `assets/icons.png` | Supplied by Elio | Winamp logo is a trademark of its owner, used as a nod |
| Music | streamed, not in the repo | Nine Inch Nails, *Ghosts I–IV*, all 36 tracks from the official 2008 release, streamed from the [Internet Archive](https://archive.org/details/nine-inch-nails-ghosts-i-iv-2008-web) | [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) (non-commercial) |
| Talk video | embedded from YouTube | FOSS Backstage 2026 talk | YouTube embed |
| FOSDEM talk video | streamed, not in the repo | "The UI Layer of Security: What could go wrong?", FOSDEM 2026, recorded by FOSDEM, streamed from [video.fosdem.org](https://video.fosdem.org/2026/ub4132/) | [CC BY 2.0 BE](https://creativecommons.org/licenses/by/2.0/be/) |
| Wallpapers | `assets/wallpaper-ghosts.png`, `wallpapers/` (originals in `wallpapers/originals/`) | Nine Inch Nails, *Ghosts I–IV* album artwork by Rob Sheridan, ordered-dithered to 16 colours for this site; a new one every 15 minutes | [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) (non-commercial, share-alike) |
| Portrait | `assets/portrait-original.jpg`, `assets/portrait-dither.png`, `assets/portrait-small.png` | Photo of Elio by [Jeremie Pontin](https://www.jeremiepontin.com/), dithered for this site | © Jeremie Pontin, not covered by the MIT license |
| Sample photos | `photos/originals/` (dithered copies in `photos/`) | Unsplash: [Brandenburg Gate](https://unsplash.com/photos/uFGi0_YciE0), [TV tower](https://unsplash.com/photos/g8DI2ZZFt8I), [U-Bahn](https://unsplash.com/photos/Y_aNcALhqZw) | [Unsplash License](https://unsplash.com/license) |
| Favicon | `assets/favicon.png` | Made for this site | Elio Qoshi |

### Changes to 98.css

- `a.btn98` links get button styling via `:is(button,a.btn98)`.
- The MS Sans Serif `@font-face` rules were removed from `vendor/98.css`; the
  same fonts are declared in `src/styles.css` so `build.py` can inline them.

### Redistribution notes

- The MS Sans Serif readme requires its license and readme
  (`LICENSES/MS-Sans-Serif-*`) to ship with the font files. The Pages workflow copies `LICENSES/` next to `index.html` for this
  reason.
- *Ghosts I–IV* (music and artwork) is licensed for non-commercial use only.
  The dithered wallpaper is a derivative, so it is shared under the same
  CC BY-NC-SA 3.0 license.
- The imprint window on the site and [`IMPRINT.md`](IMPRINT.md) list the same
  credits. Keep all three in sync.

## License

The site's own code is released under the [MIT License](LICENSE). Third-party
assets keep the licenses listed above, and the portrait photo remains
© Jeremie Pontin.
