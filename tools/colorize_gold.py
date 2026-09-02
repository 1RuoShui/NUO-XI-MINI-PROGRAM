from pathlib import Path
from PIL import Image
import numpy as np

src = Path('0.png')
out = Path('miniprogram/images/nuo-mask-gold.png')
out.parent.mkdir(parents=True, exist_ok=True)

im = Image.open(src).convert('RGB')
arr = np.asarray(im).astype(np.float32) / 255.0
gray = np.dot(arr[..., :3], [0.299, 0.587, 0.114])

# Warm gold map: dark ink becomes deep antique brass, paper becomes champagne gold.
stops = np.array([0.03, 0.18, 0.42, 0.70, 1.00], dtype=np.float32)
colors = np.array([[42, 25, 5], [92, 54, 9], [154, 99, 20], [211, 163, 67], [250, 226, 152]], dtype=np.float32)
gold = np.empty((*gray.shape, 3), dtype=np.float32)
for c in range(3):
    gold[..., c] = np.interp(gray, stops, colors[:, c])

# Add restrained paper/metal grain without obscuring linework.
rng = np.random.default_rng(7)
noise = rng.normal(0, 1.8, gray.shape)[..., None]
gold = np.clip(gold + noise, 0, 255)

# Gentle edge falloff adds depth while keeping the center readable.
h, w = gray.shape
y, x = np.ogrid[:h, :w]
d = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
vignette = np.clip(1.0 - 0.10 * np.maximum(d - 0.25, 0), 0.84, 1.0)[..., None]
gold *= vignette

Image.fromarray(np.uint8(np.clip(gold, 0, 255)), 'RGB').save(out, optimize=True)
print(out)
