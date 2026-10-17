// Offline cache: everything is stored on first load; after that nothing is fetched from the network.
// Bump CACHE whenever you ship changes so installed copies refresh.
const CACHE = 'chess-v9';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/theme.css', 'css/coach.css', 'css/layout.css', 'css/themes.css', 'css/history.css', 'css/profile.css',
  'js/main.js', 'js/bus.js', 'js/config.js', 'js/engine.js', 'js/game.js', 'js/coach.js', 'js/judge.js', 'js/courses.js', 'js/drills.js',
  'js/history.js', 'js/review.js', 'js/stats.js', 'js/ui/board.js', 'js/ui/coachPanel.js', 'js/ui/evalBar.js', 'js/ui/lessonBar.js', 'js/ui/historyPanel.js', 'js/ui/profilePanel.js',
  'courses/courses.json', 'vendor/chess.js', 'vendor/stockfish/stockfish-18-lite-single.js', 'vendor/stockfish/stockfish-18-lite-single.wasm',
  'icons/icon-192.png', 'icons/icon-512.png',
  ...['w', 'b'].flatMap(c => ['K', 'Q', 'R', 'B', 'N', 'P'].map(t => `vendor/pieces/${c}${t}.svg`))];
self.addEventListener('install', e => { self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))))); });
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
