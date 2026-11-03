# elio-desktop

Elio Qoshi's personal page: a retro desktop in the style of Windows 95/98 with a
touch of Poolsuite. Visitors land on a desktop with draggable icons that open
windows. It is a business card, not a sales page.

## Build and run

- `python3 build.py` writes `index.html`, a single self-contained file with all
  CSS, JS, fonts and images inlined as data URIs. Always rebuild after editing.
- Open `index.html` in a browser to test. No server or dependencies needed.
- Edit only the files in `src/`, `vendor/`, `assets/` and `photos/`.
  `index.html` is generated.

## Files

- `src/body.html`: all markup (menu bar, desktop, every window)
- `src/styles.css`: page basics plus all desktop styling and dark mode
- `src/app.js`: plain JavaScript, no framework (windows, icons, menus, clock,
  media player, SoundCloud radio, theme)
- `vendor/98.css`: 98.css, modified so `a.btn98` links get button styling via
  `:is(button,a.btn98)`; its MS Sans Serif @font-face rules were removed
- `photos/`: photos for the desktop photos folder. `build.py` lists them in
  `window.PHOTOS` but does not inline them; they are served next to
  `index.html` (the Pages workflow copies the folder)
- `assets/`: Ari-W9500 font (subset, plus the full .otf), SerenityOS icon sprite,
  wallpaper, wait cursor, dithered portrait (and the original photo)

## Design rules (keep these)

- Everything is drawn at native 1x pixel sizes and the whole page is scaled with
  `.root98{zoom:2}`. Desktop layout math in app.js divides pointer movement by 2.
- Font: Ari-W9500 only. Its grid is 11px: use 11px (line-height 14px) for text
  and 22px (line-height 28px) for headings. Other sizes blur. There is no bold
  file, and `font-synthesis:none` prevents fake bold.
- Icons: only the SerenityOS 32x32 icon set (`assets/icons.png` sprite, 32px
  cells, see `.ico-*` classes) plus the user-supplied Winamp icon. Do not draw
  or add icons from elsewhere. The wait cursor is SerenityOS's 16x16 timer icon
  at 2x.
- Windows: 98.css components. Title bars are one light blue (#A8DDE6; dark
  mode #2E6E7A). Light theme windows are #E4E4E4 with retuned bevels, not
  98.css silver.
- Wallpaper: Ghosts I–IV album artwork (CC BY-NC-SA 3.0), 4x4 ordered
  dither to 16 colours at 716x422 (`assets/wallpaper-ghosts.png`). Same in
  both themes. It sits on `html`, not `.root98`, so `zoom:2` does not scale it
  twice; it covers the viewport with `image-rendering:pixelated`.
- Dark theme: the sun button in the menu bar; defaults to the system setting
  and remembers the visitor's choice in localStorage.
- Opening a window waits 1 second with the wait cursor, like an old PC.
  Windows open at random spots that stay fully inside the desktop.
- Phones (<=760px): icons become a grid and windows stack.

## Copy voice

Short, lowercase, friendly and a bit weird, like a 90s homepage. No selling,
no marketing claims, no invented facts about Elio. Keep screen reader labels
plain and descriptive.

## Facts about Elio (only use these)

- Founder of Ura Design, a design studio in Berlin for open source, privacy and
  security software (https://ura.design). Previously Canonical (Ubuntu),
  Mozilla, Tor Project.
- Email: elio@ura.design. Never publish his phone number.
- Imprint address: c/o Cultivation Space, Gottschedstr. 4, 13357 Berlin.
- Talk: "Identifying and Addressing Usability Vulnerabilities", FOSS Backstage
  2026, Berlin (YouTube video vctZaoDzq2k). Also spoke at FOSDEM 2026.

## Open items

- [ ] Try dithering in the browser: an SVG filter (`feImage` with a 4x4 Bayer
  tile plus `feComponentTransfer` `type="discrete"`) applied with
  `filter: url(#dither)`. Useful for photos in `photos/` and maybe the YouTube
  video, which can't be pre-dithered. Compare against the pre-dithered
  wallpaper and portrait before using it anywhere.
- LinkedIn and GitHub icons are placeholders ("coming soon!!"); add real URLs.
- Client links in the clients menu point to homepages and are unverified.
- Music is Nine Inch Nails, Ghosts I–IV (CC BY-NC-SA 3.0, non-commercial),
  streamed from a fan's SoundCloud set. Consider self-hosting from an official
  CC source, and keep the non-commercial clause in mind.
- YouTube and SoundCloud embeds need a host that allows third-party iframes.
  The radio shows "can't tune in here" if SoundCloud never responds.

## Licenses and credits

The imprint window credits everything. Keep these in sync with `LICENSES/`:
98.css (MIT), SerenityOS icons and pixel clock (BSD 2-Clause), Ari-W9500 font
by Catterio Sylt (SIL OFL 1.1, notice also in styles.css), Ghosts I–IV music
and wallpaper artwork by Rob Sheridan (CC BY-NC-SA 3.0), portrait photo by Jeremie Pontin
(https://www.jeremiepontin.com/, not covered by the MIT license). The site's
own code is MIT (`LICENSE`). The Winamp logo is a trademark of its owner. If the font
files are redistributed, ship `LICENSES/Ari-W9500-*` with them.
