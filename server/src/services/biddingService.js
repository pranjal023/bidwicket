
const { Auction, Team, Player, Bid } = require('../models');
const { AppError } = require('../utils/errors');
const { bus } = require('../utils/events');
const { checkBidEligibility } = require('../rules/squadRules');
const { nextBidAmount } = require('../rules/bidRules');
const { round2 } = require('../utils/helpers');
const BOT_MAX_BID = require('../constants').BOT_MAX_BID ?? 9;

const DUPLICATE_KEY = 11000;

function duplicateResult(existing) {
  return { ok: true, duplicate: true, bid: { teamId: existing.teamId, amount: existing.amount } };
}

/**
 * @param {{auctionId, teamId, amount:number, clientBidId:string, source?:'human'|'bot'}} p
 * @throws {AppError} with a code the UI can show verbatim
 */
async function placeBid({ auctionId, teamId, amount, clientBidId, source = 'human' }) {
  amount = round2(amount);

 
  if (source === 'bot' && amount > BOT_MAX_BID) throw new AppError('BOT_CAP', `Bots cannot bid above ${BOT_MAX_BID} Cr`, 403);

  
  if (clientBidId) {
    const prior = await Bid.findOne({ teamId, clientBidId }).lean();
    if (prior) return duplicateResult(prior);
  }

  
  const [auction, team] = await Promise.all([Auction.findById(auctionId), Team.findOne({ _id: teamId, auctionId })]);
  if (!auction) throw new AppError('ROOM_NOT_FOUND', 'Room not found', 404);
  if (!team) throw new AppError('NO_TEAM', 'You are not a team in this auction', 403);
  if (auction.state !== 'player_live') throw new AppError('NOT_LIVE', 'No player is up for bidding right now', 409);

  if (auction.paused) throw new AppError('PAUSED', 'The auction is paused', 409);
  const now = new Date();
  if (auction.timerEndsAt <= now) throw new AppError('TIMER_EXPIRED', 'Bidding for this player has closed', 409);
  if (String(auction.currentTeamId) === String(teamId)) throw new AppError('ALREADY_LEADING', 'You already have the highest bid', 409);

  const player = await Player.findById(auction.currentPlayerId);
  const expected = nextBidAmount(auction.currentBid, player.basePrice, auction.settings.increment);
  if (amount <= auction.currentBid) throw new AppError('STALE_BID', `Outbid! Current bid is already ${auction.currentBid} Cr`, 409);
  if (amount !== expected) throw new AppError('BAD_AMOUNT', `Bid must be exactly ${expected} Cr`, 400);

  const verdict = checkBidEligibility(team, player, amount, auction.settings);
  if (!verdict.allowed) throw new AppError(verdict.code, verdict.reason, 403);

  
  const antiSnipeUntil = new Date(now.getTime() + auction.settings.antiSnipeSeconds * 1000);
  const updated = await Auction.findOneAndUpdate(
    {
      _id: auctionId,
      state: 'player_live',
      paused: { $ne: true }, 
      currentBid: { $lt: amount },
      timerEndsAt: { $gt: now },
      currentTeamId: { $ne: teamId },
    },
    {
      $set: { currentBid: amount, currentTeamId: teamId },
      $max: { timerEndsAt: antiSnipeUntil }, 
    },
    { new: true }
  );

  if (!updated) {
    
    const prior = clientBidId && (await Bid.findOne({ teamId, clientBidId }).lean());
    if (prior) return duplicateResult(prior);
    throw new AppError('OUTBID', 'Someone else bid first - try again', 409);
  }

  const extended = updated.timerEndsAt.getTime() > auction.timerEndsAt.getTime();
  const previousLeaderId = auction.currentTeamId; 

  
  try {
    await Bid.create({ auctionId, playerId: player._id, teamId, amount, clientBidId, source });
  } catch (e) {
    if (e.code !== DUPLICATE_KEY) throw e;
  }

  bus.emit('bid:accepted', { auction: updated, player, team, amount, extended, previousLeaderId, source });
  return { ok: true, duplicate: false, bid: { teamId, amount }, extended };
}

module.exports = { placeBid };
