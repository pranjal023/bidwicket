const mongoose = require('mongoose');
const { ROLES } = require('../constants');

const { Schema } = mongoose;

const squadEntrySchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
    name: String,
    role: { type: String, enum: ROLES },
    price: Number,
  },
  { _id: false }
);

const botConfigSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    personality: { type: String, default: 'balanced' },
    aggression: { type: Number, default: 1 }, 
    minDelayMs: { type: Number, default: 700 },
    maxDelayMs: { type: Number, default: 2800 },
  },
  { _id: false }
);

const teamSchema = new Schema(
  {
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
    slot: { type: Number, required: true }, 
    name: { type: String, required: true },
    color: { type: String, required: true },
    emoji: { type: String, required: true },
    purse: { type: Number, required: true },
    squad: { type: [squadEntrySchema], default: [] },
    claimed: { type: Boolean, default: false }, 
    token: { type: String, default: null }, 
    isBot: { type: Boolean, default: false },
    botConfig: { type: botConfigSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);
