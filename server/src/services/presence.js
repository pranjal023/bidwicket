
const counts = new Map(); 
const key = (code, teamId) => `${code}:${teamId}`;

module.exports = {
  /** @returns {number} sockets now connected for that team */
  add(code, teamId) { const k = key(code, teamId); counts.set(k, (counts.get(k) || 0) + 1); return counts.get(k); },
  remove(code, teamId) {
    const k = key(code, teamId); const n = (counts.get(k) || 1) - 1;
    if (n <= 0) counts.delete(k); else counts.set(k, n);
    return Math.max(0, n);
  },
  isOnline(code, teamId) { return (counts.get(key(code, teamId)) || 0) > 0; },
};
