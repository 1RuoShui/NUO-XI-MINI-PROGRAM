from pathlib import Path
from PIL import Image

images = Path('miniprogram/images')
gold = Image.open(images / 'nuo-mask-gold.png').convert('RGB')
gold.thumbnail((640, 880), Image.Resampling.LANCZOS)
gold.save(images / 'nuo-mask-gold.jpg', quality=72, optimize=True, progressive=True)

products = images / 'products'
for source in products.glob('*.png'):
    image = Image.open(source).convert('RGB')
    image.thumbnail((640, 420), Image.Resampling.LANCZOS)
    image.save(source.with_suffix('.jpg'), quality=72, optimize=True, progressive=True)

print('optimized background and product assets')
