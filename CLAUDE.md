# elio-desktop

Elio Qoshi's personal page: a retro desktop in the style of Windows 95/98 with a
touch of Poolsuite. Visitors land on a desktop with draggable icons that open
windows. It is a business card, not a sales page.

## Build and run

- `python3 build.py` writes `index.html`, a single self-contained file with all
  CSS, JS, fonts and images inlined as data URIs. Always rebuild after editing.
- Open `index.html` in a browser to test. No server or dependencies needed.
- Edit only the files in `content/`, `src/`, `vendor/`, `assets/`, `photos/`
  and `wallpapers/`.
  `index.html` is generated.

## Files

- `content/`: the words, as Markdown, rendered by build.py: `about.md`,
  `help.md`, `imprint.md` (each `##` is a fieldset), `links.md` (the desktop
  link icons; `<!-- icon: name -->` picks the `.ico-` class) and `clients.md`
  (the Clients menu). Change text there, not in body.html. The renderer knows
  `## heading`, `**bold**`, `*muted*` (grey; the font has no italic), links,
  `\` line breaks, `- lists`, `---` (separator) and a line of only links (a
  button row: `[**text**](url)` is the default button, `#close` closes the
  window). Window titles and layout stay in body.html
- `src/body.html`: all markup (menu bar, desktop, every window)
- `src/styles.css`: page basics plus all desktop styling and dark mode
- `src/app.js`: plain JavaScript, no framework (windows, icons, menus, clock,
  media player, Winamp radio, theme)
- `vendor/98.css`: 98.css, modified so `a.btn98` links get button styling via
  `:is(button,a.btn98)`; its MS Sans Serif @font-face rules were moved to
  `src/styles.css` (pointing at `assets/`) so the fonts get inlined
- `photos/`: the desktop photos folder. Originals go in `photos/originals/`;
  `tools/dither.py` (Pillow, see `requirements.txt`) writes dithered
  `photos/<name>.png` (viewer, 308x230 max) and `photos/thumbs/<name>.png`
  (56x42) for new or changed ones. `build.py` lists them in `window.PHOTOS`
  without inlining; the original opens from "View Full Size" in the viewer's right-click menu. The Pages workflow
  runs dither.py too and ships the whole folder
- `wallpapers/`: the rotating wallpapers (originals in `wallpapers/originals/`,
  dithered PNGs next to them); the Pages workflow ships the PNGs
