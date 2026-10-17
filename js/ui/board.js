// THE SWAPPABLE UI. Contract: createBoard(root, {onSquare, renderPiece}) -> {draw(view), flip()}
// view = { fen, selected, targets[], last:{from,to}, check, marks[] }.
// Squares are created once and only changed squares are updated, so the board never flickers or reloads.
const GLYPH = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
export const glyphPiece = p => {
  const s = document.createElement('span');
  s.className = `pc ${p.color}`; s.textContent = GLYPH[p.type] + '\uFE0E'; return s;
};
const protos = new Map();
export const imgPiece = p => { // each piece image is loaded once, then cloned
  const k = p.color + p.type;
  if (!protos.has(k)) {
    const i = new Image(); i.className = `pc img ${p.color}`; i.alt = ''; i.draggable = false;
    i.onerror = () => { i.dataset.bad = '1'; }; i.src = `vendor/pieces/${p.color}${p.type.toUpperCase()}.svg`; protos.set(k, i);
  }
  const proto = protos.get(k);
  return proto.dataset.bad ? glyphPiece(p) : proto.cloneNode(true);
};
const co = (k, t) => { const i = document.createElement('i'); i.className = `co ${k}`; i.textContent = t; return i; };
const parse = fen => {
  const m = {};
  fen.split(' ')[0].split('/').forEach((row, i) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += +ch; else m['abcdefgh'[f++] + (8 - i)] = ch; } });
  return m;
};
export function createBoard(root, { onSquare, renderPiece = imgPiece }) {
  let flipped = false, lastView = null;
  const cells = new Map(), idx = [0, 1, 2, 3, 4, 5, 6, 7];
  if (renderPiece === imgPiece) for (const c of 'wb') for (const t of 'pnbrqk') imgPiece({ color: c, type: t }); // preload everything once
  root.classList.add('board');
  const build = () => {
    root.replaceChildren(); cells.clear();
    const rs = flipped ? [...idx].reverse() : idx, fs = rs;
    for (const r of rs) for (const f of fs) {
      const sq = 'abcdefgh'[f] + (8 - r), el = document.createElement('div');
      el.className = `sq ${(r + f) % 2 ? 'dark' : 'light'}`; el.dataset.sq = sq; el.onclick = () => onSquare(sq);
      if (f === fs[0]) el.append(co('r', 8 - r));
      if (r === rs[7]) el.append(co('f', 'abcdefgh'[f]));
      cells.set(sq, el); root.append(el);
    }
  };
  function draw(view) {
    lastView = view;
    if (!cells.size) build();
    const pos = parse(view.fen);
    for (const [sq, el] of cells) {
      const ch = pos[sq] || '', t = !!view.targets?.includes(sq);
      if (el._ch !== ch) {
        el.querySelector('.pc')?.remove();
        if (ch) el.append(renderPiece({ color: ch === ch.toUpperCase() ? 'w' : 'b', type: ch.toLowerCase() }));
        el._ch = ch;
      }
      el.classList.toggle('sel', view.selected === sq);
      el.classList.toggle('target', t);
      el.classList.toggle('cap', t && !!ch);
      el.classList.toggle('last', !!view.last && (view.last.from === sq || view.last.to === sq));
      el.classList.toggle('check', view.check === sq);
      el.classList.toggle('mark', !!view.marks?.includes(sq));
    }
  }
  return { draw, flip() { flipped = !flipped; build(); if (lastView) draw(lastView); } };
}
