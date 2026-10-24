"""Create optimized mini-program assets from the supplied artwork; keep originals intact."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'miniprogram/images/artwork'
NAMES = ['ritual', 'dance', 'fire', 'masks', 'portrait', 'mascot', 'costume',
         'figure', 'lantern', 'fan-lamp', 'stamp-kit', 'jewelry', 'brush',
         'pendant', 'red-panel', 'performer']

OUTPUT.mkdir(parents=True, exist_ok=True)
for number, name in enumerate(NAMES, 1):
    source = Image.open(ROOT / '小程序图片' / f'图片{number}.png').convert('RGBA')
    source.thumbnail((1000, 1100), Image.Resampling.LANCZOS)
    # Preserve transparent backgrounds for silhouettes and decorative graphics.
    if name in ('mascot', 'brush', 'red-panel', 'performer'):
        source.thumbnail((720, 820), Image.Resampling.LANCZOS)
        source.quantize(colors=128, method=Image.Quantize.FASTOCTREE).save(OUTPUT / f'{name}.png', optimize=True)
    else:
        canvas = Image.new('RGB', source.size, '#f5efe5')
        canvas.paste(source, mask=source.getchannel('A'))
        canvas.save(OUTPUT / f'{name}.jpg', quality=80, optimize=True)
print('Prepared 16 artwork assets.')
ritual = Image.open(OUTPUT / 'ritual.jpg').convert('RGB')
cover = ImageOps.fit(ritual, (960, 686), method=Image.Resampling.LANCZOS, centering=(0.5, 0.0))
cover.save(OUTPUT / 'ritual-cover.jpg', quality=82, optimize=True)
