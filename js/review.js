import { Chess } from '../vendor/chess.js';
import { threat } from './coach.js';
import { judge, win, num } from './judge.js';
import { CONFIG } from './config.js';
// Game review logic (no DOM): analyse every position, label every move, compute accuracy, build PGN.
// Labels are computed from stored evals, so you can retune thresholds without re-analysing.
export { MARK, LABEL, ORDER } from './judge.js';
export const ANALYSIS_V = 2; // bump when analysis settings change: older saved analyses get redone
// Game accuracy = average of the plain mean and the harmonic mean of move accuracies, so a few blunders really hurt.
const blend = x => x.length ? Math.round((x.reduce((s, v) => s + v, 0) / x.length + x.length / x.reduce((s, v) => s + 1 / v, 0)) / 2) : 0;

export function replay(san) {
  const c = new Chess(), fens = [c.fen()], mv = [];
  for (const s of san) { mv.push(c.move(s)); fens.push(c.fen()); }
  return { fens, mv };
}
// a[i] = {cp, mate, best} for the position BEFORE ply i (White's point of view); a[n] = final position.
export async function analyseGame(engine, san, onProgress) {
  const { fens } = replay(san), out = [];
  for (let i = 0; i < fens.length; i++) {
    const c = new Chess(fens[i]);
    if (c.isGameOver()) out.push({ cp: c.isCheckmate() ? (c.turn() === 'w' ? -10000 : 10000) : 0, mate: null, best: null });
    else {
      const r = await engine.analyse(fens[i], CONFIG.analysisMs), k = c.turn() === 'w' ? 1 : -1;
      out.push({ cp: r.cp == null ? null : r.cp * k, mate: r.mate == null ? null : r.mate * k, best: r.best });
    }
    onProgress?.(i + 1, fens.length);
  }
  return out;
}
export function classify(san, a) {
  const { fens, mv } = replay(san), e = a.map(num), acc = { w: [], b: [] }, counts = { w: {}, b: {} };
  const moves = mv.map((m, i) => {
    const k = m.color === 'w' ? 1 : -1, before = e[i] * k, after = e[i + 1] * k, bu = a[i].best;
    const isBest = bu === m.from + m.to + (m.promotion || '');
    const mateMissed = a[i].mate != null && a[i].mate * k > 0 && !(a[i + 1].mate != null && a[i + 1].mate * k > 0);
    const th = m.captured ? null : threat(fens[i + 1]);
    const gainedFromOpp = i > 0 ? win(before) - win(e[i - 1] * k) : 0;
    const { cls, loss } = judge({ before, after, isBest, mateMissed, sacrifice: !!th && th.gain >= 3, gainedFromOpp });
    acc[m.color].push(Math.max(1, Math.min(100, 103.1668 * Math.exp(-0.06 * loss) - 3.1669))); // a bit stricter than Lichess's 0.04354
    counts[m.color][cls] = (counts[m.color][cls] || 0) + 1;
    const best = bu ? new Chess(fens[i]).move({ from: bu.slice(0, 2), to: bu.slice(2, 4), promotion: bu[4] }).san : null;
    return { san: m.san, color: m.color, cls, loss, best, bestUci: bu };
  });
  return { moves, counts, acc: { w: blend(acc.w), b: blend(acc.b) } };
}
export function toPgn(g, a) {
  const d = new Date(g.date).toISOString().slice(0, 10).replace(/-/g, '.'), bot = `Engine (${g.level || 'Stockfish'})`;
  const hd = [['Event', 'Chess Coach game'], ['Site', 'Chess Coach app'], ['Date', d], ['White', g.human === 'w' ? 'You' : bot],
    ['Black', g.human === 'b' ? 'You' : bot], ['Result', g.result]].map(([k, v]) => `[${k} "${v}"]`).join('\n');
  let t = '';
  g.san.forEach((s, i) => {
    const n = Math.floor(i / 2) + 1;
    if (i % 2 === 0) t += `${n}. `; else if (a) t += `${n}... `;
    t += `${s} `;
    if (a) { const r = a[i + 1]; t += `{[%eval ${r.mate != null ? '#' + r.mate : (r.cp / 100).toFixed(2)}]} `; }
  });
  return `${hd}\n\n${t}${g.result}\n`;
}
