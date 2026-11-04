
const { checkBidEligibility, maxAffordableBid } = require('./squadRules');
const { round2 } = require('../utils/helpers');


function nextBidAmount(currentBid, basePrice, increment) {
  return currentBid > 0 ? round2(currentBid + increment) : round2(basePrice);
}


function computeBidState({ auction, team, player }) {
  const base = { canBid: false, reason: null, code: null, nextBid: null, maxBid: null, isLeading: false };
  if (!team) return { ...base, reason: 'Spectating', code: 'SPECTATOR' };
  if (auction.state !== 'player_live' || !player) {
    return { ...base, reason: 'Waiting for next player', code: 'NOT_LIVE' };
  }
  if (auction.paused) return { ...base, reason: 'Auction paused', code: 'PAUSED' };
  const { settings } = auction;
  const nextBid = nextBidAmount(auction.currentBid, player.basePrice, settings.increment);
  const maxBid = maxAffordableBid(team.purse, team.squad, settings);
  const isLeading = auction.currentTeamId != null && String(auction.currentTeamId) === String(team._id);
  if (isLeading) return { ...base, reason: 'You are leading', code: 'LEADING', nextBid, maxBid, isLeading };

  const verdict = checkBidEligibility(team, player, nextBid, settings);
  return { canBid: verdict.allowed, reason: verdict.reason, code: verdict.code, nextBid, maxBid, isLeading };
}

module.exports = { nextBidAmount, computeBidState };
