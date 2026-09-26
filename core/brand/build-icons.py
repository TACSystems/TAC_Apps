import os
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT = os.path.join(ROOT, "node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2")

CAP_UNITS = 700
LETTER_CAP = 29.5
BASELINE = 64.75
CELL_W = 27.0
CELL_CENTRES = (36.5, 63.5)

SUB_CAP = 8.0
SUB_BASELINE = 88.0
SUB_TRACKING = 0.5

BRACKETS = ("M14 34 V16 H32", "M68 16 H86 V34", "M86 66 V84 H68", "M32 84 H14 V66")
STROKE = 7

font = TTFont(FONT)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()


def outline(ch, cap, baseline, x_centre=None, x_origin=None):
    name = cmap[ord(ch)]
    scale = cap / CAP_UNITS
    bounds = BoundsPen(glyphs)
    glyphs[name].draw(bounds)
    x0, _, x1, _ = bounds.bounds
    if x_centre is not None:
        dx = x_centre - (x0 + x1) / 2 * scale
    else:
        dx = x_origin
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(TransformPen(pen, Transform(scale, 0, 0, -scale, dx, baseline)))
    return pen.getCommands(), (x1 - x0) * scale, glyphs[name].width * scale


def letters(pair):
    return " ".join(outline(ch, LETTER_CAP, BASELINE, x_centre=CELL_CENTRES[i])[0] for i, ch in enumerate(pair))


def subword(text):
    widths = [outline(ch, SUB_CAP, SUB_BASELINE, x_origin=0)[2] for ch in text]
    total = sum(widths) + SUB_TRACKING * (len(text) - 1)
    x = 50 - total / 2
    parts = []
    for ch, adv in zip(text, widths):
        parts.append(outline(ch, SUB_CAP, SUB_BASELINE, x_origin=x)[0])
        x += adv + SUB_TRACKING
    return " ".join(parts)


def icon(tile, ink, pair, rounded=False, sub=None):
    shape = (
        f'<rect width="100" height="100" rx="20" ry="20" fill="{tile}"/>'
        if rounded
        else f'<rect width="100" height="100" fill="{tile}"/>'
    )
    brk = "".join(
        f'<path d="{d}" fill="none" stroke="{ink}" stroke-width="{STROKE}"/>' for d in BRACKETS
    )
    body = f'<path d="{letters(pair)}" fill="{ink}"/>'
    if sub:
        body += f'<path d="{subword(sub)}" fill="{ink}"/>'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        + shape
        + brk
        + body
        + "</svg>\n"
    )


def reticle(tile, ink, rounded=False):
    shape = (
        f'<rect width="100" height="100" rx="20" ry="20" fill="{tile}"/>'
        if rounded
        else f'<rect width="100" height="100" fill="{tile}"/>'
    )
    brk = "".join(
        f'<path d="{d}" fill="none" stroke="{ink}" stroke-width="{STROKE}"/>' for d in BRACKETS
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        + shape
        + brk
        + f'<circle cx="50" cy="50" r="6" fill="{ink}"/>'
        + "</svg>\n"
    )


TARGETS = [
    ("apps/tac-log/electron/brand/tl-icon-windows.svg", icon("#262a1c", "#d1a941", "TL")),
    ("apps/tac-log/electron/brand/tl-icon-mac.svg", icon("#262a1c", "#d1a941", "TL", rounded=True)),
    ("apps/tac-qual/electron/brand/tq-icon-windows.svg", icon("#c8102e", "#d4a537", "TQ")),
    ("apps/tac-qual/electron/brand/tq-icon-mac.svg", icon("#c8102e", "#d4a537", "TQ", rounded=True)),
    ("core/brand/tq-blue-icon-windows.svg", icon("#10306e", "#ffffff", "TQ", sub="BLUE")),
    ("core/brand/tq-blue-icon-mac.svg", icon("#10306e", "#ffffff", "TQ", rounded=True, sub="BLUE")),
    ("core/brand/tac-systems-mark.svg", reticle("#17191b", "#e4e6e8")),
    ("core/brand/tac-systems-mark-mac.svg", reticle("#17191b", "#e4e6e8", rounded=True)),
]

if __name__ == "__main__":
    for rel, svg in TARGETS:
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as fh:
            fh.write(svg)
        print("wrote", rel, len(svg), "bytes")

    for ch in "TLQ":
        for i, centre in enumerate(CELL_CENTRES):
            _, w, _ = outline(ch, LETTER_CAP, BASELINE, x_centre=centre)
            print(f"{ch} in cell {i + 1}: ink width {w:.3f}, spans {centre - w / 2:.3f}..{centre + w / 2:.3f}")
