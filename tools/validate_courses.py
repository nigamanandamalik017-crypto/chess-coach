"""Check your lessons: python3 tools/validate_courses.py   (needs: pip install chess)
Verifies every FEN in courses/courses.json is a legal position and every answer is a legal move."""
import json, pathlib
import chess
bad = 0
data = json.load(open(pathlib.Path(__file__).resolve().parent.parent / 'courses' / 'courses.json'))
for c in data['courses']:
    for l in c['lessons']:
        for n, s in enumerate(l['steps'], 1):
            if 'fen' not in s: continue
            try:
                b = chess.Board(s['fen'])
                if not b.is_valid(): raise ValueError('illegal position')
                legal = {b.san(m).rstrip('+#') for m in b.legal_moves}
                for a in s.get('answers', []):
                    if a not in legal: raise ValueError(f'answer {a} is not a legal move')
            except Exception as e:
                bad += 1; print(f"{l['id']} step {n}: {e}")
print('All lessons OK' if not bad else f'{bad} problem(s) found')
