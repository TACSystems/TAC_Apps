# TAC Systems brand assets

Everything here is generated. Do not hand-edit an SVG — change the script and re-run it.

```
python3 core/brand/build-icons.py      # SVG artwork from the font
python3 core/brand/rasterize-icons.py  # icon.ico and icon.png for each app
```

`build-icons.py` reads Chakra Petch Bold from `node_modules/@fontsource` and converts glyphs to outlines, so the icons carry no font dependency at runtime.

## The two-cell grid

App letters do not use their natural advances. Two cells of 27 units centred on x 50 (spanning x 23 to 77), each glyph centred in its own cell. Chakra Petch is proportional: centring the pair would shift the T between apps, and a fixed T origin would leave TL visibly left-heavy. The cell grid keeps the T identical in every app icon and every pair centred — the script prints each glyph's span so this stays checkable.

Cap height 29.5, baseline y 64.75, cap band centred on y 50. Brackets stroke-width 7 on the 100x100 viewBox.

## What is here

| File | What it is |
|---|---|
| `tac-systems-mark.svg`, `-mac` | Company mark: brackets and a centred dot, bone on gunmetal. No letters, no app accent. |
| `tq-blue-icon-windows.svg`, `-mac` | TAC-QUAL BLUE, white on deep blue, subword between the bottom bracket arms. |
| `lockup-*-dark.svg` | Mark plus wordmark on the shell colour. |
| `lockup-*-mono.svg` | Same in `currentColor`, no tile. |
| `blue-tokens.css` | BLUE's palette in the token vocabulary the apps read. Not wired to an app yet. |

Each app's own icons live in its `electron/brand/` and `electron/icons/`, written by these scripts.

## Lockups sit on the shell, not the tile

Gold on scarlet reads 2.59:1 — acceptable for an icon, where shape carries it; too low for a word being read. On the gunmetal shell the same gold reads 7.75:1. Clear space is 30 units for an app, 34 for the company mark, and trails the word as well as separating it from the mark.

## The BLUE subword

Cap height 8.0, tracking 0.5, baseline y 88.0, centred on x 50. The gap between the bottom bracket arms is 36 units, which is what caps the size — the word's ink spans about 29.4 of it. Legible from 128px; below roughly 48px it reads as a mark rather than a word, and colour carries the distinction.
