import { Chess } from '../vendor/chess.js';
import { emit } from './bus.js';
const kingSq = c => c.board().flat().find(p => p && p.type === 'k' && p.color === c.turn())?.square;
// Game state + rules. Emits game:reset, game:move, game:over. No DOM in here.
export class Game {
  constructor() { this.coachOn = true; this.autoReply = true; this.reset('w'); }
  reset(human = 'w') { this.chess = new Chess(); this.human = human; this.startedAt = Date.now(); emit('game:reset', this.snapshot()); }
  snapshot() {
    const c = this.chess, h = c.history({ verbose: true });
    return { fen: c.fen(), turn: c.turn(), human: this.human, history: h, last: h.at(-1) || null,
             over: c.isGameOver(), result: this.result(), inCheck: c.inCheck(), checkSq: c.inCheck() ? kingSq(c) : null, startedAt: this.startedAt };
  }
  result() { const c = this.chess; if (c.isCheckmate()) return c.turn() === 'w' ? '0-1' : '1-0'; return c.isGameOver() ? '1/2-1/2' : '*'; }
  isHumanTurn() { return this.chess.turn() === this.human && !this.chess.isGameOver(); }
  load(fen, human) { this.chess = new Chess(fen); this.human = human; this.startedAt = Date.now(); emit('game:reset', { ...this.snapshot(), keepChat: true }); }
  restore(san, human) {
    const c = new Chess();
    try { for (const s of san) c.move(s); } catch { return this.reset('w'); }
    this.chess = c; this.human = human; this.startedAt = Date.now();
    emit('game:reset', { ...this.snapshot(), keepChat: true, resumed: true });
  }
  canUndo() { return this.chess.history().length >= (this.chess.turn() === this.human ? 2 : 1); }
  undo() {
    if (!this.canUndo()) return;
    const n = this.chess.turn() === this.human ? 2 : 1;
    for (let i = 0; i < n; i++) this.chess.undo();
    emit('game:undo', this.snapshot());
  }
  targets(sq) { return this.chess.moves({ square: sq, verbose: true }).map(m => m.to); }
  pieceAt(sq) { return this.chess.get(sq); }
  move(m) {
    let r; try { r = this.chess.move(m); } catch { return null; }
    emit('game:move', { ...this.snapshot(), move: r });
    if (this.chess.isGameOver()) emit('game:over', { ...this.snapshot(), pgn: this.chess.pgn() });
    return r;
  }
}
