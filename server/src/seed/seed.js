
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDb } = require('../config/db');
const { Player } = require('../models');
const { parsePool } = require('../utils/poolParser');

function loadSeedPlayers() {
  const csv = fs.readFileSync(path.join(__dirname, 'players.csv'), 'utf8');
  const { players, errors } = parsePool({ format: 'csv', data: csv });
  if (errors.length) throw new Error(`Seed data invalid:\n${errors.join('\n')}`);
  return players;
}

async function run() {
  await connectDb(env.MONGODB_URI);
  const players = loadSeedPlayers();
  await Player.deleteMany({ auctionId: null });
  await Player.insertMany(players.map((p) => ({ ...p, auctionId: null, status: 'pending' })));
  console.log(`Seeded ${players.length} catalogue players.`);
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { loadSeedPlayers };
