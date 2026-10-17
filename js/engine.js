import { CONFIG } from './config.js';
// UCI wrapper with a job queue (analysis and play never overlap). Swap this file to change engines.
export class Engine {
  #waiters = []; #q = Promise.resolve();
  constructor(path = CONFIG.enginePath) {
    this.worker = new Worker(path);
    this.worker.onmessage = e => { const l = String(e.data); this.#waiters = this.#waiters.filter(w => !w(l)); };
    this.worker.onerror = e => console.error('Engine failed to load', e);
    this.ready = (async () => {
      this.send('uci'); await this.#wait(l => l === 'uciok');
      this.send('isready'); await this.#wait(l => l === 'readyok');
    })();
  }
  send(cmd) { this.worker.postMessage(cmd); }
  #wait(test) {
    return new Promise(res => this.#waiters.push(l => { const r = test(l); if (r) res(r === true ? l : r); return !!r; }));
  }
  #run(fn) { const p = this.#q.then(() => this.ready).then(fn); this.#q = p.catch(() => {}); return p; }
  async #search(fen, limit, skill) {
    this.send(`setoption name Skill Level value ${skill}`);
    this.send(`position fen ${fen}`);
    this.send(`go ${limit}`);
    let info = '';
    const line = await this.#wait(l => {
      if (l.startsWith('info') && / score (cp|mate) /.test(l) && !/bound/.test(l)) info = l;
      return l.startsWith('bestmove') && l;
    });
    return { best: line.split(' ')[1], info };
  }
  bestMove(fen, lv) { return this.#run(async () => (await this.#search(fen, lv.depth ? `depth ${lv.depth}` : `movetime ${lv.movetime}`, lv.skill)).best); }
  // Returns {best, cp, mate, pv}; score is from the side-to-move's point of view.
  analyse(fen, movetime = 250) {
    return this.#run(async () => {
      const { best, info } = await this.#search(fen, `movetime ${movetime}`, 20);
      const m = /score (cp|mate) (-?\d+)/.exec(info);
      return { best, cp: m && m[1] === 'cp' ? +m[2] : null, mate: m && m[1] === 'mate' ? +m[2] : null,
               pv: ((/ pv (.*)$/.exec(info) || [])[1] || '').split(' ') };
    });
  }
}
