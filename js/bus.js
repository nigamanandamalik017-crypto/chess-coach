// Tiny event bus. Modules talk through events, never through each other's internals.
const t = new EventTarget();
export const emit = (name, data) => t.dispatchEvent(new CustomEvent(name, { detail: data }));
export const on = (name, fn) => t.addEventListener(name, e => fn(e.detail));
