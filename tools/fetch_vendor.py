"""Run once on your PC: python tools/fetch_vendor.py
Downloads chess.js + Stockfish.js (lite, single-threaded) into vendor/ and makes placeholder icons."""
import pathlib, struct, urllib.request, zlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
CDN = 'https://cdn.jsdelivr.net/npm/'

def get(url):
    return urllib.request.urlopen(url, timeout=120).read()

def try_get(url):
    try:
        return get(url)
    except Exception:
        print('  not found:', url)

def save(rel, data):
    p = ROOT / rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(data)
    print(f'saved {rel} ({len(data)//1024} KB)')

def png(n, rgb):
    row = b'\0' + bytes(rgb) * n
    ch = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    return (b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', n, n, 8, 2, 0, 0, 0))
            + ch(b'IDAT', zlib.compress(row * n)) + ch(b'IEND', b''))

save('vendor/chess.js', get(CDN + 'chess.js@1/dist/esm/chess.js'))
for dirn in ('src', 'bin', ''):
    pre = CDN + 'stockfish@18/' + (dirn + '/' if dirn else '') + 'stockfish-18-lite-single'
    js, wasm = try_get(pre + '.js'), try_get(pre + '.wasm')
    if js and wasm:
        save('vendor/stockfish/stockfish.js', js); save('vendor/stockfish/stockfish.wasm', wasm); break
else:
    print('\nCould not auto-download Stockfish. Get stockfish-18-lite-single.js/.wasm from\n'
          'https://github.com/nmrugg/Stockfish.js and save them as vendor/stockfish/stockfish.js and stockfish.wasm')
for n in (192, 512): save(f'icons/icon-{n}.png', png(n, (22, 32, 43)))
print('\nDone. Test: python -m http.server 8000  ->  http://localhost:8000')
