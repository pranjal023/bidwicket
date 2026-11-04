/** Shared constants. Money is always in Crore (Cr), virtual currency only. */

const AUCTION_STATES = ['lobby', 'player_live', 'sold', 'unsold', 'completed'];
const ROLES = ['WK', 'BAT', 'BOWL', 'AR'];
/** AR (all-rounder) is a flexible extra and does NOT satisfy any required role. */
const REQUIRED_ROLES = ['WK', 'BAT', 'BOWL'];
const NATIONALITIES = ['IND', 'AUS', 'ENG',"SA"];
const PLAYER_STATUSES = ['pending', 'live', 'sold', 'unsold'];

const ROLE_LABELS = { WK: 'Wicketkeeper', BAT: 'Batter', BOWL: 'Bowler', AR: 'All-rounder' };

/** Fixed rules from the brief. Only the booleans / delays are host-configurable. */
const DEFAULT_SETTINGS = {
  squadSize: 5,
  purse: 30,
  increment: 0.25,
  timerSeconds: 15,
  antiSnipeSeconds: 5,
  minSlotPrice: 0.5,
  publicSquads: true,
  autoAdvance: true,
  autoAdvanceMs: 5000,
  botsEnabled: true,
  maxBots: 3,
  orderMode: 'marquee', 
};

const DEFAULT_TEAMS = [
  { name: 'RCB', color: '#98140a', emoji: '🦅' },
  { name: 'Gujrat Titans', color: '#1e0955', emoji: '⚡' },
  { name: 'Mumbai Indians', color: '#0d7ae8', emoji: '🐍' },
  { name: 'Indore United', color: '#08b263', emoji: '👑' },
  { name: 'Real Madrid', color: '#e2ededfd', emoji: '🌪️' },
];

const BOT_PERSONALITIES = [
  { key: 'cautious', aggression: 1.05 },
  { key: 'balanced', aggression: 1.2 },
  { key: 'aggressive', aggression: 1.8 },
];


const BOT_MAX_BID = 15;


const MARQUEE_SIZE = 6;
const CHAT_MAX_LEN = 200;
const CHAT_INTERVAL_MS = 1200; // 1 message / 1.2s / user

const REACTIONS = ['fire', 'clap', 'laugh', 'shocked'];

module.exports = {
  AUCTION_STATES, ROLES, REQUIRED_ROLES, NATIONALITIES, PLAYER_STATUSES,
  ROLE_LABELS, DEFAULT_SETTINGS, DEFAULT_TEAMS, BOT_PERSONALITIES, BOT_MAX_BID, MARQUEE_SIZE, CHAT_MAX_LEN, CHAT_INTERVAL_MS, REACTIONS,
};
