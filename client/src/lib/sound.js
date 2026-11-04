
import { useSyncExternalStore } from 'react';

let muted = true;
try { muted = localStorage.getItem('bidwicket:sound') !== 'on'; } catch { /* ignore */ }
const listeners = new Set();
let ctx = null;

const getCtx = () => {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
  if (ctx?.state === 'suspended') ctx.resume();
  return ctx;
};

function tone({ freq, dur = 0.12, type = 'sine', gain = 0.15, at = 0, slideTo }) {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + dur + 0.02);
}

function noise({ dur = 0.08, gain = 0.3, at = 0 }) {
  const c = getCtx(); if (!c) return;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource(); const g = c.createGain();
  src.buffer = buf; g.gain.value = gain; src.connect(g).connect(c.destination); src.start(c.currentTime + at);
}

const effects = {
  bid: () => tone({ freq: 660, dur: 0.09, type: 'triangle' }),
  outbid: () => tone({ freq: 360, slideTo: 180, dur: 0.22, type: 'sawtooth', gain: 0.1 }),
  extended: () => { tone({ freq: 900, dur: 0.07, type: 'square', gain: 0.07 }); tone({ freq: 1200, dur: 0.09, type: 'square', gain: 0.07, at: 0.09 }); },
  // Gavel: two wooden knocks = noise burst + low thump
  gavel: () => { [0, 0.22].forEach((at) => { noise({ at, dur: 0.06, gain: 0.5 }); tone({ freq: 140, slideTo: 60, dur: 0.18, type: 'sine', gain: 0.5, at }); }); },
  unsold: () => tone({ freq: 220, slideTo: 110, dur: 0.4, type: 'triangle', gain: 0.12 }),
  record: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', gain: 0.12, at: 0.35 + i * 0.1 })),
};

export const sound = {
  get muted() { return muted; },
  toggle() {
    muted = !muted;
    try { localStorage.setItem('bidwicket:sound', muted ? 'off' : 'on'); } catch { /* ignore */ }
    if (!muted) { getCtx(); effects.bid(); }
    listeners.forEach((l) => l());
  },
  play(name) { if (!muted && effects[name]) { try { effects[name](); } catch { /* audio blocked */ } } },
};

export const useMuted = () =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => muted);
