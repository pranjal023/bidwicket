
const { Auction, Team, Player, Bid } = require('../models');
const { AppError } = require('../utils/errors');
const { round2, idEq } = require('../utils/helpers');
const { roleCounts, missingRoles } = require('../rules/squadRules');
const { computeBidState } = require('../rules/bidRules');
const presence = require('./presence');

async function loadRoomState(roomCode) {
  const auction = await Auction.findOne({ roomCode }).lean();
  if (!auction) throw new AppError('ROOM_NOT_FOUND', 'Room not found', 404);
  const [teams, player, bids] = await Promise.all([
    Team.find({ auctionId: auction._id }).sort({ slot: 1 }).lean(),
    auction.currentPlayerId ? Player.findById(auction.currentPlayerId).lean() : null,
    auction.currentPlayerId
      ? Bid.find({ auctionId: auction._id, playerId: auction.currentPlayerId }).sort({ createdAt: -1 }).limit(8).lean()
      : [],
  ]);
  const poolSize = await Player.countDocuments({ auctionId: auction._id });
  return { auction, teams, player, bids, poolSize };
}


function viewFor(state, identity = {}) {
  const { auction, teams, player, bids, poolSize } = state;
  const { settings } = auction;
  const me = teams.find((t) => idEq(t._id, identity.teamId));

  return {
    serverNow: Date.now(),
    auction: {
      roomCode: auction.roomCode,
      state: auction.state,
      settings,
      currentBid: auction.currentBid,
      currentTeamId: auction.currentTeamId,
      timerEndsAt: auction.timerEndsAt ? new Date(auction.timerEndsAt).getTime() : null,
      highestSale: auction.highestSale,
      lastResult: auction.lastResult,
      lotNumber: auction.queueIndex,
      marqueeCount: auction.marqueeCount || 0,
      paused: !!auction.paused,
      pausedRemainingMs: auction.pausedRemainingMs || 0,
      lotsTotal: auction.playerQueue.length || poolSize,
      poolSize,
    },
    player: player && {
      id: player._id, name: player.name, role: player.role, nationality: player.nationality,
      rating: player.rating, basePrice: player.basePrice,
    },
    recentBids: bids.map((b) => ({ teamId: b.teamId, amount: b.amount, at: new Date(b.createdAt).getTime() })),
    teams: teams.map((t) => {
      const canSee = settings.publicSquads || identity.isHost || idEq(t._id, identity.teamId) || auction.state === 'completed';
      return {
        id: t._id, name: t.name, color: t.color, emoji: t.emoji, slot: t.slot,
        purse: round2(t.purse), squadCount: t.squad.length, claimed: t.claimed, isBot: t.isBot,
        botPersonality: t.isBot ? t.botConfig.personality : null,
        connected: t.isBot ? true : presence.isOnline(auction.roomCode, t._id),
        squad: canSee ? t.squad : null,
        roleCounts: canSee ? roleCounts(t.squad) : null,
        missingRoles: canSee ? missingRoles(t.squad) : null,
      };
    }),
    me: {
      isHost: !!identity.isHost,
      teamId: me ? me._id : null,
      bidState: computeBidState({ auction, team: me, player }),
    },
  };
}

module.exports = { loadRoomState, viewFor };
