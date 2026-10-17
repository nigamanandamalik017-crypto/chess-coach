import { classify, ANALYSIS_V } from './review.js';
// Profile stats from saved games (History) and lesson progress. No DOM, so any UI can show them.
// Accuracy and blunder stats use analysed games only; win/loss/draw use finished games.
const outcome = g => g.result === '*' ? null : g.result === '1/2-1/2' ? 'draw' : (g.result === '1-0') === (g.human === 'w') ? 'win' : 'loss';
const mean = x => x.length ? x.reduce((s, v) => s + v, 0) / x.length : 0;
export const isAnalysed = g => !!g.a && g.v === ANALYSIS_V;
export function computeStats(games, courses, done) { // games: newest first
  const fin = games.filter(outcome), n = fin.length, count = k => fin.filter(g => outcome(g) === k).length;
  const pct = c => n ? Math.round(100 * c / n) : 0;
  const rows = games.filter(isAnalysed).map(g => { const d = classify(g.san, g.a); return { acc: d.acc[g.human], blunders: d.counts[g.human].blunder || 0 }; });
  let cur = 0; for (const g of fin) { if (outcome(g) === 'win') cur++; else break; }
  let best = 0, run = 0; for (const g of [...fin].reverse()) { run = outcome(g) === 'win' ? run + 1 : 0; best = Math.max(best, run); }
  const days = new Set(games.map(g => new Date(g.date).toDateString())), d = new Date(); let streak = 0;
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
  const lessons = courses.flatMap(c => c.lessons);
  return {
    played: games.length, finished: n, unfinished: games.length - n,
    wins: count('win'), losses: count('loss'), draws: count('draw'), winPct: pct(count('win')), lossPct: pct(count('loss')), drawPct: pct(count('draw')),
    analysed: rows.length, avgAccuracy: Math.round(mean(rows.map(r => r.acc))), bestAccuracy: Math.round(Math.max(0, ...rows.map(r => r.acc))),
    blundersPerGame: Math.round(10 * mean(rows.map(r => r.blunders))) / 10, trend: rows.slice(0, 10).reverse().map(r => Math.round(r.acc)),
    winStreak: cur, bestWinStreak: best, dayStreak: streak,
    lessonsDone: lessons.filter(l => done.has(l.id)).length, lessonsTotal: lessons.length,
    coursesDone: courses.filter(c => c.lessons.length && c.lessons.every(l => done.has(l.id))).length, coursesTotal: courses.length,
  };
}
