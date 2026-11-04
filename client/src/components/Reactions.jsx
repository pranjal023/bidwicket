import { useState } from 'react';
import { REACTION_EMOJI } from '../lib/format';


export function ReactionBar({ onReact }) {
  const [cool, setCool] = useState(false);
  const tap = (k) => {
    if (cool) return;
    onReact(k); setCool(true); setTimeout(() => setCool(false), 1000);
  };
  return (
    <div className="flex items-center justify-center gap-2">
      {Object.entries(REACTION_EMOJI).map(([k, e]) => (
        <button key={k} type="button" onClick={() => tap(k)} aria-label={`React ${k}`}
          className={`btn bg-slate-800 px-4 py-2 text-2xl hover:bg-slate-700 ${cool ? 'opacity-50' : ''}`}>{e}</button>
      ))}
    </div>
  );
}


export function ReactionLayer({ reactions, big = false }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {reactions.map((r) => (
        <span key={r.id} className={`absolute bottom-0 animate-floatUp ${big ? 'text-7xl' : 'text-4xl'}`} style={{ left: `${r.left}%` }}>{REACTION_EMOJI[r.emoji]}</span>
      ))}
    </div>
  );
}
