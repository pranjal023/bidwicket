const mongoose = require('mongoose');

const { Schema } = mongoose;


const bidSchema = new Schema(
  {
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    amount: { type: Number, required: true },
    clientBidId: { type: String, required: true },
    source: { type: String, enum: ['human', 'bot'], default: 'human' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

bidSchema.index({ auctionId: 1, playerId: 1, createdAt: -1 });

bidSchema.index({ teamId: 1, clientBidId: 1 }, { unique: true });

module.exports = mongoose.model('Bid', bidSchema);
