# Chess Coach, Part 1: board + play offline vs Stockfish

1. `python tools/fetch_vendor.py`  (downloads chess.js, Stockfish, icons)
2. Test locally: `python -m http.server 8000`, open http://localhost:8000, play a move. Reload once, then go offline and reload again: it should still work.
3. Deploy: push this folder to a GitHub repo -> Settings -> Pages -> Deploy from branch (main, root).
   Open the Pages URL on a phone -> Install app / Add to Home Screen.
4. After changing any file, bump `CACHE` in sw.js so phones pick up the update.

## Where to change things
- Look: css/theme.css (variables) | Board UI: js/ui/board.js (or pass your own renderPiece)
- Levels: js/config.js | Engine: js/engine.js | Rules/state: js/game.js
- New features (history, coach, courses): new files that `on('game:over', ...)` from js/bus.js
