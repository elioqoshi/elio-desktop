# photos

Put `.jpg`, `.png`, `.gif` or `.webp` files in `originals/`, then run

```
.venv/bin/python tools/dither.py   # dithers new or changed originals
python3 build.py
```

`dither.py` writes a dithered `<name>.png` for the viewer and
`thumbs/<name>.png` for the folder, both at the exact pixel size they are
shown at. Commit those along with the original. If you forget, the Pages
deploy dithers them anyway, but your local preview won't show them.

Photos are sorted by file name and the original's file name is the label.
