
const { Auction, Team, Player } = require('../models');
const { BOT_PERSONALITIES } = require('../constants');
const { AppError } = require('../utils/errors');
const { round2 } = require('../utils/helpers');
const { buildQueue } = require('../utils/queueOrder');
const MARQUEE_SIZE = require('../constants').MARQUEE_SIZE ?? 6;
const { bus } = require('../utils/events');
const { isAuctionOver } = require('../rules/squadRules');

const lotTimers = new Map(); 
const advanceTimers = new Map(); 
const CLOSE_GRACE_MS = 30; 

function clearTimer(map, id) {
  const t = map.get(String(id));
  if (t) clearTimeout(t);
  map.delete(String(id));
}


function armTimer(auction) {
  const id = String(auction._id);
  clearTimer(lotTimers, id);
  if (auction.state !== 'player_live' || !auction.timerEndsAt || auction.paused) return;
  const delay = Math.max(0, new Date(auction.timerEndsAt).getTime() - Date.now()) + CLOSE_GRACE_MS;
  lotTimers.set(id, setTimeout(() => onTimerFired(id).catch((e) => console.error('[timer]', e)), delay));
}

async function onTimerFired(auctionId) {
  lotTimers.delete(String(auctionId));
  const res = await closeLot(auctionId);
  if (!res.closed) {
  
    const a = await Auction.findById(auctionId);
    if (a && a.state === 'player_live') armTimer(a);
  }
}


async function startAuction(auctionId) {
 
  const auction = await Auction.findOneAndUpdate(
    { _id: auctionId, state: 'lobby', startedAt: null },
    { $set: { startedAt: new Date() } },
    { new: true }
  );
  if (!auction) throw new AppError('ALREADY_STARTED', 'Auction already started', 409);

  const abort = async (code, msg) => {
    await Auction.updateOne({ _id: auctionId }, { $set: { startedAt: null } });
    throw new AppError(code, msg, 409);
  };

  const teams = await Team.find({ auctionId }).sort({ slot: 1 });
  const humans = teams.filter((t) => t.claimed);
  if (!humans.length) return abort('NO_TEAMS', 'At least one team must join before starting');

  const open = teams.filter((t) => !t.claimed);
  const botTeams = auction.settings.botsEnabled ? open.slice(0, auction.settings.maxBots) : [];
  const dropped = open.filter((t) => !botTeams.includes(t));
  if (humans.length + botTeams.length < 2) return abort('NEED_MORE_TEAMS', 'Need at least 2 teams (enable bots or wait for players)');

  const players = await Player.find({ auctionId });
  if (!players.length) return abort('EMPTY_POOL', 'Player pool is empty');

  for (const [i, t] of botTeams.entries()) {
    const persona = BOT_PERSONALITIES[i % BOT_PERSONALITIES.length];
    t.isBot = true;
    t.claimed = true;
    t.botConfig = { enabled: true, personality: persona.key, aggression: persona.aggression, minDelayMs: 700, maxDelayMs: 2800 };
    await t.save();
  }
  if (dropped.length) await Team.deleteMany({ _id: { $in: dropped.map((t) => t._id) } });

  await Player.updateMany({ auctionId }, { $set: { status: 'pending', ownerTeamId: null, soldPrice: null } });
  const { ids, marqueeCount } = buildQueue(players, { mode: auction.settings.orderMode, marqueeSize: MARQUEE_SIZE });
  await Auction.updateOne({ _id: auctionId }, { $set: { playerQueue: ids, marqueeCount, queueIndex: 0 } });
  bus.emit('room:updated', { roomCode: auction.roomCode });
  return advance(auctionId);
}


