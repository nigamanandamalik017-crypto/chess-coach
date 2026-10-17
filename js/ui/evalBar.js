import { on } from '../bus.js';
// SWAPPABLE UI: listens to 'eval:update' {cp, mate} (White's point of view) and 'board:flip'.
export function createEvalBar(root, { global = true } = {}) {
  root.innerHTML = '<div class="ev-white"></div><span class="ev-num">0.0</span>';
  const [fill, num] = root.children;
  const set = ({ cp = 0, mate = null }) => {
    const pct = mate != null ? (mate > 0 ? 100 : 0) : 100 / (1 + 10 ** (-cp / 400));
    fill.style.height = `${pct}%`;
    num.textContent = mate != null ? `M${Math.abs(mate)}` : `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(1)}`;
    root.classList.toggle('lead-w', pct >= 50); root.classList.toggle('lead-b', pct < 50);
  };
  set({});
  const flip = () => root.classList.toggle('flipped');
  if (global) { on('eval:update', set); on('game:reset', () => set({})); on('board:flip', flip); }
  return { set, flip };
}
