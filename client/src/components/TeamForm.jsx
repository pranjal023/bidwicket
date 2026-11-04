import { useState } from 'react';
import { TEAM_COLORS, TEAM_EMOJIS } from '../lib/format';


export default function TeamForm({ initial, submitLabel, onSubmit, onCancel, nameOnly = false }) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [emoji, setEmoji] = useState(initial.emoji);
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length >= 2 && name.trim().length <= 24;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try { await onSubmit({ name: name.trim(), color, emoji }); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <input className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Team name" aria-label="Team name" />
      {!nameOnly && (
        <>
          <div className="flex flex-wrap gap-2">
            {TEAM_COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {TEAM_EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setEmoji(e)} className={`h-9 w-9 rounded-lg text-xl ${emoji === e ? 'bg-slate-600' : 'bg-slate-800'}`}>{e}</button>
            ))}
          </div>
        </>
      )}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={!valid || busy}>{submitLabel}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
