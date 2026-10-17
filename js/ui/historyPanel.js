import { createBoard } from './board.js';
import { createEvalBar } from './evalBar.js';
import { store } from '../history.js';
import { analyseGame, classify, replay, toPgn, MARK, LABEL, ORDER, ANALYSIS_V } from '../review.js';
// SWAPPABLE UI: history list + game review (replay, eval bar, move markers, PGN export) inside a <dialog>.
const h = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const btn = (label, fn, cls) => { const b = h('button', cls, label); b.onclick = fn; return b; };
function download(name, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/x-chess-pgn' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
export function createHistoryPanel(dlg, engine) {
  const root = h('div', 'hp'); dlg.append(root);
  const head = (title, ...b) => { const n = h('div', 'hp-head'); n.append(h('h2', '', title), ...b); return n; };

  function list() {
    root.replaceChildren(head('History', btn('Close', () => dlg.close())));
    const games = store.all();
    if (!games.length) root.append(h('p', 'hp-empty', 'No games yet. Finished games are saved here automatically.'));
    for (const g of games) {
      const row = h('div', 'hp-row'), info = h('div');
      info.append(h('b', '', `${new Date(g.date).toLocaleDateString()} · ${g.human === 'w' ? 'White' : 'Black'} vs ${g.level || 'Engine'}`),
        h('small', '', `${g.result} · ${Math.ceil(g.san.length / 2)} moves${g.a ? ' · analysed' : ''}`));
      row.append(info, btn('Review', () => review(g)), btn('PGN', () => download(`game-${g.id}.pgn`, toPgn(g, g.a))),
        btn('✕', () => { if (confirm('Delete this game?')) { store.put(store.all().filter(x => x.id !== g.id)); list(); } }));
      root.append(row);
    }
    if (games.length) root.append(btn('Export all PGN', () => download('chess-coach-games.pgn', games.map(g => toPgn(g, g.a)).join('\n'))));
  }

  async function review(g) {
    const sum = h('p', 'hp-sum'), stage = h('div', 'stage'), bar = h('div', 'evalbar'), bd = h('div'), nav = h('div', 'hp-nav'), note = h('p', 'hp-note'), det = h('details', 'hp-table'), cells = [];
    det.hidden = true;
    stage.append(bar, bd);
    const pgn = () => toPgn(g, g.a);
    root.replaceChildren(head('Review', btn('← Back', list), btn('Export PGN', () => download(`game-${g.id}.pgn`, pgn())),
      btn('Copy', () => navigator.clipboard?.writeText(pgn()))), sum, stage, nav, note, det);
    const eb = createEvalBar(bar, { global: false }), board = createBoard(bd, { onSquare() {} }), { fens, mv } = replay(g.san);
    let ply = 0, data = null;
    const show = () => {
      const m = data?.moves[ply - 1], bad = m && ['inaccuracy', 'mistake', 'blunder'].includes(m.cls) && m.bestUci;
      board.draw({ fen: fens[ply], last: mv[ply - 1] || null, marks: bad ? [m.bestUci.slice(0, 2), m.bestUci.slice(2, 4)] : [] });
      if (g.a) eb.set({ cp: g.a[ply].cp ?? 0, mate: g.a[ply].mate });
      note.textContent = m ? `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '...'} ${m.san}: ${LABEL[m.cls]}.${bad && m.best ? ` Best was ${m.best}.` : ''}` : ply ? '' : 'Start position';
      cells.forEach((c, i) => c.classList.toggle('on', i === ply - 1));
    };
    const go = n => { ply = Math.max(0, Math.min(g.san.length, n)); show(); };
    nav.append(btn('⏮', () => go(0)), btn('◀', () => go(ply - 1)), btn('▶', () => go(ply + 1)), btn('⏭', () => go(g.san.length)),
      btn('Flip', () => { board.flip(); eb.flip(); }));
    show();
    const finish = () => {
      data = classify(g.san, g.a);
      const you = g.human, bot = you === 'w' ? 'b' : 'w', ev = r => r.mate != null ? `M${Math.abs(r.mate)}` : `${r.cp >= 0 ? '+' : ''}${(r.cp / 100).toFixed(1)}`;
      sum.textContent = `Accuracy: You ${data.acc[you]}% · Engine ${data.acc[bot]}%`;
      const tr = (cs, tag = 'td') => { const r = h('tr'); for (const c of cs) { const d = h(tag); d.append(c ?? ''); r.append(d); } return r; };
      const counts = h('table', 'hp-counts'), list = h('table', 'hp-mt'), wrap = h('div', 'hp-scroll');
      counts.append(tr(['Move quality', 'You', 'Engine'], 'th'), ...ORDER.map(k => tr([h('span', `pill ${k}`, LABEL[k]), String(data.counts[you][k] || 0), String(data.counts[bot][k] || 0)])));
      list.append(tr(['#', 'White', 'Black', 'Eval'], 'th')); cells.length = 0;
      for (let i = 0; i < data.moves.length; i += 2) {
        const mk = j => {
          const m = data.moves[j]; if (!m) return '';
          const b = btn(`${m.san} ${MARK[m.cls]}`.trim(), () => go(j + 1), `mv ${m.cls}`); b.title = LABEL[m.cls]; cells[j] = b; return b;
        };
        list.append(tr([String(i / 2 + 1), mk(i), mk(i + 1), ev(g.a[Math.min(i + 2, g.san.length)])]));
      }
      wrap.append(list);
      det.replaceChildren(h('summary', '', 'Analysis table (tap to expand or collapse)'), counts, wrap);
      det.hidden = false; det.open = true; show();
    };
    if (g.a && g.v === ANALYSIS_V) return finish();
    g.a = null;
    sum.textContent = 'Analysing… 0%';
    g.a = await analyseGame(engine, g.san, (i, n) => { sum.textContent = `Analysing… ${Math.round(100 * i / n)}%`; });
    g.v = ANALYSIS_V; store.update(g.id, { a: g.a, v: g.v }); finish();
  }
  return { open() { list(); dlg.showModal(); } };
}
