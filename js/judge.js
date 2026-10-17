// Shared move-judging rules for the live coach AND the game review, so they always agree.
// Everything is measured as the drop in the mover's win chance (win% points), the same number accuracy uses.
export const ORDER = ['brilliant', 'great', 'good', 'inaccuracy', 'mistake', 'miss', 'blunder']; // best -> worst
export const LABEL = { brilliant: 'Brilliant', great: 'Great move', good: 'Good', inaccuracy: 'Inaccuracy', mistake: 'Mistake', miss: 'Miss', blunder: 'Blunder' };
export const MARK = { brilliant: '!!', great: '!', good: '', inaccuracy: '?!', mistake: '?', miss: '✗', blunder: '??' };
export const num = r => r.mate != null ? Math.sign(r.mate) * (10000 - Math.abs(r.mate) * 10) : r.cp;
export const win = cp => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-1000, Math.min(1000, cp)))) - 1);
// before/after = mover's eval in centipawns. gainedFromOpp = win% the opponent's last move handed over.
export function judge({ before, after, isBest = false, mateMissed = false, sacrifice = false, gainedFromOpp = 0 }) {
  const wb = win(before), wa = win(after), loss = Math.max(0, wb - wa);
  let cls;
  if (loss < 6) cls = sacrifice && loss < 3 && wa >= 45 && wb < 90 ? 'brilliant' : isBest && gainedFromOpp >= 15 ? 'great' : 'good';
  else if (loss < 12) cls = 'inaccuracy';
  else if ((mateMissed && wa > 35) || (wb >= 72 && loss < 25)) cls = 'miss'; // had a win or a mate and let it slip
  else cls = loss < 20 ? 'mistake' : 'blunder';
  return { cls, loss };
}
