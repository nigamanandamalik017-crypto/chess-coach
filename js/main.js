import { CONFIG } from './config.js';
import { Game } from './game.js';
import { Engine } from './engine.js';
import { on, emit } from './bus.js';
import { createBoard } from './ui/board.js';
import { createCoachPanel } from './ui/coachPanel.js';
import { createEvalBar } from './ui/evalBar.js';
import { startCoach } from './coach.js';
import { createLessonBar } from './ui/lessonBar.js';
import { startCourses } from './courses.js';
import { startHistory, pending } from './history.js';
import { createProfilePanel } from './ui/profilePanel.js';
import { createHistoryPanel } from './ui/historyPanel.js';
// main.js = controller. Add features (history, courses) as new modules that listen to bus events.
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const game = new Game(), engine = new Engine();
let selected = null, thinking = false, marks = [], gen = 0;
const board = createBoard($('board'), { onSquare });
createEvalBar($('evalbar')); createCoachPanel($('coach'));
const coach = startCoach(game, engine);
startHistory(game);
const hist = createHistoryPanel($('history'), engine);
CONFIG.levels.forEach((l, i) => $('level').add(new Option(l.name, i, i === 1, i === 1)));
CONFIG.speeds.forEach((s, i) => $('speed').add(new Option(s.name, i, i === 1, i === 1)));

function render(s = game.snapshot()) {
  board.draw({ fen: s.fen, selected, targets: selected ? game.targets(selected) : [], last: s.last, check: s.checkSq, marks });
  $('undo').disabled = thinking || !game.canUndo();
  $('status').textContent = s.over
    ? (s.result === '1/2-1/2' ? 'Draw.' : `${s.result === '1-0' ? 'White' : 'Black'} wins by checkmate.`)
    : thinking ? 'Opponent is thinking…' : s.turn === s.human ? `Your move${s.inCheck ? ' (check)' : ''}.` : '';
}
on('game:reset', () => { gen++; thinking = false; selected = null; marks = []; render(); if (!game.isHumanTurn()) engineMove(); });
on('game:move', s => { selected = null; marks = []; render(s); });
on('game:undo', s => { selected = null; marks = []; render(s); });
on('board:marks', e => { marks = e.squares; render(); });

function onSquare(sq) {
  if (thinking || !game.isHumanTurn()) return;
  const p = game.pieceAt(sq);
  if (p && p.color === game.human) { selected = sq; return render(); }
  if (selected && game.targets(selected).includes(sq)) {
    game.move({ from: selected, to: sq, promotion: 'q' }); // v1: auto-queen
    return game.autoReply && engineMove();
  }
  selected = null; render();
}
async function engineMove() {
  if (game.chess.isGameOver()) return;
  const g = gen, lv = CONFIG.levels[$('level').value], sp = CONFIG.speeds[$('speed').value];
  game.levelName = lv.name;
  const wait = sp.max ? sp.min + Math.random() * (sp.max - sp.min) + (Math.random() < sp.long ? 2000 + Math.random() * 2500 : 0) : 0;
  thinking = true; render();
  const [uci] = await Promise.all([engine.bestMove(game.chess.fen(), lv), sleep(wait)]);
  if (g !== gen) return; // a new game started meanwhile
  thinking = false;
  game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}
$('new-w').onclick = () => game.reset('w');
$('new-b').onclick = () => game.reset('b');
$('flip').onclick = () => { board.flip(); emit('board:flip'); };
$('hint').onclick = () => game.coachOn ? coach.hint() : emit('lesson:action', { id: 'hint' });
$('undo').onclick = () => { if (!thinking) game.undo(); };
const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const setEval = show => { $('evalbar').hidden = !show; $('evtoggle').textContent = `Eval bar: ${show ? 'On' : 'Off'}`; ls.set('chess-evalbar', show ? '1' : '0'); };
setEval(ls.get('chess-evalbar') !== '0');
$('evtoggle').onclick = () => setEval($('evalbar').hidden);
['classic', 'slate', 'marble'].forEach(t => $('theme').add(new Option(t[0].toUpperCase() + t.slice(1), t)));
const setTheme = t => { document.documentElement.dataset.theme = t; $('theme').value = t; ls.set('chess-theme', t); };
setTheme(ls.get('chess-theme') || 'classic');
$('theme').onchange = e => setTheme(e.target.value);
$('history-btn').onclick = () => hist.open();
let profile = null;
$('profile-btn').onclick = () => profile?.open();
fetch('courses/courses.json').then(r => r.json()).then(d => { createLessonBar($('lessonbar'), d.courses); startCourses(game, d.courses); profile = createProfilePanel($('profile'), engine, d.courses); }).catch(e => { console.error('Courses failed to load', e); profile = createProfilePanel($('profile'), engine, []); });
engine.ready.then(() => {
  $('status').textContent = 'Ready.';
  if (pending) { // resume the game that was open when the app was closed
    const o = [...$('level').options].find(x => x.text === pending.level); if (o) $('level').value = o.value;
    game.restore(pending.san, pending.human);
  } else game.reset('w');
});
