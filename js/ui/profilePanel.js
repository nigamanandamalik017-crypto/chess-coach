import { store } from '../history.js';
import { analyseGame, ANALYSIS_V } from '../review.js';
import { computeStats, isAnalysed } from '../stats.js';
// SWAPPABLE UI: profile (name tag + stats) in a <dialog>. All numbers come from js/stats.js.
const NAME = 'chess-name';
const h = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
export function createProfilePanel(dlg, engine, courses) {
  const root = h('div', 'pf'); dlg.append(root);
  let busy = false, note = h('p', 'pf-note');
  const done = () => { try { return new Set(JSON.parse(read('chess-lessons-done') || '[]')); } catch { return new Set(); } };
  const card = (value, label, sub) => { const c = h('div', 'pf-card'); c.append(h('b', '', value), h('span', '', label)); if (sub) c.append(h('small', '', sub)); return c; };
  const grid = items => { const g = h('div', 'pf-grid'); g.append(...items); return g; };

  async function analyseAll() {
    busy = true; const todo = store.all().filter(g => !isAnalysed(g));
    for (let i = 0; i < todo.length; i++) {
      const a = await analyseGame(engine, todo[i].san, (k, n) => { note.textContent = `Analysing game ${i + 1} of ${todo.length}: ${Math.round(100 * k / n)}%`; });
      store.update(todo[i].id, { a, v: ANALYSIS_V });
    }
    busy = false; render();
  }
  function render() {
    const games = store.all(), s = computeStats(games, courses, done()), name = read(NAME) || '', none = s.analysed === 0;
    root.replaceChildren();
    const head = h('div', 'pf-head'), close = h('button', '', 'Close'), save = h('button', '', 'Save'), input = h('input');
    close.onclick = () => dlg.close();
    const av = h('div', 'pf-avatar', (name.trim()[0] || '♞').toUpperCase());
    av.style.background = `hsl(${[...name].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360} 45% 38%)`;
    input.placeholder = 'Your name'; input.maxLength = 24; input.value = name; input.setAttribute('aria-label', 'Your name');
    save.onclick = () => { try { localStorage.setItem(NAME, input.value.trim()); } catch { /* ignore */ } render(); };
    head.append(av, input, save, close);
    root.append(head, h('p', 'pf-hi', name ? `Hi, ${name}!` : 'Welcome! Type a name above and press Save.'));
    root.append(h('h3', '', 'Record'), grid([
      card(String(s.played), 'Games played', `${s.finished} finished`), card(String(s.wins), 'Wins', `${s.winPct}%`),
      card(String(s.losses), 'Losses', `${s.lossPct}%`), card(String(s.draws), 'Draws', `${s.drawPct}%`)]));
    root.append(h('h3', '', 'Play quality'), grid([
      card(none ? '–' : `${s.avgAccuracy}%`, 'Average accuracy', none ? '' : `best ${s.bestAccuracy}%`),
      card(none ? '–' : String(s.blundersPerGame), 'Blunders per match', ''),
      card(`${s.analysed}/${s.played}`, 'Games analysed', 'quality stats use these')]));
    root.append(h('h3', '', 'Learning'), grid([
      card(`${s.lessonsDone}/${s.lessonsTotal}`, 'Lessons completed', ''), card(`${s.coursesDone}/${s.coursesTotal}`, 'Courses completed', '')]));
    root.append(h('h3', '', 'Streaks'), grid([
      card(String(s.winStreak), 'Win streak', `best ${s.bestWinStreak}`), card(String(s.dayStreak), 'Day streak', 'days in a row with a game')]));
    if (s.trend.length > 1) {
      const bars = h('div', 'pf-bars');
      for (const v of s.trend) { const i = h('i'); i.style.height = `${Math.max(4, v)}%`; i.title = `${v}%`; bars.append(i); }
      root.append(h('h3', '', 'Accuracy over your last games'), bars);
    }
    const todo = games.filter(g => !isAnalysed(g)).length;
    if (todo) {
      const b = h('button', '', `Analyse ${todo} game${todo > 1 ? 's' : ''} for stats`); b.disabled = busy; b.onclick = analyseAll;
      note = h('p', 'pf-note', busy ? 'Analysing…' : 'Analysis runs on your device and is saved.'); root.append(b, note);
    }
  }
  return { open() { render(); dlg.showModal(); } };
}
