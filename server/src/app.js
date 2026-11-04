const path = require('path');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const roomsRouter = require('./routes/rooms');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.use(cors({ origin: env.CLIENT_ORIGINS }));
  app.use(express.json({ limit: '600kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
  app.use('/api/rooms', roomsRouter);
  app.use('/api', notFound);

  if (env.SERVE_CLIENT) {
    const dist = path.join(__dirname, '../../client/dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'))); 
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
