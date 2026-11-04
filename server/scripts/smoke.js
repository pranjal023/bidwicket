/**
 * Feature smoke test over REAL sockets: marquee order, pause/resume, chat.
 *   DEV_TIMER_SECONDS=4 DEV_AUTO_ADVANCE_MS=400 npm run dev    (terminal 1)
 *   npm run smoke                                              (terminal 2)
 */
const { io } = require('socket.io-client');

const BASE = process.env.SERVER_URL || 'http://localhost:4000';
const api = async (path, opts = {}) => (await fetch(`${BASE}/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })).json();
const emit = (s, ev, data) => new Promise((r) => s.emit(ev, data, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(50); } throw new Error('timeout'); };

let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) failures += 1; };

(async () => {
  const room = await api('/rooms', { method: 'POST', body: '{}' });
  const info = await api(`/rooms/${room.roomCode}`);
  const claim = await api(`/rooms/${room.roomCode}/teams/${info.teams[0].id}/claim`, { method: 'POST', body: JSON.stringify({ name: 'Smoke Team', color: '#ef4444', emoji: '🧪' }) });

  const host = io(BASE); const human = io(BASE); const spectator = io(BASE);
  const lots = new Map(); // lotNumber -> player rating
  let hostSnap = null; let chats = [];
  host.on('room:snapshot', (s) => { hostSnap = s; if (s.player && s.auction.state === 'player_live') lots.set(s.auction.lotNumber, s.player.rating); });
  host.on('chat:new', (m) => chats.push(m));

  await emit(host, 'room:join', { roomCode: room.roomCode, hostToken: room.hostToken });
  await emit(human, 'room:join', { roomCode: room.roomCode, teamToken: claim.teamToken });
  await emit(spectator, 'room:join', { roomCode: room.roomCode });

  // ---------- chat (in the lobby) ----------
  const c1 = await emit(human, 'chat:send', { text: 'hello\u0007   \n  world' });
  await waitFor(() => chats.length >= 1);
  check('chat: message delivered to the room', chats[0]?.text === 'hello world' && chats[0]?.name === 'Smoke Team', JSON.stringify(chats[0]?.text));
  check('chat: control chars / whitespace flood sanitised', chats[0]?.text === 'hello world');
  const c2 = await emit(human, 'chat:send', { text: 'too fast' });
  check('chat: rate limited (1 msg / 1.2s)', c2.ok === false && c2.error.code === 'RATE_LIMITED');
  const c3 = await emit(spectator, 'chat:send', { text: 'let me in' });
  check('chat: spectators cannot write', c3.ok === false && c3.error.code === 'SPECTATOR');
  const c4 = await emit(host, 'chat:send', { text: 'x'.repeat(201) });
  check('chat: >200 chars rejected by Zod', c4.ok === false && c4.error.code === 'VALIDATION_ERROR');
  await sleep(1300);
  const c5 = await emit(host, 'chat:send', { text: 'Welcome to BidWicket!' });
  check('chat: auctioneer can write and is tagged', c5.ok && chats.some((m) => m.isHost && m.name === 'Auctioneer'));
  const late = io(BASE); let history = null; late.on('chat:history', (h) => { history = h; });
  await emit(late, 'room:join', { roomCode: room.roomCode });
  await waitFor(() => history);
  check('chat: late joiner receives history', history.length === 2, `(${history.length} messages)`);
  late.close();

  // ---------- start, marquee ----------
  const started = await emit(host, 'auction:start', {});
  check('auction started', started.ok);
  await waitFor(() => hostSnap?.auction.state === 'player_live');
  check('marquee: banner data present', hostSnap.auction.marqueeCount === 6 && hostSnap.auction.settings.orderMode === 'marquee');

  // ---------- pause / resume ----------
  const p = await emit(host, 'auction:pause', {});
  await waitFor(() => hostSnap.auction.paused);
  const frozen = hostSnap.auction.pausedRemainingMs;
  check('pause: accepted, remaining time stored', p.ok && frozen > 0, `(${frozen} ms)`);
  const bid = await emit(human, 'bid:place', { clientBidId: 'smoke-bid-0001', amount: hostSnap.player.basePrice });
  check('pause: bids rejected while paused', bid.ok === false && bid.error.code === 'PAUSED');
  const denied = await emit(human, 'auction:pause', {});
  check('pause: non-host cannot pause/resume', denied.ok === false && denied.error.code === 'FORBIDDEN');
  const lotBefore = hostSnap.auction.lotNumber;
  await sleep(6000); // longer than the whole bid timer
  check('pause: lot stays open past its old deadline', hostSnap.auction.state === 'player_live' && hostSnap.auction.lotNumber === lotBefore);
  const r = await emit(host, 'auction:resume', {});
  await waitFor(() => hostSnap.auction.paused === false);
  const left = hostSnap.auction.timerEndsAt - Date.now();
  check('resume: timer restored (>= 3s)', r.ok && left > 2500, `(${left} ms left)`);

  // ---------- marquee order over the first 6 lots ----------
  await waitFor(() => lots.size >= 6, 400000);
  const first6 = [...lots.entries()].sort((a, b) => a[0] - b[0]).slice(0, 6).map((e) => e[1]);
  check('marquee: first 6 lots are the top-rated players', first6.every((x) => x >= 90), `(ratings ${first6.join(', ')})`);

  const stopped = await emit(host, 'auction:stop', {});
  check('stop: works while running', stopped.ok);
  [host, human, spectator].forEach((s) => s.close());
  console.log(failures ? `\n${failures} CHECK(S) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
