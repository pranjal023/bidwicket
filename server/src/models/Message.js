const mongoose = require('mongoose');

const { Schema } = mongoose;


const messageSchema = new Schema(
  {
    auctionId: { type: Schema.Types.ObjectId, ref: 'Auction', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    senderName: { type: String, required: true },
    emoji: { type: String, default: '' },
    color: { type: String, default: '#94a3b8' },
    isHost: { type: Boolean, default: false },
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ auctionId: 1, createdAt: 1 });
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 }); 

module.exports = mongoose.model('Message', messageSchema);
