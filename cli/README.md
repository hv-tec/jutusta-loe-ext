# loe — käsurea-tööriist

Loeb veebilehe või teksti eesti keeles ette terminalist (tõlge + kõnesüntees Jutusta API kaudu, voogesitusega). macOS (kasutab `afplay`).

## Seadistus

```bash
cd cli
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
export JUTUSTA_API_KEY="sk_jt_…"     # või lisa ~/.bash_profile-i
```

## Kasutus

```bash
.venv/bin/python loe.py "https://news.example.com/article"   # lae leht, tõlgi, loe ette
.venv/bin/python loe.py "Some English text"                  # tõlgi ja loe tekst
pbpaste | .venv/bin/python loe.py -                           # loe lõikelaualt
.venv/bin/python loe.py URL --voice tuuli --speed 1.1         # vali hääl/tempo
.venv/bin/python loe.py URL --save out.wav --no-play          # salvesta WAV
.venv/bin/python loe.py "Tere" --raw --source et             # ära tõlgi, loe nagu on
```

Mugavuseks lisa alias:
```bash
alias loe='/path/to/cli/.venv/bin/python /path/to/cli/loe.py'
```

## Võtmed
- `--voice` (vaikimisi `henri`; vt hääli all), `--source` (en), `--target` (et), `--speed` (1.0)
- `--raw` — jäta tõlge vahele, `--save FILE` — salvesta liidetud WAV, `--no-play` — ära mängi
- Peata: `Ctrl+C`

**Hääled:** henri, margus, sander, toomas, indrek, madis, kalev (mehed); tuuli, heli, triin, maarja, linda (naised).
