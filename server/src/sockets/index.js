
const { Server } = require('socket.io');
const { socketEvents } = require('../validation/schemas');
const { AppError } = require('../utils/errors');
const { bus } = require('../utils/events');
const { Auction, Team, Message } = require('../models');
const presence = require('../services/presence');
const { loadRoomState, viewFor } = require('../services/snapshotService');
const { placeBid } = require('../services/biddingService');
const engine = require('../services/auctionEngine');
const { computeBidState } = require('../rules/bidRules');
const { missingRoles } = require('../rules/squadRules');
const { idEq } = require('../utils/helpers');

const OFFLINE_GRACE_MS = 3000; 
const REACTION_INTERVAL_MS = 1000; 
const { CHAT_INTERVAL_MS } = require('../constants');
const CHAT_HISTORY = 50;

const toChat = (m) => ({
  id: String(m._id), teamId: m.teamId ? String(m.teamId) : null, name: m.senderName, emoji: m.emoji,
  color: m.color, isHost: m.isHost, text: m.text, at: new Date(m.createdAt).getTime(),
});

const roomName = (code) => `auction:${code}`;
const teamRoom = (teamId) => `team:${teamId}`;

function initSockets(httpServer, origins) {
  const io = new Server(httpServer, { cors: { origin: origins, methods: ['GET', 'POST'] } });

  const offlineTimers = new Map(); 
  const announcedOffline = new Set();
  const lastReaction = new Map(); // userKey - timestamp
  const lastChat = new Map(); // userKey - timestamp

  /**  validate payload with Zod */
  const on = (socket, event, handler) => {
    socket.on(event, async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const parsed = socketEvents[event].safeParse(payload);
        if (!parsed.success) {
          throw new AppError('VALIDATION_ERROR', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
        }
        reply({ ok: true, ...(await handler(parsed.data)) });
      } catch (err) {
        if (!(err instanceof AppError)) console.error(`[socket:${event}]`, err);
        reply({ ok: false, error: { code: err.code || 'INTERNAL', message: err instanceof AppError ? err.message : 'Something went wrong' } });
      }
    });
  };

  /** Send each connected socket in the room its own personalised snapshot. */
  async function emitSnapshots(roomCode) {
    const state = await loadRoomState(roomCode);
    const sockets = await io.in(roomName(roomCode)).fetchSockets();
    for (const s of sockets) s.emit('room:snapshot', viewFor(state, s.data.identity));
  }

  /** Push each team its private Bid + state  */
  async function emitBidStates(roomCode) {
    const { auction, teams, player } = await loadRoomState(roomCode);
    for (const t of teams) {
      if (t.isBot) continue;
      io.to(teamRoom(t._id)).emit('me:bidState', computeBidState({ auction, team: t, player }));
    }
  }

  function leaveIdentity(socket) {
    const { roomCode, identity } = socket.data;
    if (roomCode && identity?.teamId) {
      socket.leave(teamRoom(identity.teamId));
      const left = presence.remove(roomCode, identity.teamId);
      if (left === 0) scheduleOffline(roomCode, identity.teamId);
    }
    socket.data.identity = { isHost: false, teamId: null };
  }

  async function scheduleOffline(roomCode, teamId) {
    const k = `${roomCode}:${teamId}`;
    clearTimeout(offlineTimers.get(k));
    offlineTimers.set(k, setTimeout(async () => {
      offlineTimers.delete(k);
      if (presence.isOnline(roomCode, teamId)) return;
      announcedOffline.add(k);
      const team = await Team.findById(teamId).lean();
      if (team) io.to(roomName(roomCode)).emit('team:presence', { teamId, name: team.name, connected: false });
    }, OFFLINE_GRACE_MS));
  }

  io.on('connection', (socket) => {
    socket.data.identity = { isHost: false, teamId: null };

    // ---- join / reconnect: ALWAYS answered with the full state ----
    on(socket, 'room:join', async ({ roomCode, hostToken, teamToken, clientId }) => {
      const auction = await Auction.findOne({ roomCode }).lean();
      if (!auction) throw new AppError('ROOM_NOT_FOUND', 'Room not found');
      leaveIdentity(socket);

      const isHost = !!hostToken && hostToken === auction.hostToken;
      const team = teamToken ? await Team.findOne({ auctionId: auction._id, token: teamToken }).lean() : null;

      socket.data.roomCode = roomCode;
      socket.data.auctionId = auction._id;
      socket.data.userKey = clientId || socket.id;
      socket.data.identity = { isHost, teamId: team ? team._id : null };
      socket.join(roomName(roomCode));
      if (isHost) socket.join(`host:${roomCode}`);

      if (team) {
        socket.join(teamRoom(team._id));
        const k = `${roomCode}:${team._id}`;
        clearTimeout(offlineTimers.get(k));
        offlineTimers.delete(k);
        presence.add(roomCode, team._id);
        if (announcedOffline.delete(k)) {
          io.to(roomName(roomCode)).emit('team:presence', { teamId: team._id, name: team.name, connected: true });
        }
      }
      socket.emit('room:snapshot', viewFor(await loadRoomState(roomCode), socket.data.identity));
      const history = await Message.find({ auctionId: auction._id }).sort({ createdAt: -1 }).limit(CHAT_HISTORY).lean();
      socket.emit('chat:history', history.reverse().map(toChat));
      return { identity: { isHost, teamId: socket.data.identity.teamId } };
    });

    const requireJoined = () => {
      if (!socket.data.auctionId) throw new AppError('NOT_JOINED', 'Join a room first');
    };
    const requireHost = () => {
      requireJoined();
      if (!socket.data.identity.isHost) throw new AppError('FORBIDDEN', 'Only the auctioneer can do this', 403);
    };

    // ---- auctioneer controls ----
    on(socket, 'auction:start', async () => { requireHost(); await engine.startAuction(socket.data.auctionId); return {}; });
    on(socket, 'auction:next', async () => { requireHost(); await engine.hostNext(socket.data.auctionId); return {}; });
    on(socket, 'auction:pause', async () => { requireHost(); await engine.pauseAuction(socket.data.auctionId); return {}; });
    on(socket, 'auction:resume', async () => { requireHost(); await engine.resumeAuction(socket.data.auctionId); return {}; });
    on(socket, 'auction:stop', async () => { requireHost(); await engine.stopAuction(socket.data.auctionId); return {}; });

    // ---- bidding: the client only SUGGESTS an amount; the server decides ----
    on(socket, 'bid:place', async ({ clientBidId, amount }) => {
      requireJoined();
      const { teamId } = socket.data.identity;
      if (!teamId) throw new AppError('SPECTATOR', 'Spectators cannot bid', 403);
      const res = await placeBid({ auctionId: socket.data.auctionId, teamId, amount, clientBidId });
      return { duplicate: res.duplicate, amount: res.bid.amount };
    });

    // ---- chat: teams and the auctioneer can talk  Sender is resolved server-side. ----
    on(socket, 'chat:send', async ({ text }) => {
      requireJoined();
      const { teamId, isHost } = socket.data.identity;
      if (!teamId && !isHost) throw new AppError('SPECTATOR', 'Join a team to chat', 403);
      const now = Date.now();
      const k = socket.data.userKey;
      if (now - (lastChat.get(k) || 0) < CHAT_INTERVAL_MS) throw new AppError('RATE_LIMITED', 'Slow down a little');
      lastChat.set(k, now);
      if (lastChat.size > 5000) for (const [key, ts] of lastChat) if (now - ts > 60_000) lastChat.delete(key);

      const clean = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(); // no control chars / newline floods
      if (!clean) throw new AppError('VALIDATION_ERROR', 'Message is empty');
      const team = teamId ? await Team.findById(teamId).lean() : null;
      const msg = await Message.create({
        auctionId: socket.data.auctionId, teamId: team ? team._id : null,
        senderName: team ? team.name : 'Auctioneer', emoji: team ? team.emoji : '🎙️', color: team ? team.color : '#94a3b8',
        isHost, text: clean,
      });
      io.to(roomName(socket.data.roomCode)).emit('chat:new', toChat(msg));
      return {};
    });

    // ---- reaction--- 
    on(socket, 'reaction:send', async ({ emoji }) => {
      requireJoined();
      const now = Date.now();
      const k = socket.data.userKey;
      if (now - (lastReaction.get(k) || 0) < REACTION_INTERVAL_MS) throw new AppError('RATE_LIMITED', 'Slow down - 1 reaction per second');
      lastReaction.set(k, now);
      if (lastReaction.size > 5000) for (const [key, ts] of lastReaction) if (now - ts > 60_000) lastReaction.delete(key);
      io.to(roomName(socket.data.roomCode)).emit('reaction:new', { emoji, id: `${now}-${Math.random().toString(36).slice(2, 7)}` });
      return {};
    });

    socket.on('disconnect', () => leaveIdentity(socket));
  });

  // ================= domain events -> socket broadcasts =================
  const safe = (fn) => (payload) => Promise.resolve(fn(payload)).catch((e) => console.error('[bus]', e));

  bus.on('room:updated', safe(({ roomCode }) => emitSnapshots(roomCode)));

  bus.on('lot:started', safe(async ({ auction }) => {
    io.to(roomName(auction.roomCode)).emit('lot:started', { lotNumber: auction.queueIndex });
    await emitSnapshots(auction.roomCode);
  }));

  bus.on('bid:accepted', safe(async ({ auction, team, amount, extended, previousLeaderId, player }) => {
    const room = roomName(auction.roomCode);
    const payload = {
      teamId: team._id, teamName: team.name, amount, currentBid: auction.currentBid,
      timerEndsAt: auction.timerEndsAt.getTime(), serverNow: Date.now(), extended, at: Date.now(),
    };
    io.to(room).emit('bid:new', payload);
    if (extended) io.to(room).emit('timer:extended', { timerEndsAt: payload.timerEndsAt, serverNow: payload.serverNow });

    
    if (previousLeaderId && !idEq(previousLeaderId, team._id)) {
      const prev = await Team.findById(previousLeaderId).lean();
      if (prev && !prev.isBot) {
        io.to(teamRoom(prev._id)).emit('me:outbid', {
          playerName: player.name, byTeamName: team.name, amount,
          bidState: computeBidState({ auction, team: prev, player }),
        });
      }
    }
    await emitBidStates(auction.roomCode);
  }));

  bus.on('lot:closed', safe(async ({ auction, result }) => {
    const room = roomName(auction.roomCode);
    io.to(room).emit(result.outcome === 'sold' ? 'lot:sold' : 'lot:unsold', result);
    await emitSnapshots(auction.roomCode);

    
    const next = auction.playerQueue[auction.queueIndex];
    if (next) {
      const { Player } = require('../models');
      const [np, teams] = await Promise.all([Player.findById(next).lean(), Team.find({ auctionId: auction._id, isBot: false }).lean()]);
      for (const t of teams) {
        if (np && t.squad.length < auction.settings.squadSize && missingRoles(t.squad).includes(np.role)) {
          io.to(teamRoom(t._id)).emit('me:targetNext', { playerName: np.name, role: np.role });
        }
      }
    }
  }));

  bus.on('auction:paused', safe(async ({ auction }) => {
    io.to(roomName(auction.roomCode)).emit('auction:paused', { pausedRemainingMs: auction.pausedRemainingMs });
    await emitSnapshots(auction.roomCode);
  }));

  bus.on('auction:resumed', safe(async ({ auction }) => {
    io.to(roomName(auction.roomCode)).emit('auction:resumed', {});
    await emitSnapshots(auction.roomCode);
  }));

  bus.on('auction:completed', safe(async ({ auction }) => {
    io.to(roomName(auction.roomCode)).emit('auction:completed', { roomCode: auction.roomCode });
    await emitSnapshots(auction.roomCode);
  }));

  return io;
}

module.exports = { initSockets };
