/**
 * End-to-end simulation over REAL sockets: creates a room, joins one human team,
 * starts the auction (3 bots fill the other seats) and plays until completion.
 *   npm run dev            (in one terminal; add DEV_TIMER_SECONDS=6 DEV_AUTO_ADVANCE_MS=800 for speed)
 *   npm run simulate       (in another)
 * Prints every SOLD/UNSOLD event, then the final results and a rules audit.
 */
const crypto = require('crypto');
const { io } = require('socket.io-client');

const BASE = process.env.SERVER_URL || 'http://localhost:4000';
const api = async (path, opts = {}) => {
  const res = await fetch(`${BASE}/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
};
const emit = (socket, ev, data) => new Promise((resolve) => socket.emit(ev, data, resolve));

(async () => {
  const room = await api('/rooms', { method: 'POST', body: '{}' });
  const info = await api(`/rooms/${room.roomCode}`);
  const claim = await api(`/rooms/${room.roomCode}/teams/${info.teams[0].id}/claim`, {
    method: 'POST', body: JSON.stringify({ name: 'Sim Humans', color: '#ef4444', emoji: '🧪' }),
  });
  console.log('Room', room.roomCode, 'human team', claim.teamId);

  const host = io(BASE); const human = io(BASE);
  let bidState = null; let completed = false; let sold = 0; let unsold = 0; let outbids = 0; let extended = 0;
  human.on('me:bidState', (b) => { bidState = b; });
  human.on('me:outbid', () => { outbids += 1; });
  human.on('room:snapshot', (s) => { bidState = s.me.bidState; });
  host.on('timer:extended', () => { extended += 1; });
  host.on('lot:sold', (r) => { sold += 1; console.log(`SOLD   ${r.playerName.padEnd(20)} ${r.role.padEnd(4)} -> ${r.teamName.padEnd(15)} ${r.amount} Cr${r.isRecord ? '  (record)' : ''}`); });
  host.on('lot:unsold', (r) => { unsold += 1; console.log(`UNSOLD ${r.playerName}`); });
  host.on('auction:completed', () => { completed = true; });

  await emit(host, 'room:join', { roomCode: room.roomCode, hostToken: room.hostToken });
  await emit(human, 'room:join', { roomCode: room.roomCode, teamToken: claim.teamToken });

  // The "human" is a simple script: bid when allowed and the price is modest, after a short pause.
  const loop = setInterval(async () => {
    if (bidState?.canBid && bidState.nextBid <= 3.5 && Math.random() < 0.5) {
      const amount = bidState.nextBid; bidState = null;
      await emit(human, 'bid:place', { clientBidId: crypto.randomUUID(), amount });
    }
  }, 400);

  const started = await emit(host, 'auction:start', {});
  if (!started.ok) throw new Error(JSON.stringify(started));

  while (!completed) await new Promise((r) => setTimeout(r, 500));
  clearInterval(loop);

  const results = await api(`/rooms/${room.roomCode}/results`);
  console.log(`\nCompleted. sold=${sold} unsold=${unsold} extended=${extended} humanOutbids=${outbids}`);
  for (const t of results.teams) {
    console.log(`${t.name.padEnd(16)} ${t.isBot ? 'BOT  ' : 'HUMAN'} players=${t.squad.length} spent=${t.spent} left=${t.purseLeft} roles=${JSON.stringify(t.roleCounts)} ${t.flags.length ? 'FLAGS: ' + t.flags.join(', ') : 'OK'}`);
  }
  // Audit invariants.
  const bad = results.teams.filter((t) => t.squad.length > 5 || t.purseLeft < 0 || Math.abs(t.spent + t.purseLeft - 30) > 1e-6);
  console.log(bad.length ? `INVARIANT VIOLATION: ${bad.map((t) => t.name)}` : 'Invariants OK (squad<=5, purse>=0, spent+left=30)');
  console.log('Highest sale:', results.highestSale);
  host.close(); human.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
