
require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/bidwicket'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  SERVE_CLIENT: z.enum(['true', 'false']).default('false'),

  DEV_TIMER_SECONDS: z.coerce.number().int().min(3).max(60).optional(),
  DEV_AUTO_ADVANCE_MS: z.coerce.number().int().min(200).max(30000).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = {
  ...parsed.data,
  CLIENT_ORIGINS: parsed.data.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  SERVE_CLIENT: parsed.data.SERVE_CLIENT === 'true',
};
