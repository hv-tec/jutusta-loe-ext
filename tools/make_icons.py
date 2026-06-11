#!/usr/bin/env python3
"""Genereerib laienduse ikoonid (icons/icon{16,48,128}.png).
Käivita projekti juurest:  .venv/bin/python tools/make_icons.py
Vajab Pillow'd."""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

S = 512
BLUE = (31, 111, 235, 255)   # #1f6feb — sama mis laienduse nupp
WHITE = (255, 255, 255, 255)

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Ümar sinine taust
d.rounded_rectangle([0, 0, S, S], radius=110, fill=BLUE)

# Kõlar (cone + box) valge
speaker = [(150, 212), (205, 212), (268, 150), (268, 362), (205, 300), (150, 300)]
d.polygon(speaker, fill=WHITE)

# Heli-lained (2 kaart) kõlari suu juurest
cx, cy = 268, 256
for r in (66, 108):
    d.arc([cx - r, cy - r, cx + r, cy + r], start=-45, end=45, fill=WHITE, width=20)

# Salvesta eri suurustes
img.save(os.path.join(OUT, "icon512.png"))
for sz in (128, 48, 16):
    img.resize((sz, sz), Image.LANCZOS).save(os.path.join(OUT, f"icon{sz}.png"))
print("✅ ikoonid genereeritud:", sorted(os.listdir(OUT)))
