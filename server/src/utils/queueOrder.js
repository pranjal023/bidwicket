
const { shuffle } = require('./helpers');

function buildQueue(players, { mode = 'marquee', marqueeSize = 6 } = {}) {
  if (mode !== 'marquee') return { ids: shuffle(players).map((p) => p._id), marqueeCount: 0 };
  const size = Math.max(0, Math.min(marqueeSize, Math.floor(players.length / 3)));
 
  const byRating = shuffle(players).sort((a, b) => b.rating - a.rating);
  const marquee = shuffle(byRating.slice(0, size));
  const rest = shuffle(byRating.slice(size));
  return { ids: [...marquee, ...rest].map((p) => p._id), marqueeCount: size };
}

module.exports = { buildQueue };
