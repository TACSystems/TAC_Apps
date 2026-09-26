import io
import os
import struct
import cairosvg
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

APPS = [
    ("apps/tac-log", "apps/tac-log/electron/brand/tl-icon-windows.svg", "apps/tac-log/electron/brand/tl-icon-mac.svg"),
    ("apps/tac-qual", "apps/tac-qual/electron/brand/tq-icon-windows.svg", "apps/tac-qual/electron/brand/tq-icon-mac.svg"),
]


def write_ico(path, frames):
    blobs = []
    for im in frames:
        buf = io.BytesIO()
        im.save(buf, format="PNG")
        blobs.append(buf.getvalue())
    offset = 6 + 16 * len(blobs)
    out = [struct.pack("<HHH", 0, 1, len(blobs))]
    for im, blob in zip(frames, blobs):
        w = 0 if im.width >= 256 else im.width
        h = 0 if im.height >= 256 else im.height
        out.append(struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(blob), offset))
        offset += len(blob)
    with open(path, "wb") as fh:
        fh.write(b"".join(out) + b"".join(blobs))


def render(svg, size):
    tmp = f"/tmp/_icon_{size}.png"
    cairosvg.svg2png(url=os.path.join(ROOT, svg), write_to=tmp, output_width=size, output_height=size)
    return Image.open(tmp).convert("RGBA")


for app, win_svg, mac_svg in APPS:
    icons = os.path.join(ROOT, app, "electron", "icons")
    os.makedirs(icons, exist_ok=True)

    # Written by hand: PIL's ICO writer downsamples from the base frame, so
    # passing a 16px base collapsed every size to 16. Each size here is
    # rendered from the SVG at its own resolution.
    write_ico(os.path.join(icons, "icon.ico"), [render(win_svg, s) for s in ICO_SIZES])

    render(mac_svg, 1024).save(os.path.join(icons, "icon.png"))
    render(mac_svg, 512).save(os.path.join(ROOT, app, "electron", "icon.png"))
    print(app, "icon.ico + icon.png written")

    icns = os.path.join(icons, "icon.icns")
    if os.path.exists(icns):
        os.remove(icns)
        print(app, "removed stale icon.icns; electron-builder generates from the 1024 png")
