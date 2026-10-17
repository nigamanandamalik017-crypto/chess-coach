import { Chess } from '../vendor/chess.js';
import { on, emit } from './bus.js';
import { judge, LABEL } from './judge.js';
// Coach brain. The ENGINE finds the facts; this file turns them into plain-English dialogue.
// No DOM here: it emits 'coach:say' {kind,text} (any UI can show it) and 'coach:review' (for history later).
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const say = (kind, text) => emit('coach:say', { kind, text });
const toWhite = (r, fen) => { const k = fen.split(' ')[1] === 'w' ? 1 : -1; return { cp: r.cp == null ? null : r.cp * k, mate: r.mate == null ? null : r.mate * k }; };
const play = (fen, uci) => new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
const sc = r => r.mate != null ? Math.sign(r.mate) * (10000 - Math.abs(r.mate) * 10) : r.cp;
const idea = mv => /[kq]/.test(mv.flags.replace(/[nbecp]/g, '')) ? 'Castling tucks your king away and brings a rook into play.'
  : mv.san.endsWith('#') ? 'It is checkmate.' : mv.san.includes('+') ? 'It gives check.'
  : mv.captured ? `It captures a ${NAME[mv.captured]}.` : 'It improves your position more.';

// Opponent to move in `fen`: their best capture that wins material (checks if you can recapture).
export function threat(fen) {
  let top = null;
  for (const mv of new Chess(fen).moves({ verbose: true })) {
    if (!mv.captured) continue;
    const t = new Chess(fen); t.move(mv.san);
    const recap = t.moves({ verbose: true }).some(r => r.to === mv.to && r.captured);
    const gain = VAL[mv.captured] - (recap ? VAL[mv.piece] : 0);
    if (gain > 0 && (!top || gain > top.gain)) top = { gain, mv, recap };
  }
  return top;
}

function review(m, a, b) {
  const before = sc(a), after = -sc(b), mateMissed = a.mate > 0 && !(b.mate < 0);
  const best = play(m.before, a.best), isBest = m.from + m.to + (m.promotion || '') === a.best, th = threat(m.after);
  const { cls, loss } = judge({ before, after, isBest, mateMissed, sacrifice: !m.captured && !!th && th.gain >= 3 });
  emit('coach:review', { tag: cls, loss, played: m.san, best: best.san, fen: m.before });
  if (cls === 'brilliant') return say(cls, `${m.san}!! A sound sacrifice. The engine agrees it works.`);
  if (cls === 'great' || cls === 'good') return say(cls, isBest ? `${m.san}: the engine's top choice.` : `${m.san} is a good move.`);
  emit('board:marks', { squares: [best.from, best.to] });
  const why = b.mate > 0 ? `It allows checkmate in ${b.mate}.`
    : a.mate > 0 ? `You had a forced checkmate in ${a.mate}.`
    : th ? `Their ${NAME[th.mv.piece]} can capture your ${NAME[th.mv.captured]} on ${th.mv.to}${th.recap ? ', and the trade favours them' : ", and you can't recapture"}.`
    : best.captured ? `You missed a chance to capture a ${NAME[best.captured]}.`
    : cls === 'miss' ? 'You were winning, but this lets your opponent back into the game.'
    : 'It gives your opponent the better position.';
  say(cls, `${LABEL[cls]}. ${m.san}: ${why} Better was ${best.san}. ${idea(best)}`);
}

export function startCoach(game, engine, { movetime = 250 } = {}) {
  let pre = null, hintStep = 0;
  const analyseHere = fen => { const p = engine.analyse(fen, movetime); pre = { fen, p }; hintStep = 0; p.then(r => emit('eval:update', toWhite(r, fen))); };
  on('game:reset', s => {
    if (!game.coachOn) return;
    say('reset', s.resumed ? 'Welcome back! Your last game is restored.' : 'New game. Control the centre, develop your knights and bishops, and castle early.');
    if (s.turn === s.human) analyseHere(s.fen);
  });
  on('game:undo', s => { if (!game.coachOn) return; say('reset', 'Move taken back. Try a different idea.'); analyseHere(s.fen); });
  on('game:move', async s => {
    if (!game.coachOn) return;
    const m = s.move, mine = m.color === s.human;
    if (s.over) return say(mine ? 'good' : 'bad', s.result === '1/2-1/2' ? 'Drawn game.'
      : mine ? 'Checkmate! Well played.' : 'Checkmate. Every loss teaches something; start another game.');
    if (!mine) return analyseHere(s.fen);
    if (!pre || pre.fen !== m.before) return;
    const a = await pre.p, b = await engine.analyse(m.after, movetime);
    emit('eval:update', toWhite(b, m.after));
    review(m, a, b);
  });
  return {
    async hint() {
      if (!game.coachOn || !pre || !game.isHumanTurn()) return;
      const mv = play(pre.fen, (await pre.p).best); hintStep++; emit('board:marks', { squares: hintStep === 1 ? [mv.from] : [mv.from, mv.to] });
      say('hint', hintStep === 1 ? `Look at your ${NAME[mv.piece]}.` : `Try ${mv.san}. ${idea(mv)}`);
    },
  };
}
