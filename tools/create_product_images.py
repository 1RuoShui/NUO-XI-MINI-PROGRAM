from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import numpy as np

src = Image.open('miniprogram/images/nuo-mask-gold.png').convert('RGB')
out_dir = Path('miniprogram/images/products')
out_dir.mkdir(parents=True, exist_ok=True)

items = [
    ('zhu-rong', (120, 80, 900, 850), (180, 118, 28), 1.05),
    ('walking-lantern', (0, 0, 700, 720), (120, 52, 20), 1.15),
    ('five-directions-blind-box', (420, 0, 1080, 720), (82, 44, 112), 1.30),
    ('hand-seal-mask', (40, 420, 650, 1260), (32, 76, 92), 1.08),
    ('dance-ai-machine', (390, 430, 1030, 1340), (20, 92, 88), 1.18),
    ('study-service', (210, 80, 870, 1400), (138, 80, 34), 0.96),
    ('handmade-mask', (500, 760, 1080, 1485), (112, 44, 26), 1.12),
]

def gradient(size, color):
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w]
    glow = np.exp(-(((xx - w * .48) / (w * .7)) ** 2 + ((yy - h * .35) / (h * .8)) ** 2))
    base = np.zeros((h, w, 3), dtype=np.float32)
    base[:] = np.array(color, dtype=np.float32) * .72
    base += glow[..., None] * np.array([54, 42, 20], dtype=np.float32)
    return Image.fromarray(np.uint8(np.clip(base, 0, 255)), 'RGB')

for name, box, tone, contrast in items:
    crop = ImageOps.fit(src, (640, 420), method=Image.Resampling.LANCZOS, centering=(.5, .45), bleed=0)
    # Use a different source window per item before fitting to keep every image distinct.
    crop = ImageOps.fit(src.crop(box), (640, 420), method=Image.Resampling.LANCZOS, centering=(.5, .5))
    crop = ImageEnhance.Contrast(crop).enhance(contrast)
    crop = ImageEnhance.Color(crop).enhance(1.18)
    bg = gradient(crop.size, tone)
    # A softly blurred backing creates depth around the etched linework.
    blurred = crop.filter(ImageFilter.GaussianBlur(12))
    base = Image.blend(bg, blurred, .24)
    base = Image.blend(base, crop, .80)
    # Thin warm frame makes the image read as a premium catalog tile.
    base = ImageOps.expand(base, border=8, fill=(218, 171, 68))
    base = ImageOps.expand(base, border=2, fill=(54, 32, 12))
    base.save(out_dir / f'{name}.png', optimize=True)

print(f'generated {len(items)} product images in {out_dir}')