async function advance(auctionId) {
  clearTimer(advanceTimers, auctionId);
  const a = await Auction.findById(auctionId);
  if (!a) throw new AppError('ROOM_NOT_FOUND', 'Room not found', 404);
  if (!['lobby', 'sold', 'unsold'].includes(a.state) || a.paused) return null; 

  const teams = await Team.find({ auctionId }).lean();
  if (isAuctionOver(teams, a.queueIndex, a.playerQueue.length, a.settings)) return completeAuction(a);

  const playerId = a.playerQueue[a.queueIndex];
  const timerEndsAt = new Date(Date.now() + a.settings.timerSeconds * 1000);
  const updated = await Auction.findOneAndUpdate(
    { _id: a._id, state: a.state, queueIndex: a.queueIndex, paused: { $ne: true } },
    {
      $set: { state: 'player_live', currentPlayerId: playerId, currentBid: 0, currentTeamId: null, timerEndsAt },
      $inc: { queueIndex: 1 },
    },
    { new: true }
  );
  if (!updated) return null; 
  await Player.updateOne({ _id: playerId }, { $set: { status: 'live' } });
  armTimer(updated);
  bus.emit('lot:started', { auction: updated });
  return updated;
}


async function closeLot(auctionId) {
  const now = new Date();
  const a = await Auction.findById(auctionId);
  if (!a || a.state !== 'player_live' || a.paused) return { closed: false };
  if (a.timerEndsAt > now) return { closed: false };

  const player = await Player.findById(a.currentPlayerId);
  const winnerTeam = a.currentTeamId ? await Team.findById(a.currentTeamId) : null;
  const sold = !!(winnerTeam && a.currentBid > 0);


  const guard = { _id: a._id, state: 'player_live', paused: { $ne: true }, timerEndsAt: { $lte: now }, currentBid: a.currentBid, currentTeamId: a.currentTeamId };
  const isRecord = sold && a.currentBid > (a.highestSale?.amount || 0);

  const lastResult = {
    outcome: sold ? 'sold' : 'unsold',
    playerId: player._id, playerName: player.name, role: player.role, rating: player.rating, nationality: player.nationality,
    teamId: sold ? winnerTeam._id : null, teamName: sold ? winnerTeam.name : null,
    teamColor: sold ? winnerTeam.color : null, teamEmoji: sold ? winnerTeam.emoji : null,
    amount: sold ? a.currentBid : null, isRecord,
  };
  const $set = { state: sold ? 'sold' : 'unsold', lastResult };
  if (isRecord) {
    $set.highestSale = { playerId: player._id, playerName: player.name, teamId: winnerTeam._id, teamName: winnerTeam.name, amount: a.currentBid };
  }

  const updated = await Auction.findOneAndUpdate(guard, { $set }, { new: true });
  if (!updated) return { closed: false }; 

  clearTimer(lotTimers, auctionId);
  if (sold) {
    await Player.updateOne({ _id: player._id }, { $set: { status: 'sold', ownerTeamId: winnerTeam._id, soldPrice: a.currentBid } });
    await Team.updateOne(
      { _id: winnerTeam._id },
      {
        $inc: { purse: -a.currentBid },
        $push: { squad: { playerId: player._id, name: player.name, role: player.role, price: a.currentBid } },
      }
    );
  } else {
    await Player.updateOne({ _id: player._id }, { $set: { status: 'unsold' } });
  }

  bus.emit('lot:closed', { auction: updated, result: lastResult });
  if (updated.settings.autoAdvance) scheduleAdvance(updated);
  return { closed: true, result: lastResult };
}

function scheduleAdvance(auction) {
  const id = String(auction._id);
  clearTimer(advanceTimers, id);
  advanceTimers.set(
    id,
    setTimeout(() => advance(id).catch((e) => console.error('[advance]', e)), auction.settings.autoAdvanceMs)
  );
}

async function completeAuction(a) {
  const done = await Auction.findOneAndUpdate(
    { _id: a._id, state: { $in: ['lobby', 'sold', 'unsold'] } },
    { $set: { state: 'completed', currentPlayerId: null, currentTeamId: null, currentBid: 0, timerEndsAt: null } },
    { new: true }
  );
  if (!done) return null;
  
  await Player.updateMany({ auctionId: a._id, status: 'pending' }, { $set: { status: 'unsold' } });
  clearTimer(lotTimers, a._id);
  clearTimer(advanceTimers, a._id);
  bus.emit('auction:completed', { auction: done });
  return done;
}


