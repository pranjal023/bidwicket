const mongoose = require('mongoose');
const { AUCTION_STATES, DEFAULT_SETTINGS } = require('../constants');

const { Schema } = mongoose;

const settingsSchema = new Schema(
  {
    squadSize: { type: Number, default: DEFAULT_SETTINGS.squadSize },
    purse: { type: Number, default: DEFAULT_SETTINGS.purse },
    increment: { type: Number, default: DEFAULT_SETTINGS.increment },
    timerSeconds: { type: Number, default: DEFAULT_SETTINGS.timerSeconds },
    antiSnipeSeconds: { type: Number, default: DEFAULT_SETTINGS.antiSnipeSeconds },
    minSlotPrice: { type: Number, default: DEFAULT_SETTINGS.minSlotPrice },
    publicSquads: { type: Boolean, default: DEFAULT_SETTINGS.publicSquads },
    autoAdvance: { type: Boolean, default: DEFAULT_SETTINGS.autoAdvance },
    autoAdvanceMs: { type: Number, default: DEFAULT_SETTINGS.autoAdvanceMs },
    botsEnabled: { type: Boolean, default: DEFAULT_SETTINGS.botsEnabled },
    maxBots: { type: Number, default: DEFAULT_SETTINGS.maxBots },
    orderMode: { type: String, enum: ['marquee', 'random'], default: DEFAULT_SETTINGS.orderMode },
  },
  { _id: false }
);

const highestSaleSchema = new Schema(
  { playerId: Schema.Types.ObjectId, playerName: String, teamId: Schema.Types.ObjectId, teamName: String, amount: Number },
  { _id: false }
);


const auctionSchema = new Schema(
  {
    roomCode: { type: String, required: true, unique: true, index: true },
    state: { type: String, enum: AUCTION_STATES, default: 'lobby', index: true },
    hostToken: { type: String, required: true }, 
    currentPlayerId: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    currentBid: { type: Number, default: 0 },
    currentTeamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    timerEndsAt: { type: Date, default: null },
    settings: { type: settingsSchema, default: () => ({}) },
    highestSale: { type: highestSaleSchema, default: null },
    
    playerQueue: { type: [Schema.Types.ObjectId], default: [] },
    queueIndex: { type: Number, default: 0 },
    marqueeCount: { type: Number, default: 0 }, 
  
    paused: { type: Boolean, default: false },
    pausedRemainingMs: { type: Number, default: 0 },
    startedAt: { type: Date, default: null }, 
   
    lastResult: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Auction', auctionSchema);
