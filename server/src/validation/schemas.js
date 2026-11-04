
const { z } = require('zod');
const { REACTIONS, CHAT_MAX_LEN } = require('../constants');

const roomCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,8}$/, 'Invalid room code');
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a #RRGGBB hex');
const teamName = z.string().trim().min(2).max(24);
const emoji = z.string().trim().min(1).max(8);


const settingsPatch = z.object({
  publicSquads: z.boolean(),
  autoAdvance: z.boolean(),
  botsEnabled: z.boolean(),
  orderMode: z.enum(['marquee', 'random']),
}).partial().strict();

const rest = {
  createRoom: z.object({ settings: settingsPatch.optional() }).strict(),
  roomParams: z.object({ code: roomCode }),
  teamParams: z.object({ code: roomCode, teamId: objectId }),
  claimTeam: z.object({ name: teamName, color, emoji }).strict(),
  updateTeam: z.object({ name: teamName.optional(), color: color.optional(), emoji: emoji.optional() }).strict(),
  updateSettings: settingsPatch,
  uploadPool: z.object({
    format: z.enum(['csv', 'json']),
    data: z.union([z.string().max(500_000), z.array(z.any()).max(200)]),
  }).strict(),
};

// ---------- Socket events ----------
const socketEvents = {
  'room:join': z.object({
    roomCode,
    hostToken: z.string().max(100).optional(),
    teamToken: z.string().max(100).optional(),
    clientId: z.string().max(64).optional(),
  }).strict(),
  'auction:start': z.object({}).strict().optional().default({}),
  'auction:next': z.object({}).strict().optional().default({}),
  'auction:stop': z.object({}).strict().optional().default({}),
  'auction:pause': z.object({}).strict().optional().default({}),
  'auction:resume': z.object({}).strict().optional().default({}),
  'chat:send': z.object({ text: z.string().trim().min(1).max(CHAT_MAX_LEN) }).strict(),
  'bid:place': z.object({
    clientBidId: z.string().min(8).max(64),
    amount: z.number().positive().max(1000),
  }).strict(),
  'reaction:send': z.object({ emoji: z.enum(REACTIONS) }).strict(),
};

module.exports = { rest, socketEvents };
