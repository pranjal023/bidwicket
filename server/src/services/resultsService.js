
const { Auction, Team, Player } = require('../models');
const { AppError } = require('../utils/errors');
const { round2 } = require('../utils/helpers');
const { evaluateSquad, roleCounts } = require('../rules/squadRules');

async function buildResults(roomCode) {
  const auction = await Auction.findOne({ roomCode }).lean();
  if (!auction) throw new AppError('ROOM_NOT_FOUND', 'Room not found', 404);
  const [teams, players] = await Promise.all([
    Team.find({ auctionId: auction._id }).sort({ slot: 1 }).lean(),
    Player.find({ auctionId: auction._id }).lean(),
  ]);
  const { settings } = auction;
  const completed = auction.state === 'completed';

  const teamRows = teams.map((t) => {
    const verdict = evaluateSquad(t.squad, settings);
    const spent = round2(t.squad.reduce((s, p) => s + p.price, 0));
    return {
      id: t._id, name: t.name, color: t.color, emoji: t.emoji, isBot: t.isBot,
      squad: t.squad, spent, purseLeft: round2(t.purse), roleCounts: roleCounts(t.squad),
      complete: verdict.complete, flags: verdict.flags,
    };
  });

  return {
    roomCode: auction.roomCode,
    state: auction.state,
    completed,
    settings,
    highestSale: auction.highestSale,
    totals: {
      sold: players.filter((p) => p.status === 'sold').length,
      unsold: players.filter((p) => p.status === 'unsold').length,
      unreached: players.filter((p) => p.status === 'pending' || p.status === 'live').length,
      pool: players.length,
    },
    teams: teamRows,
    unsold: players.filter((p) => p.status === 'unsold').map((p) => ({ name: p.name, role: p.role, rating: p.rating, basePrice: p.basePrice })),
  };
}

module.exports = { buildResults };
