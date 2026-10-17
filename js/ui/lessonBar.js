import { on, emit } from '../bus.js';
// SWAPPABLE UI: lesson picker + action buttons. Emits 'lesson:start' {id} and 'lesson:action' {id};
// listens to 'lesson:buttons' {buttons:[{id,label}]} and 'lesson:progress' {done:[ids]}.
export function createLessonBar(root, courses) {
  root.innerHTML = '<select aria-label="Choose a lesson"></select><button class="go">Start lesson</button><div class="lesson-actions"></div>';
  const [sel, go, actions] = root.children;
  const fill = (done = []) => {
    const keep = sel.value; sel.replaceChildren();
    for (const c of courses) {
      const g = document.createElement('optgroup'); g.label = c.title;
      for (const l of c.lessons) g.append(new Option((done.includes(l.id) ? '✓ ' : '') + l.title, l.id));
      sel.append(g);
    }
    if (keep) sel.value = keep;
  };
  fill();
  go.onclick = () => emit('lesson:start', { id: sel.value });
  on('lesson:progress', e => fill(e.done));
  on('lesson:buttons', e => {
    actions.replaceChildren();
    for (const b of e.buttons) { const el = document.createElement('button'); el.textContent = b.label; el.onclick = () => emit('lesson:action', { id: b.id }); actions.append(el); }
  });
}
