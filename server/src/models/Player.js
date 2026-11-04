const mongoose = require('mongoose');
const { ROLES, NATIONALITIES, PLAYER_STATUSES } = require('../constants');

const { Schema } = mongoose;


const playerSchema = new Schema(
  {
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction', default: null, index: true },
    catalogId: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    name: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    nationality: { type: String, enum: NATIONALITIES, required: true },
    rating: { type: Number, required: true, min: 1, max: 100 },
    basePrice: { type: Number, required: true, min: 0.25 },
    status: { type: String, enum: PLAYER_STATUSES, default: 'pending' },
    ownerTeamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    soldPrice: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Player', playerSchema);
