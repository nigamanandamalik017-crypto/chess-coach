import { on, emit } from './bus.js';
import { makePuzzle } from './drills.js';
// Lesson engine (no DOM). Step types: "say" (explain), "move" (puzzle with hint), "play" (play the engine to win).
// It drives the board with game.load() and talks through the coach chat. Lessons live in courses/courses.json.
const KEY = 'chess-lessons-done';
const loadDone = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } };
const saveDone = s => { try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch {} };
const norm = san => san.replace(/[+#]/g, '');

export function startCourses(game, courses) {
  const done = loadDone(), all = courses.flatMap(c => c.lessons);
  let lesson = null, i = 0, step = null, tries = 0, gen = null;
  const say = (text, kind = 'lesson') => emit('coach:say', { kind, text });
  const buttons = b => emit('lesson:buttons', { buttons: b });
  const leave = () => { lesson = null; gen = null; game.coachOn = true; game.autoReply = true; buttons([]); };

  function run() {
    let s = lesson.steps[i];
    if (s?.type === 'gen') { // a set of freshly generated drills
      gen = gen || { left: s.count, n: 0 };
      if (gen.left <= 0) { gen = null; i++; return run(); }
      const p = makePuzzle(s.kind, s);
      if (!p) { gen = null; say('Could not build a puzzle this time. Press Start lesson to try again.', 'try'); return buttons([{ id: 'exit', label: 'Back to play' }]); }
      gen.left--; gen.n++;
      s = { type: 'move', ...p, text: `${s.text} (${gen.n}/${s.count})` };
    }
    step = s;
    if (!step) {
      done.add(lesson.id); saveDone(done); emit('lesson:progress', { done: [...done] });
      say(`Lesson complete: ${lesson.title}. Nice work!`, 'good');
      return buttons([{ id: 'exit', label: 'Back to play' }]);
    }
    tries = 0; game.autoReply = step.type === 'play';
    if (step.fen) {
      game.load(step.fen, step.fen.split(' ')[1]);
      if (step.type === 'say' && step.marks) emit('board:marks', { squares: step.marks });
    }
    say(step.text);
    buttons(step.type === 'say' ? [{ id: 'next', label: 'Next' }]
      : step.type === 'move' ? [{ id: 'hint', label: 'Hint' }, { id: 'skip', label: 'Skip' }]
      : [{ id: 'retry', label: 'Restart exercise' }, { id: 'skip', label: 'Skip' }]);
  }
  function start(id) {
    game.coachOn = false; lesson = null; gen = null; game.reset('w'); // clears the chat
    lesson = all.find(l => l.id === id); i = 0; if (lesson) run();
  }

  on('lesson:start', e => start(e.id));
  on('lesson:action', ({ id }) => {
    if (!lesson) return;
    if (id === 'next' || id === 'skip') { if (!gen) i++; run(); }
    else if (id === 'retry') run();
    else if (id === 'hint' && step.type === 'move') {
      say(step.hint || 'Look at the highlighted squares.', 'hint'); emit('board:marks', { squares: step.hintMarks || [] });
    } else if (id === 'exit') { leave(); game.reset('w'); }
  });
  on('game:move', s => {
    if (!lesson || step?.type !== 'move' || s.move.color !== s.human) return;
    if (step.answers.includes(norm(s.move.san))) {
      say(step.right || 'Correct!', 'good'); return buttons([{ id: 'next', label: 'Next' }]);
    }
    tries++;
    say(tries > 1 && step.hint ? `Not quite. ${step.hint}` : 'Not quite. Try again.', 'try');
    setTimeout(() => {
      if (!lesson || step?.type !== 'move') return;
      game.undo(); if (tries > 1 && step.hintMarks) emit('board:marks', { squares: step.hintMarks });
    }, 900);
  });
  on('game:over', s => {
    if (!lesson || step?.type !== 'play') return;
    const won = s.result === (s.human === 'w' ? '1-0' : '0-1');
    say(won ? (step.right || 'Checkmate! You did it.') : 'The game ended without a win. Try again from the start.', won ? 'good' : 'try');
    buttons(won ? [{ id: 'next', label: 'Next' }] : [{ id: 'retry', label: 'Restart exercise' }]);
  });
  on('game:reset', s => { if (lesson && !s.keepChat) leave(); }); // New game button ends the lesson
  emit('lesson:progress', { done: [...done] });
}
