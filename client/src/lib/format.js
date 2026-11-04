export const fmtCr = (n) => (n == null ? '-' : `${Number(n).toFixed(2).replace(/\.?0+$/, '')} Cr`);

export const ROLE_META = {
  WK: { label: 'Wicketkeeper', short: 'WK', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40', grad: 'from-amber-500 to-orange-600' },
  BAT: { label: 'Batter', short: 'BAT', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40', grad: 'from-sky-500 to-indigo-600' },
  BOWL: { label: 'Bowler', short: 'BOWL', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40', grad: 'from-rose-500 to-fuchsia-600' },
  AR: { label: 'All-rounder', short: 'AR', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', grad: 'from-emerald-500 to-teal-600' },
};

export const REACTION_EMOJI = { fire: '🔥', clap: '👏', laugh: '😂', shocked: '😮' };
export const TEAM_COLORS = ['#2563eb', '#f59e0b', '#16a34a', '#0891b2', '#9333ea', '#ef4444', '#ec4899', '#14b8a6'];
export const TEAM_EMOJIS = ['🦅', '⚡', '🐍', '👑', '🌪️', '🔥', '🐯', '🦈', '🚀', '🐉', '🦂', '🏏'];


export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
