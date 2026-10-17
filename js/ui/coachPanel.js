import { on } from '../bus.js';
// SWAPPABLE UI for the coach (chat style). Listens to 'coach:say' {kind,text}. Restyle in css/coach.css.
const LABEL = { brilliant: 'Brilliant', great: 'Great move', good: 'Good', inaccuracy: 'Inaccuracy', mistake: 'Mistake', miss: 'Miss', blunder: 'Blunder', hint: 'Hint', lesson: 'Lesson', try: 'Try again', bad: 'Game over' };
export function createCoachPanel(root) {
  root.innerHTML = '<header class="coach-head"><span class="avatar">♞</span><div><b>Coach</b><small>Press Hint any time</small></div></header><div class="coach-log" role="log" aria-live="polite"></div>';
  const log = root.querySelector('.coach-log');
  on('game:reset', s => { if (!s?.keepChat) log.replaceChildren(); });
  on('coach:say', ({ kind, text }) => {
    const m = document.createElement('div'); m.className = `msg ${kind}`;
    if (LABEL[kind]) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = LABEL[kind]; m.append(t); }
    const p = document.createElement('p'); p.textContent = text; m.append(p);
    log.append(m); log.scrollTop = log.scrollHeight;
  });
}
