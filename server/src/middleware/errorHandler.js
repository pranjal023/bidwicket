const { AppError } = require('../utils/errors');


function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
  }
  console.error('[unhandled]', err);
  return res.status(500).json({ ok: false, error: { code: 'INTERNAL', message: 'Something went wrong' } });
}

function notFound(_req, res) {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

module.exports = { errorHandler, notFound };
