import { Chess } from '../vendor/chess.js';
// Runtime puzzle generator. Positions are random, but every answer is computed and checked with chess.js,
// so drills are always correct. Kinds: mate1 {pieces:"QR"}, hanging {captor:"N"}, fork.
const FILES = 'abcdefgh', VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => a.sort(() => Math.random() - 0.5);
const sq = (f, r) => FILES[f] + (r + 1);
const cheb = (a, b) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(a[1] - b[1]));
const norm = s => s.replace(/[+#]/g, '');
const find = (map, p) => Object.keys(map).find(s => map[s] === p);
const mv = m => ({ from: m.from, to: m.to, promotion: m.promotion });

// list = [[piece, (file, rank, square, map) => boolean]]; uppercase = White. Returns {square: piece} or null.
function place(list) {
  const map = {};
  for (const [p, ok = () => true] of list) {
    let s = null;
    for (let t = 0; t < 40 && !s; t++) { const f = rnd(8), r = rnd(8), n = sq(f, r); if (!map[n] && ok(f, r, n, map)) s = n; }
    if (!s) return null;
    map[s] = p;
  }
  return map;
}
function fenOf(map, turn = 'w') {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = '', gap = 0;
    for (let f = 0; f < 8; f++) { const p = map[sq(f, r)]; if (p) { row += (gap || '') + p; gap = 0; } else gap++; }
    rows.push(row + (gap || ''));
  }
  return `${rows.join('/')} ${turn} - - 0 1`;
}
// White to move; null if the kings touch or either king is in check.
function start(map) {
  if (cheb(find(map, 'K'), find(map, 'k')) < 2) return null;
  try { const c = new Chess(fenOf(map)); return c.inCheck() || new Chess(fenOf(map, 'b')).inCheck() ? null : c; } catch { return null; }
}
const tryMove = (c, m, fn) => { c.move(mv(m)); const r = fn(); c.undo(); return r; };
const pawnZone = (lo, hi) => (f, r) => r >= lo && r <= hi;

function mate1({ pieces = 'Q' }) {
  for (let t = 0; t < 4000; t++) {
    const map = place([['k', (f, r) => t % 5 === 0 || f % 7 === 0 || r % 7 === 0],
      ['K', (f, r, n, m) => { const d = cheb(n, find(m, 'k')); return d >= 2 && (t % 3 === 0 || d === 2); }], ...[...pieces].map(p => [p])]);
    const c = map && start(map); if (!c) continue;
    const mates = c.moves({ verbose: true }).filter(m => tryMove(c, m, () => c.isCheckmate()));
    if (mates.length && mates.length <= 2) return { fen: c.fen(), answers: mates.map(m => norm(m.san)), hintMarks: [mates[0].from, mates[0].to],
      hint: 'Look for a check where the king has no escape squares. Your own king can cover squares too.', right: 'Checkmate!' };
  }
  return null;
}
function hanging({ captor }) {
  const pool = ['N', 'B', 'R', 'Q'], cap = captor && captor.toLowerCase();
  for (let t = 0; t < 4000; t++) {
    const mine = [captor || pool[rnd(4)], pool[rnd(4)]];
    const theirs = shuffle(['n', 'b', 'r', 'q', 'p', 'p']).slice(0, 3 + rnd(2));
    const map = place([['K'], ['k'], ...mine.map(p => [p]), ...(rnd(2) ? [['P', pawnZone(1, 4)]] : []), ...theirs.map(p => [p, p === 'p' ? pawnZone(2, 6) : undefined])]);
    const c = map && start(map); if (!c) continue;
    const caps = c.moves({ verbose: true }).filter(m => m.captured).map(m => ({
      m, gain: VAL[m.captured] - (tryMove(c, m, () => c.moves({ verbose: true }).some(r => r.to === m.to && r.captured)) ? VAL[m.piece] : 0) }));
    const best = Math.max(0, ...caps.map(x => x.gain)), top = caps.filter(x => x.gain === best);
    if (best >= 3 && top.length <= 2 && (!cap || top.every(x => x.m.piece === cap))) return { fen: c.fen(), answers: top.map(x => norm(x.m.san)),
      hintMarks: [top[0].m.from, top[0].m.to], hint: 'Count attackers and defenders. Which black piece can you take without losing more than you win?', right: 'Material won!' };
  }
  return null;
}
function fork() {
  for (let t = 0; t < 4000; t++) {
    const theirs = shuffle(['r', 'q', 'r', 'b', 'p']).slice(0, 2 + rnd(2));
    const map = place([['k'], ['K'], ['N'], ...theirs.map(p => [p, p === 'p' ? pawnZone(2, 6) : undefined])]);
    const c = map && start(map); if (!c) continue;
    const good = c.moves({ verbose: true }).filter(m => m.piece === 'n' && !m.captured && tryMove(c, m, () => {
      const f0 = FILES.indexOf(m.to[0]), r0 = +m.to[1] - 1;
      const hits = KN.map(([df, dr]) => f0 + df >= 0 && f0 + df < 8 && r0 + dr >= 0 && r0 + dr < 8 ? c.get(sq(f0 + df, r0 + dr)) : null)
        .filter(x => x && x.color === 'b' && VAL[x.type] >= 5);
      return hits.length >= 2 && !c.moves({ verbose: true }).some(r => r.to === m.to);
    }));
    if (good.length && good.length <= 2) return { fen: c.fen(), answers: good.map(m => norm(m.san)), hintMarks: [good[0].from, good[0].to],
      hint: 'Find a square where the knight attacks two valuable pieces at once and nothing can capture the knight.', right: 'Fork! They can only save one piece.' };
  }
  return null;
}
export const makePuzzle = (kind, opts = {}) => ({ mate1, hanging, fork })[kind]?.(opts) ?? null;
