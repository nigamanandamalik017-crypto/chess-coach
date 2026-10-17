import { on, emit } from './bus.js';
// Saves finished and abandoned free-play games on this device. Record: {id,date,human,level,result,san[],a?}
// "a" = engine analysis per position (added when a game is reviewed). Lessons are never saved.
const KEY = 'chess-games', CUR = 'chess-current';
export const pending = (() => { try { return JSON.parse(localStorage.getItem(CUR) || 'null'); } catch { return null; } })(); // game in progress when the app was last closed
const setCur = v => { try { if (v) localStorage.setItem(CUR, JSON.stringify(v)); else localStorage.removeItem(CUR); } catch { /* ignore */ } };
export const store = {
  all() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } },
  put(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full */ } },
  update(id, patch) { const l = this.all(), g = l.find(x => x.id === id); if (g) { Object.assign(g, patch); this.put(l); } },
};
export function startHistory(game) {
  let cur = null, saved = false;
  const keep = s => { cur = { san: s.history.map(m => m.san), human: s.human, level: game.levelName || '', free: game.coachOn };
    setCur(s.over || !cur.free ? null : { san: cur.san, human: cur.human, level: cur.level });
  };
  const save = result => {
    if (!cur?.free || cur.san.length < 4 || saved) return;
    saved = true;
    const l = store.all();
    l.unshift({ id: Date.now().toString(36), date: Date.now(), human: cur.human, level: cur.level, result, san: cur.san });
    store.put(l.slice(0, 200)); emit('history:changed');
  };
  on('game:move', keep); on('game:undo', keep);
  on('game:over', s => save(s.result));
  on('game:reset', s => { if (s.keepChat) return; save('*'); cur = null; saved = false; setCur(null); });
}