async function hostNext(auctionId) {
  const cur = await Auction.findById(auctionId).select('paused').lean();
  if (cur?.paused) throw new AppError('PAUSED', 'Resume the auction first', 409);
  const res = await advance(auctionId);
  if (!res) throw new AppError('CANNOT_ADVANCE', 'Nothing to advance right now', 409);
  return res;
}


async function stopAuction(auctionId) {
  const done = await Auction.findOneAndUpdate(
    { _id: auctionId, state: { $in: ['player_live', 'sold', 'unsold'] } },
    { $set: { state: 'completed', paused: false, currentPlayerId: null, currentTeamId: null, currentBid: 0, timerEndsAt: null } },
    { new: true }
  );
  if (!done) throw new AppError('CANNOT_STOP', 'The auction is not running', 409);
  clearTimer(lotTimers, auctionId);
  clearTimer(advanceTimers, auctionId);
  await Player.updateMany({ auctionId, status: { $in: ['pending', 'live'] } }, { $set: { status: 'unsold' } });
  bus.emit('auction:completed', { auction: done, stopped: true });
  return done;
}


async function pauseAuction(auctionId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const a = await Auction.findById(auctionId);
    if (!a) throw new AppError('ROOM_NOT_FOUND', 'Room not found', 404);
    if (a.paused) throw new AppError('ALREADY_PAUSED', 'The auction is already paused', 409);
    if (!['player_live', 'sold', 'unsold'].includes(a.state)) throw new AppError('CANNOT_PAUSE', 'There is nothing to pause right now', 409);

    const live = a.state === 'player_live';
    const remaining = live ? a.timerEndsAt.getTime() - Date.now() : 0;
    if (live && remaining <= 0) throw new AppError('CANNOT_PAUSE', 'This lot is closing right now', 409);

    const guard = { _id: a._id, state: a.state, paused: { $ne: true } };
    if (live) guard.timerEndsAt = a.timerEndsAt;
    const updated = await Auction.findOneAndUpdate(guard, { $set: { paused: true, pausedRemainingMs: Math.max(0, remaining) } }, { new: true });
    if (updated) {
      clearTimer(lotTimers, auctionId);
      clearTimer(advanceTimers, auctionId);
      bus.emit('auction:paused', { auction: updated });
      return updated;
    }
  }
  throw new AppError('CANNOT_PAUSE', 'The auction just changed, please try again', 409);
}


async function resumeAuction(auctionId) {
  const a = await Auction.findById(auctionId);
  if (!a) throw new AppError('ROOM_NOT_FOUND', 'Room not found', 404);
  if (!a.paused) throw new AppError('NOT_PAUSED', 'The auction is not paused', 409);

  const $set = { paused: false, pausedRemainingMs: 0 };
  if (a.state === 'player_live') $set.timerEndsAt = new Date(Date.now() + Math.max(a.pausedRemainingMs || 0, 3000));
  const updated = await Auction.findOneAndUpdate({ _id: a._id, paused: true }, { $set }, { new: true });
  if (!updated) throw new AppError('NOT_PAUSED', 'The auction is not paused', 409);

  if (updated.state === 'player_live') armTimer(updated);
  else if (['sold', 'unsold'].includes(updated.state) && updated.settings.autoAdvance) scheduleAdvance(updated);
  bus.emit('auction:resumed', { auction: updated });
  return updated;
}


async function resumeAll() {
  const live = await Auction.find({ state: { $in: ['player_live', 'sold', 'unsold'] } });
  for (const a of live) {
    if (a.paused) continue; 
    if (a.state === 'player_live') { armTimer(a); bus.emit('lot:started', { auction: a, resumed: true }); }
    else if (a.settings.autoAdvance) scheduleAdvance(a);
  }
  return live.length;
}


function initEngine() {
  bus.on('bid:accepted', ({ auction, extended }) => { if (extended) armTimer(auction); });
}

function stopAllTimers() {
  [lotTimers, advanceTimers].forEach((m) => { m.forEach((t) => clearTimeout(t)); m.clear(); });
}

module.exports = { startAuction, advance, hostNext, stopAuction, pauseAuction, resumeAuction, closeLot, armTimer, resumeAll, initEngine, stopAllTimers, round2 };
