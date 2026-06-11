#!/usr/bin/env python3
"""loe — loeb veebilehe või teksti eesti keeles ette (Jutusta API).

Kasutus:
  loe "https://news.example.com/article"     # lae leht, eralda sisu, tõlgi EN→ET, loe ette
  loe "Some English text here"                # tõlgi ja loe antud tekst
  loe -                                       # loe tekst stdin-ist
  pbpaste | loe -                             # loe lõikelaualt
  loe URL --voice tuuli --speed 1.1           # vali hääl/tempo
  loe URL --save out.wav --no-play            # salvesta WAV, ära mängi
  loe "Tere maailm" --raw --source et         # ära tõlgi, loe nagu on

Võti loetakse keskkonnamuutujast $JUTUSTA_API_KEY.
"""
import argparse
import os
import re
import sys
import json
import tempfile
import subprocess
import wave
import urllib.request
from concurrent.futures import ThreadPoolExecutor

API_BASE = "https://jutusta.ee/api/v1"
API_KEY = os.environ.get("JUTUSTA_API_KEY", "")


def die(msg):
    print(f"\033[31mViga:\033[0m {msg}", file=sys.stderr)
    sys.exit(1)


def api_post(path, payload, binary=False):
    req = urllib.request.Request(
        API_BASE + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "xi-api-key": API_KEY,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) jutusta-loe-cli/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read() if binary else json.loads(r.read())
    except urllib.error.HTTPError as e:
        die(f"{path} → HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:200]}")
    except Exception as e:
        die(f"{path} → {e}")


def get_text(arg):
    if arg == "-":
        return sys.stdin.read().strip()
    if re.match(r"^https?://", arg):
        try:
            import trafilatura
        except ImportError:
            die("trafilatura puudub — paigalda: .venv/bin/pip install trafilatura")
        downloaded = trafilatura.fetch_url(arg)
        if not downloaded:
            die(f"ei saanud lehte laadida: {arg}")
        text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
        if not text:
            die("ei leidnud lehelt sisuteksti")
        return text.strip()
    return arg.strip()


def split_chunks(text, max_len=600):
    parts = re.findall(r"[^.!?]+[.!?]*\s*", re.sub(r"\s+", " ", text)) or [text]
    out, cur = [], ""
    for s in parts:
        if len(cur + s) > max_len and cur:
            out.append(cur.strip())
            cur = s
        else:
            cur += s
        while len(cur) > max_len:
            out.append(cur[:max_len].strip())
            cur = cur[max_len:]
    if cur.strip():
        out.append(cur.strip())
    return out


def generate(chunk, args):
    """Tõlgi (kui vaja) + sünteesi → WAV baidid."""
    if args.raw:
        et = chunk
    else:
        res = api_post("/translate/chunk", {
            "source": args.source, "target": args.target, "new_source": chunk,
        })
        et = (res.get("appended") or "").strip()
        if not et:
            return None
    return api_post(f"/text-to-speech/{args.voice}?output_format=wav", {
        "text": et, "model_id": "jutusta_v1", "voice_settings": {"speed": args.speed},
    }, binary=True)


def play_bytes(wav_bytes):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(wav_bytes)
        path = f.name
    try:
        subprocess.run(["afplay", path], check=False)
    finally:
        os.unlink(path)


def save_combined(all_wavs, out_path):
    """Liida kõik WAV-tükid üheks failiks (sama formaat: 24kHz 16-bit mono)."""
    frames, params = [], None
    for wb in all_wavs:
        if not wb:
            continue
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(wb)
            p = f.name
        with wave.open(p, "rb") as w:
            params = params or w.getparams()
            frames.append(w.readframes(w.getnframes()))
        os.unlink(p)
    if not frames:
        die("pole midagi salvestada")
    with wave.open(out_path, "wb") as w:
        w.setparams(params)
        for fr in frames:
            w.writeframes(fr)
    print(f"💾 salvestatud: {out_path}")


def main():
    ap = argparse.ArgumentParser(description="Loe veebileht/tekst eesti keeles ette (Jutusta API).")
    ap.add_argument("input", help="URL, tekst, või '-' (stdin)")
    ap.add_argument("--voice", default=os.environ.get("JUTUSTA_VOICE", "henri"))
    ap.add_argument("--source", default="en", help="lähtekeel (ISO, nt en/de/ru)")
    ap.add_argument("--target", default="et", help="sihtkeel (vaikimisi et)")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--raw", action="store_true", help="ära tõlgi, loe tekst nagu on")
    ap.add_argument("--save", metavar="FILE", help="salvesta liidetud WAV faili")
    ap.add_argument("--no-play", action="store_true", help="ära mängi (kasuta --save'iga)")
    args = ap.parse_args()

    if not API_KEY:
        die("$JUTUSTA_API_KEY puudub. Käivita: source ~/.bash_profile")

    text = get_text(args.input)
    chunks = split_chunks(text)
    print(f"📖 {len(text)} tähemärki, {len(chunks)} lõiku · hääl: {args.voice}"
          + ("" if args.raw else f" · {args.source}→{args.target}"))

    saved = []
    # Genereeri järgmine lõik eelmise mängimise ajal (voogesitus).
    with ThreadPoolExecutor(max_workers=1) as ex:
        fut = ex.submit(generate, chunks[0], args)
        for i in range(len(chunks)):
            wav = fut.result()
            if i + 1 < len(chunks):
                fut = ex.submit(generate, chunks[i + 1], args)
            print(f"  ▶ {i+1}/{len(chunks)}", end="\r", flush=True)
            if args.save:
                saved.append(wav)
            if not args.no_play and wav:
                play_bytes(wav)
    print()
    if args.save:
        save_combined(saved, args.save)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹ katkestatud")
        sys.exit(130)
