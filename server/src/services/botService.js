
const crypto = require('crypto');
const { Team, Player } = require('../models');

const BOT_MAX_BID = require('../constants').BOT_MAX_BID ?? 9;
const { bus } = require('../utils/events');
const { randBetween, round2, idEq } = require('../utils/helpers');
const { checkBidEligibility, missingRoles, slotsLeft } = require('../rules/squadRules');
const { nextBidAmount } = require('../rules/bidRules');
const { placeBid } = require('./biddingService');

const pending = new Map(); 

function clearAuctionTimers(auctionId) {
  for (const [key, t] of pending) {
    if (key.startsWith(`${auctionId}:`)) { clearTimeout(t); pending.delete(key); }
  }
}


function jitter(teamId, playerId) {
  const n = parseInt(String(teamId).slice(-4), 16) ^ parseInt(String(playerId).slice(-4), 16);
  return 0.9 + (n % 21) / 100;
}


function taste(teamId, playerId) {
  const n = parseInt(String(teamId).slice(-6), 16) * 31 + parseInt(String(playerId).slice(-6), 16);
  return Math.abs(n) % 100;
}


function botWantsPlayer(team, player, auction) {
  const { settings } = auction;
  const left = slotsLeft(team.squad, settings.squadSize);
  const lotsRemaining = Math.max(0, auction.playerQueue.length - auction.queueIndex) + 1;
  const missing = missingRoles(team.squad);

  if (missing.length >= left) return missing.includes(player.role); 
  if (left * 1.5 >= lotsRemaining) return true; 
  let interest = 35 + (player.rating - 75) * 2; 
  if (missing.includes(player.role)) interest += 25;
  return taste(team._id, player._id) < interest;
}

function botMaxPrice(team, player, settings) {
  const aggression = team.botConfig.aggression;
  const left = Math.max(1, slotsLeft(team.squad, settings.squadSize));
  const missing = missingRoles(team.squad);
  const needsRole = missing.includes(player.role);

  const fair = player.basePrice + Math.max(0, player.rating - 75) * 0.20; 
  let value = fair * aggression * jitter(team._id, player._id);
  if (needsRole) value *= 1.3; 
  if (missing.length >= left) value *= 1.6; 

  const perSlot = (team.purse - (left - 1) * settings.minSlotPrice) / left; 
  let paceCap = perSlot * aggression * 1.3;
  if (needsRole) paceCap *= 1.4;

  value = Math.min(value, paceCap, BOT_MAX_BID);
  return Math.floor(value / settings.increment) * settings.increment;
}

async function scheduleBots(auction) {
  if (auction.state !== 'player_live' || auction.paused) return;
  const [bots, player] = await Promise.all([
    Team.find({ auctionId: auction._id, isBot: true }),
    Player.findById(auction.currentPlayerId),
  ]);
  if (!player) return;
  const next = nextBidAmount(auction.currentBid, player.basePrice, auction.settings.increment);

  for (const bot of bots) {
    const key = `${auction._id}:${bot._id}`;
    clearTimeout(pending.get(key)); 
    pending.delete(key);
    if (idEq(auction.currentTeamId, bot._id)) continue; 
    if (!checkBidEligibility(bot, player, next, auction.settings).allowed) continue;
    if (!botWantsPlayer(bot, player, auction)) continue; 
    if (next > BOT_MAX_BID) continue; 
    const max = botMaxPrice(bot, player, auction.settings);
    if (!(next <= max)) continue; 

    const delay = randBetween(bot.botConfig.minDelayMs, bot.botConfig.maxDelayMs);
    pending.set(
      key,
      setTimeout(async () => {
        pending.delete(key);
        try {
          await placeBid({ auctionId: auction._id, teamId: bot._id, amount: round2(next), clientBidId: crypto.randomUUID(), source: 'bot' });
        } catch (_e) { /* stale / outbid / closed */ }
      }, delay)
    );
  }
}

function initBots() {
  bus.on('lot:started', ({ auction }) => scheduleBots(auction).catch((e) => console.error('[bots]', e)));
  bus.on('bid:accepted', ({ auction }) => scheduleBots(auction).catch((e) => console.error('[bots]', e)));
  bus.on('auction:paused', ({ auction }) => clearAuctionTimers(auction._id));
  bus.on('auction:resumed', ({ auction }) => scheduleBots(auction).catch((e) => console.error('[bots]', e)));
  bus.on('lot:closed', ({ auction }) => clearAuctionTimers(auction._id));
  bus.on('auction:completed', ({ auction }) => clearAuctionTimers(auction._id));
}

module.exports = { initBots, botMaxPrice, botWantsPlayer, clearAuctionTimers };
