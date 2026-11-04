/** Room lifecycle before the auction starts: create, claim a team, edit, upload pool. */
const { Auction, Team, Player } = require('../models');
const { DEFAULT_SETTINGS, DEFAULT_TEAMS } = require('../constants');
const { AppError } = require('../utils/errors');
const { randomRoomCode, randomToken, idEq } = require('../utils/helpers');
const { parsePool } = require('../utils/poolParser');
const { bus } = require('../utils/events');
const env = require('../config/env');

async function loadCatalogue() {
  const rows = await Player.find({ auctionId: null }).lean();
  if (rows.length) return rows;
 
  return require('../seed/seed').loadSeedPlayers();
}


function toPoolDocs(auctionId, rows) {
  return rows.map((r) => ({
    auctionId,
    catalogId: r._id || null,
    name: r.name, role: r.role, nationality: r.nationality, rating: r.rating, basePrice: r.basePrice,
    status: 'pending',
  }));
}

async function createRoom(settingsOverrides = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...settingsOverrides };
  if (env.NODE_ENV !== 'production') {
    if (env.DEV_TIMER_SECONDS) settings.timerSeconds = env.DEV_TIMER_SECONDS;
    if (env.DEV_AUTO_ADVANCE_MS) settings.autoAdvanceMs = env.DEV_AUTO_ADVANCE_MS;
  }
  let auction;
  for (let attempt = 0; attempt < 8 && !auction; attempt++) {
    try {
      auction = await Auction.create({ roomCode: randomRoomCode(), hostToken: randomToken(), settings });
    } catch (e) {
      if (e.code !== 11000) throw e; 
    }
  }
  if (!auction) throw new AppError('ROOM_CODE', 'Could not allocate a room code', 500);

  await Team.insertMany(
    DEFAULT_TEAMS.map((t, slot) => ({ auctionId: auction._id, slot, ...t, purse: settings.purse }))
  );
  await Player.insertMany(toPoolDocs(auction._id, await loadCatalogue()));
  return { roomCode: auction.roomCode, hostToken: auction.hostToken };
}

async function getAuctionByCode(code) {
  const auction = await Auction.findOne({ roomCode: code });
  if (!auction) throw new AppError('ROOM_NOT_FOUND', 'Room not found', 404);
  return auction;
}


async function getPublicInfo(code) {
  const auction = await getAuctionByCode(code);
  const teams = await Team.find({ auctionId: auction._id }).sort({ slot: 1 }).lean();
  return {
    roomCode: auction.roomCode,
    state: auction.state,
    teams: teams.map((t) => ({ id: t._id, name: t.name, color: t.color, emoji: t.emoji, claimed: t.claimed, isBot: t.isBot })),
  };
}

function assertHost(auction, hostToken) {
  if (!hostToken || hostToken !== auction.hostToken) throw new AppError('FORBIDDEN', 'Only the auctioneer can do this', 403);
}
function assertLobby(auction) {
  if (auction.state !== 'lobby' || auction.startedAt) throw new AppError('NOT_LOBBY', 'The auction has already started', 409);
}


async function claimTeam(code, teamId, { name, color, emoji }) {
  const auction = await getAuctionByCode(code);
  assertLobby(auction);
  const token = randomToken();
  const team = await Team.findOneAndUpdate(
    { _id: teamId, auctionId: auction._id, claimed: false },
    { $set: { claimed: true, token, name, color, emoji } },
    { new: true }
  );
  if (!team) throw new AppError('TEAM_TAKEN', 'That team is already taken', 409);
  bus.emit('room:updated', { roomCode: auction.roomCode });
  return { teamId: team._id, teamToken: token };
}


async function updateTeam(code, teamId, patch, { hostToken, teamToken }) {
  const auction = await getAuctionByCode(code);
  assertLobby(auction);
  const team = await Team.findOne({ _id: teamId, auctionId: auction._id });
  if (!team) throw new AppError('TEAM_NOT_FOUND', 'Team not found', 404);
  const isHost = hostToken && hostToken === auction.hostToken;
  const isOwner = teamToken && team.token && teamToken === team.token;
  if (!isHost && !isOwner) throw new AppError('FORBIDDEN', 'Not allowed to edit this team', 403);
  Object.assign(team, patch);
  await team.save();
  bus.emit('room:updated', { roomCode: auction.roomCode });
  return { ok: true };
}

async function updateSettings(code, patch, hostToken) {
  const auction = await getAuctionByCode(code);
  assertHost(auction, hostToken);
  assertLobby(auction);
  for (const [k, v] of Object.entries(patch)) auction.set(`settings.${k}`, v);
  await auction.save();
  bus.emit('room:updated', { roomCode: auction.roomCode });
  return { settings: auction.settings };
}

async function replacePool(code, body, hostToken) {
  const auction = await getAuctionByCode(code);
  assertHost(auction, hostToken);
  assertLobby(auction);
  const { players, errors, warnings } = parsePool(body);
  if (errors.length) throw new AppError('INVALID_POOL', errors.slice(0, 5).join(' | '), 422);
  if (players.length < 5) throw new AppError('INVALID_POOL', 'Pool needs at least 5 players', 422);
  await Player.deleteMany({ auctionId: auction._id });
  await Player.insertMany(toPoolDocs(auction._id, players));
  bus.emit('room:updated', { roomCode: auction.roomCode });
  return { count: players.length, warnings };
}

module.exports = {
  createRoom, getAuctionByCode, getPublicInfo, claimTeam, updateTeam, updateSettings, replacePool, assertHost, idEq,
};
