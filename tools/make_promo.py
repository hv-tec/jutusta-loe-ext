#!/usr/bin/env python3
"""Genereerib Chrome Web Store promo-pildid (store-assets/).
  .venv/bin/python tools/make_promo.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "store-assets")
ICONS = os.path.join(HERE, "..", "icons")
os.makedirs(OUT, exist_ok=True)

BLUE = (31, 111, 235)
DARK = (17, 24, 39)
GRAY = (107, 114, 128)
LIGHT = (243, 244, 246)
HILITE = (208, 226, 255)
WHITE = (255, 255, 255)


def font(size, bold=False):
    paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def rounded(d, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)


def hero():
    W, H = 1280, 800
    img = Image.new("RGB", (W, H), LIGHT)
    d = ImageDraw.Draw(img)

    # Päis: ikoon + nimi
    icon = Image.open(os.path.join(ICONS, "icon512.png")).convert("RGBA").resize((84, 84), Image.LANCZOS)
    img.paste(icon, (80, 70), icon)
    d.text((184, 84), "Jutusta", font=font(40, True), fill=DARK)
    d.text((184, 132), "Loe eesti keeles", font=font(26), fill=GRAY)

    # Pealkiri
    d.text((80, 210), "Loe ingliskeelne veeb", font=font(64, True), fill=DARK)
    d.text((80, 288), "eesti keeles ette.", font=font(64, True), fill=BLUE)
    d.text((80, 384), "Vali tekst lehel ja kuula eestikeelset kõnet.", font=font(30), fill=GRAY)
    d.text((80, 428), "Tõlge + kõnesüntees Jutusta API kaudu.", font=font(30), fill=GRAY)

    # Mock-kaart: valitud tekst + nupp
    card = (80, 510, 760, 720)
    rounded(d, card, 18, WHITE)
    tx, ty = 112, 540
    d.text((tx, ty), "The European Union agreed on new rules", font=font(24), fill=DARK)
    # esiletõstetud rida
    rounded(d, (tx - 6, ty + 40, tx + 470, ty + 78), 6, HILITE)
    d.text((tx, ty + 46), "for artificial intelligence this week.", font=font(24), fill=DARK)
    # nupp
    btn = (tx, ty + 102, tx + 210, ty + 150)
    rounded(d, btn, 10, BLUE)
    d.polygon([(tx + 22, ty + 116), (tx + 22, ty + 136), (tx + 40, ty + 126)], fill=WHITE)
    d.text((tx + 52, ty + 116), "Loe eesti k.", font=font(22, True), fill=WHITE)

    # Olekuriba paremal all
    pill = (980, 660, 1200, 720)
    rounded(d, pill, 14, DARK)
    d.text((1000, 680), "Loen…  3/5", font=font(20), fill=WHITE)

    img.save(os.path.join(OUT, "screenshot-1280x800.png"))


def tile():
    W, H = 440, 280
    img = Image.new("RGB", (W, H), BLUE)
    d = ImageDraw.Draw(img)
    icon = Image.open(os.path.join(ICONS, "icon512.png")).convert("RGBA").resize((96, 96), Image.LANCZOS)
    img.paste(icon, (40, 44), icon)
    d.text((40, 158), "Loe eesti keeles", font=font(30, True), fill=WHITE)
    d.text((40, 200), "Ingliskeelne tekst → eesti kõne", font=font(19), fill=(220, 232, 255))
    img.save(os.path.join(OUT, "promo-tile-440x280.png"))


hero()
tile()
print("✅ promo:", sorted(os.listdir(OUT)))
