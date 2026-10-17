"""Run once: python3 tools/fetch_pieces.py
Downloads the open-licensed 'cburnett' piece set (by Colin M.L. Burnett, GPLv2+) into vendor/pieces/."""
import pathlib, urllib.request
OUT = pathlib.Path(__file__).resolve().parent.parent / 'vendor' / 'pieces'; OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/'
ok = 0
for c in 'wb':
    for t in 'KQRBNP':
        try:
            (OUT / f'{c}{t}.svg').write_bytes(urllib.request.urlopen(f'{BASE}{c}{t}.svg', timeout=60).read()); ok += 1
        except Exception as e:
            print('failed', c + t, e)
print(f'{ok}/12 pieces saved. Any that failed fall back to plain text pieces.')
