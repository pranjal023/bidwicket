
const http = require('http');
const mongoose = require('mongoose');
const env = require('./config/env');
const { connectDb } = require('./config/db');
const { createApp } = require('./app');
const { initSockets } = require('./sockets');
const { initEngine, resumeAll, stopAllTimers } = require('./services/auctionEngine');
const { initBots } = require('./services/botService');

async function main() {
  await connectDb(env.MONGODB_URI);
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); 

  const server = http.createServer(createApp());
  initSockets(server, env.CLIENT_ORIGINS); 
  initEngine();
  initBots();
  const resumed = await resumeAll();

  server.listen(env.PORT, () => console.log(`Auction server on :${env.PORT} (resumed ${resumed} active auctions)`));

  const shutdown = async () => {
    stopAllTimers();
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => { console.error(e); process.exit(1); });