- `assets/`: MS Sans Serif regular and bold (98.css's fonts), SerenityOS icon sprite,
  wallpaper, cursors (`assets/cursors/`), dithered portrait (and the original photo)

## Design rules (keep these)

- Everything is drawn at native 1x pixel sizes and the whole page is scaled with
  `.root98{zoom:2}`, except on phones (<=760px), which get zoom 1.5 (so the desk
  is about 250px wide there; `vh`/`vw` aren't zoomed, so phone sizes divide by
  1.5). Pointer math in app.js divides by `Z`, which follows the same breakpoint.
- Font: Pixelated MS Sans Serif (98.css's font) only, at 11px (line-height
  14px) for everything. Other sizes blur (1.5x on phones is the one exception:
  sharp on 2x screens, slightly uneven pixels on 3x ones). It has a real bold weight (700), so
  use bold freely; `font-synthesis:none` stays on so nothing is faked. No big
  headings: like Windows 98, structure comes from bold and spacing.
- Icons: only the SerenityOS 32x32 icon set (`assets/icons.png` sprite, 32px
  cells, see `.ico-*` classes) plus the user-supplied Winamp icon. Do not draw
  or add icons from elsewhere.
- Cursors: SerenityOS's default cursor theme, Windows 9x style, at normal
  cursor size (1x, with pixel-doubled `@2x` copies for dense screens via
  `-webkit-image-set`). Arrow everywhere (buttons and icons too, like 98),
  hand only on text links, I-beam in text fields, the diagonal resize arrow
  on the bottom-right corner (`resize`), and the 14-frame hourglass while busy (app.js steps `data-wf`).
- Windows: 98.css components. Title bars are the colour of the sky over
  Berlin right now: app.js works it out from the sun's height and Open-Meteo's
  current Berlin weather (cloud cover, rain, fog; fetched every 15 minutes,
  repainted every minute, last weather kept 3 hours in localStorage) and sets
  `--sky` and `--sky-text` (black or white by brightness). Blue by day, warm at
  sunrise/sunset, navy at night, grey with clouds, darker in rain, brownish
  grey on cloudy nights. Without script they fall back to light blue #A8DDE6
  (dark mode #2E6E7A). Open-Meteo is credited in the imprint (CC BY 4.0). Light theme windows are #E4E4E4 with retuned bevels, not
  98.css silver.
- Wallpaper: Ghosts I–IV album artwork by Rob Sheridan (CC BY-NC-SA 3.0),
  4x4 ordered dither to 16 colours, same in both themes. Ten of them take
  turns: a new one every 15 minutes, the same for everyone, picked by a script
  in `<head>` (build.py) so it shows after a refresh without a flash. The first
  is the inlined desert (`assets/wallpaper-ghosts.png`, 716x422); the rest are
  `wallpapers/<name>.png`, dithered by `tools/dither.py` from
  `wallpapers/originals/` at 716px wide and not inlined. A photo set as
  wallpaper wins until Restore Wallpaper. To add one, drop it in
  `wallpapers/originals/` and run dither.py. It sits on `html`, not `.root98`, so `zoom:2` does not scale it
  twice; it covers the viewport with `image-rendering:pixelated`.
- Dark theme: the sun button in the menu bar; defaults to the system setting
  and remembers the visitor's choice in localStorage.
- Opening a window waits 1 second with the turning hourglass, like an old PC
  (except the Clock, which opens instantly).
  Windows open at random spots that stay fully inside the desktop. Dragged,
  they can go off any side but the top, as long as 48px stay on the desk.
- Every window resizes from its bottom-right corner only: a folder's size grip,
  or an invisible `.rz98` handle (`resizable()` in app.js), with a grab area a
  little past the corner (bigger on touch screens). A resized window gets
  `.sized` and its body scrolls. Dialogs (`.fixed98`: About and Clock) don't resize. A resized
  photo viewer lets the photo fill the space; arrow keys and the buttons step
  through the photos in the folder the open photo is in.
- About is the one window open on arrival, laid out like a Windows 98 About
  box (340px wide): the portrait in a sunken frame on the left (`assets/portrait-small.png`,
  104x139, the same 6-grey ordered dither as `portrait-dither.png`), text on the right, an
  etched line and the buttons bottom right. portrait.jpg still opens on its own
  from the desk. The photo viewer has no full size button (the right-click
  menu still has View Full Size).
- The time in the menu bar opens the Clock window ("Berlin, Germany" and the time above the analog SerenityOS
  clock, the date underneath), dropped down
  right under it with its right edge lined up; clicking the time again closes
  it. There is no clock icon on the desk.
- Phones (<=760px): 1.5x zoom and the same free-form desk. The menu bar stays
  on one line (tighter buttons, the clock shows only the time) and About puts
  the portrait above the text: icons fill rows
  across the top (links stay docked bottom right), windows open below them and
  everything can be dragged. On touch screens title bars, close buttons, the
  bottom and side edges and the size grip have a bigger invisible grab area (`pointer:coarse`). A long press
  (350ms) opens the right-click menus; the desk turns off the browser's own
  callout and text selection, but text inside windows stays selectable.
- Files and folders: every desktop item (apps, links, photos, the photos
  folder, the trash, visitor folders) is an item in a folder tree (`ITEMS`
  in app.js). One click selects, a double-click opens (Enter and a tap on
  phones open right away). Any folder but the trash can be renamed (F2);
  the photos folder is an ordinary folder. Anything can be moved by dragging
  onto a folder icon, into a folder window or out onto the desk, or with
  Cut/Paste. Nested folder windows show their path in the title
  (`Photos\trips`).
- Trash: Delete (key or menu) moves anything but the trash into it, folders
  with their contents. Things in the trash can't be opened, only restored
  to where they came from (or the desk if that folder is gone). It can't be
  emptied on purpose, so nothing is lost: "Empty Trash" asks the usual
  Windows 98 confirmation, and Yes only gets a dialog saying "don't throw
  Elio's stuff away :(" (`dialog98()` in app.js). The
  trash only lives on the desk. Its icon is SerenityOS's 32x32
  `recycle-bin.png`, added to the end of `assets/icons.png`.
- All of it is saved per visitor in localStorage (`fs`, `icons`); Reset
  Desktop clears it. Folder windows come from `#folder-tpl` and have a size
  grip. Icons stay put when one leaves the desk; Arrange Icons tidies up.
- Right-click menus (Windows 98 style, `.ctx98`) on the desktop (arrange,
  refresh, paste, new folder, lights, restore wallpaper, reset desktop),
  items (open, cut, paste into folders, rename, delete, move to desktop, set
  as wallpaper for photos, copy link; restore in the trash), folder
  backgrounds (paste, new folder; restore all in the trash) and title bars (restore, maximize, close, close all).
  Everything else keeps the browser's own menu. Shift+F10 / the menu key and
  Alt+Space open them from the keyboard, a long press on phones.
  Double-clicking a title bar maximizes.

## Copy voice

Short, lowercase, friendly and a bit weird, like a 90s homepage. No selling,
no marketing claims, no invented facts about Elio. Keep screen reader labels
plain and descriptive.

The lowercase voice is for the text inside windows. Labels follow Windows 98:
Title Case for the menu bar, right-click menus, program and system icons and
window titles (Clients, Imprint, Talks, Winamp, Photos, Trash, Media Player).
File names keep their own case (portrait.jpg), and brand
names keep theirs (Ura Design, LinkedIn, GitHub).

## Facts about Elio (only use these)

- Founder of Ura Design, a design studio in Berlin for open source, privacy and
  security software (https://ura.design). Previously Canonical (Ubuntu),
  Mozilla, Tor Project.
- Email: elio@ura.design. Never publish his phone number.
- Imprint address: c/o Cultivation Space, Gottschedstr. 4, 13357 Berlin.
- Talk: "Identifying and Addressing Usability Vulnerabilities", FOSS Backstage
  2026, Berlin (YouTube video vctZaoDzq2k).
- Talk: "The UI Layer of Security: What could go wrong?", FOSDEM 2026,
  Brussels, with Anja Xhakani. Recording streamed from video.fosdem.org
  (AV1 webm with an mp4 fallback, CC BY 2.0 BE); the Media Player plays these
  files in a `<video>` and YouTube talks in the iframe, with the same buttons.

## Open items

- [ ] Try dithering in the browser: an SVG filter (`feImage` with a 4x4 Bayer
  tile plus `feComponentTransfer` `type="discrete"`) applied with
  `filter: url(#dither)`. Useful for photos in `photos/` and maybe the YouTube
  video, which can't be pre-dithered. Compare against the pre-dithered
  wallpaper and portrait before using it anywhere.
- Client links in the clients menu point to homepages and are unverified.
- Music is Nine Inch Nails, Ghosts I–IV (CC BY-NC-SA 3.0, non-commercial):
  all 36 tracks of the official 2008 release, streamed with a plain `<audio>`
  element from the Internet Archive item `nine-inch-nails-ghosts-i-iv-2008-web`
  (track list and lengths are in app.js). SoundCloud only has 8 of the tracks.
  That item labels itself CC BY 4.0, but the album is CC BY-NC-SA; credit it as
  that. Winamp keeps a second `<audio>` that loads the next track (shuffle picks
  it ahead of time) once the current one can play through, and swaps to it. If archive.org is down, Winamp shows "can't tune in here". Consider
  self-hosting if that happens often, and keep the non-commercial clause in mind.
- The YouTube embed needs a host that allows third-party iframes.

## Licenses and credits

The imprint window (`content/imprint.md`) lists only the credits the licenses
require, plainly, no jokes: copyright holder, license link and, for the
wallpapers, that they were changed. The README keeps the full table. Keep both
and `LICENSES/` in sync:
98.css (MIT), SerenityOS icons and pixel clock (BSD 2-Clause), MS Sans Serif
and MS Sans Serif Bold by lou (CC BY-SA 3.0, notice also in styles.css), Ghosts I–IV music
(streamed from the Internet Archive) and wallpaper artwork by Rob Sheridan (CC BY-NC-SA 3.0), portrait photo by Jérémie Pontin
(https://www.jeremiepontin.com/, not covered by the MIT license), FOSDEM
2026 talk recording by FOSDEM (CC BY 2.0 BE, streamed from video.fosdem.org). The site's
own code is MIT (`LICENSE`). The Winamp logo is a trademark of its owner. If the font
files are redistributed, ship `LICENSES/MS-Sans-Serif-*` with them.
