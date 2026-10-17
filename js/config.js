export const CONFIG = {
  enginePath: 'vendor/stockfish/stockfish-18-lite-single.js',
  analysisMs: 800, // time per position when reviewing a game: full strength and a longer search
  levels: [ // skill = Stockfish "Skill Level" 0-20; depth or movetime(ms) limits the search
    { name: 'Beginner',     skill: 0,  depth: 1 },
    { name: 'Easy',         skill: 3,  depth: 3 },
    { name: 'Intermediate', skill: 8,  movetime: 120 },
    { name: 'Advanced',     skill: 14, movetime: 400 },
    { name: 'Master',       skill: 20, movetime: 1500 },
  ],
  // Opponent "thinking" delay in ms. `long` = chance of an extra 2-4.5 s pause.
  speeds: [
    { name: 'Instant',          min: 0,    max: 0,    long: 0 },
    { name: 'Relaxed (2-4 s)',  min: 2000, max: 3500, long: 0.25 },
    { name: 'Slow (4-7 s)',     min: 4000, max: 6500, long: 0.3 },
  ],
};
