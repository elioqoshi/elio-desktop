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
is a single self-contained file. Opening it straight from disk works too, but
the YouTube and SoundCloud embeds need to be served over http.

`index.html` is generated and not committed. Edit `src/`, `vendor/` and
`assets/` instead. See `CLAUDE.md` for the design rules.

## Deploying

Every push to `main` runs `.github/workflows/pages.yml`. It builds the page
and publishes `index.html` and `LICENSES/` to GitHub Pages.

## Project layout

| Path | What it is |
| --- | --- |
| `src/body.html` | All markup: menu bar, desktop, every window |
| `src/styles.css` | Desktop styling and dark mode |
| `src/app.js` | Windows, icons, menus, clock, media player, radio, theme |
| `vendor/98.css` | 98.css, lightly modified (see below) |
| `assets/` | Font, icons, wallpaper, cursor, portrait |
| `LICENSES/` | License texts for third-party assets |
| `build.py` | Builds `index.html` |

## Assets and credits

| Asset | Files | Source | License |
| --- | --- | --- | --- |
| 98.css (windows, buttons, controls) | `vendor/98.css` | [jdan/98.css](https://github.com/jdan/98.css) by Jordan Scales | MIT, [`LICENSES/98.css-MIT.txt`](LICENSES/98.css-MIT.txt) |
| Ari-W9500 font | `assets/ari-w9500.woff2` (subset), `assets/ari-w9500-full.otf` | [Ari-W9500](https://fontstruct.com/fontstructions/show/2368522/ari-w9500) by Catterio Sylt, made with FontStruct | SIL OFL 1.1, [`LICENSES/Ari-W9500-OFL.txt`](LICENSES/Ari-W9500-OFL.txt) and [`LICENSES/Ari-W9500-readme.txt`](LICENSES/Ari-W9500-readme.txt) |
| Desktop icons (32x32) | `assets/icons.png` (sprite) | [SerenityOS](https://github.com/SerenityOS/serenity), © the SerenityOS developers | BSD 2-Clause, [`LICENSES/SerenityOS-BSD-2-Clause.txt`](LICENSES/SerenityOS-BSD-2-Clause.txt) |
| Pixel clock | `src/app.js` (`Clock`) | Ported from SerenityOS AnalogClock, © 2021 Erlend Høier | BSD 2-Clause |
| Wait cursor | `assets/cursor-wait.png` | SerenityOS 16x16 timer icon, drawn at 2x | BSD 2-Clause |
| Winamp icon | in `assets/icons.png` | Supplied by Elio | Winamp logo is a trademark of its owner, used as a nod |
| Music | streamed, not in the repo | Nine Inch Nails, *Ghosts I–IV*, via a SoundCloud set | [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) (non-commercial) |
| Talk video | embedded from YouTube | FOSS Backstage 2026 talk | YouTube embed |
| Wallpaper | `assets/wallpaper-ghosts.png` | Nine Inch Nails, *Ghosts I–IV* album artwork by Rob Sheridan, ordered-dithered to 16 colours for this site | [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) (non-commercial, share-alike) |
| Portrait | `assets/portrait-original.jpg`, `assets/portrait-dither.png` | Photo of Elio by [Jeremie Pontin](https://www.jeremiepontin.com/), dithered for this site | © Jeremie Pontin, not covered by the MIT license |
| Favicon | `assets/favicon.png` | Made for this site | Elio Qoshi |

### Changes to 98.css

- `a.btn98` links get button styling via `:is(button,a.btn98)`.
- The MS Sans Serif `@font-face` rules were removed. The site uses Ari-W9500.

### Redistribution notes

- The Ari-W9500 license requires `LICENSES/Ari-W9500-*` to ship with the font
  files. The Pages workflow copies `LICENSES/` next to `index.html` for this
  reason.
- *Ghosts I–IV* (music and artwork) is licensed for non-commercial use only.
  The dithered wallpaper is a derivative, so it is shared under the same
  CC BY-NC-SA 3.0 license.
- The imprint window on the site lists the same credits. Keep both in sync.

## License

The site's own code is released under the [MIT License](LICENSE). Third-party
assets keep the licenses listed above, and the portrait photo remains
© Jeremie Pontin.
