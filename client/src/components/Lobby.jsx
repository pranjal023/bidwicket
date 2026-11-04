import { useState } from 'react';
import { Bot, Copy, Download, Monitor, Pencil, Play, Upload, Users } from 'lucide-react';
import TeamForm from './TeamForm';
import { api } from '../lib/api';
import { loadIdentity, saveIdentity } from '../lib/storage';


export default function Lobby({ room, code }) {
  const { snap, me, teams } = room;
  const { settings, poolSize } = snap.auction;
  const [editing, setEditing] = useState(null); 
  const [msg, setMsg] = useState(null);
  const ident = loadIdentity(code);
  const link = `${window.location.origin}/room/${code}`;
  const hasTeam = !!me.teamId;
  const claimed = teams.filter((t) => t.claimed).length;

  const flash = (text, tone = 'info') => { setMsg({ text, tone }); setTimeout(() => setMsg(null), 4500); };
  const guard = async (fn) => { try { await fn(); } catch (e) { flash(e.message, 'error'); } };

  const claim = (team) => (vals) => guard(async () => {
    const res = await api.claimTeam(code, team.id, vals);
    saveIdentity(code, { teamToken: res.teamToken, teamId: res.teamId });
    setEditing(null);
    room.rejoin(); 
  });
  const edit = (team) => (vals) => guard(async () => { await api.updateTeam(code, team.id, vals, ident); setEditing(null); });
  const setting = (patch) => guard(() => api.updateSettings(code, patch, ident));

  const upload = (file) => guard(async () => {
    if (!file) return;
    const text = await file.text();
    const format = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
    const res = await api.uploadPool(code, { format, data: format === 'json' ? JSON.parse(text) : text }, ident);
    flash(`Pool replaced: ${res.count} players.${res.warnings.length ? ' Warning: ' + res.warnings.join('; ') : ''}`, res.warnings.length ? 'warn' : 'info');
  });

  return (
    <div className="space-y-5">
      <div className="card flex flex-col items-center gap-3 p-6 text-center">
        <div className="text-sm uppercase tracking-widest text-slate-400">Room code</div>
        <div className="text-6xl font-black tracking-[0.3em] text-emerald-400">{code}</div>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn-ghost" onClick={() => { navigator.clipboard?.writeText(link); flash('Invite link copied'); }}><Copy size={16} /> Copy invite link</button>
          <a className="btn-ghost" href={`/room/${code}/screen`} target="_blank" rel="noreferrer"><Monitor size={16} /> Open big screen</a>
        </div>
      </div>

      {msg && <div className={`rounded-xl border px-4 py-2 text-sm ${msg.tone === 'error' ? 'border-rose-500 bg-rose-500/10 text-rose-200' : msg.tone === 'warn' ? 'border-amber-500 bg-amber-500/10 text-amber-200' : 'border-slate-700 bg-slate-800'}`}>{msg.text}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => {
          const mine = String(t.id) === String(me.teamId);
          const canEdit = mine || me.isHost;
          return (
            <div key={t.id} className="card p-4" style={{ borderColor: mine ? t.color : undefined }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-bold"><span className="h-3 w-3 rounded-full" style={{ background: t.color }} />{t.emoji} {t.name}</div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.claimed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{mine ? 'YOU' : t.claimed ? 'Taken' : 'Open'}</span>
              </div>
              {editing === t.id ? (
                <TeamForm initial={t} submitLabel={t.claimed ? 'Save' : 'Join as this team'} onSubmit={t.claimed ? edit(t) : claim(t)} onCancel={() => setEditing(null)} />
              ) : (
                <div className="mt-3 flex gap-2">
                  {!t.claimed && !hasTeam && <button className="btn-primary flex-1" onClick={() => setEditing(t.id)}>Join as this team</button>}
                  {canEdit && t.claimed && <button className="btn-ghost" onClick={() => setEditing(t.id)}><Pencil size={14} /> Edit</button>}
                  {!t.claimed && me.isHost && <button className="btn-ghost" onClick={() => setEditing(`rename-${t.id}`)}><Pencil size={14} /> Rename</button>}
                </div>
              )}
              {editing === `rename-${t.id}` && <TeamForm initial={t} submitLabel="Save" onSubmit={edit(t)} onCancel={() => setEditing(null)} />}
            </div>
          );
        })}
      </div>

      {me.isHost ? (
        <div className="card space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Users size={18} /> Auctioneer controls</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[['publicSquads', 'Squads visible to everyone'], ['autoAdvance', 'Auto-advance to next player'], ['botsEnabled', 'Fill empty seats with bots (max 3)']].map(([k, label]) => (
              <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-800 p-3 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-emerald-500" checked={!!settings[k]} onChange={(e) => setting({ [k]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-3 rounded-xl bg-slate-800 p-3 text-sm">
            <span className="shrink-0 font-semibold">Player order</span>
            <select className="input py-1.5" value={settings.orderMode || 'marquee'} onChange={(e) => setting({ orderMode: e.target.value })}>
              <option value="marquee">⭐ Marquee set first (top 6), then random</option>
              <option value="random">Fully random</option>
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="btn-ghost cursor-pointer"><Upload size={16} /> Replace player pool (CSV/JSON)
              <input type="file" accept=".csv,.json" className="hidden" onChange={(e) => { upload(e.target.files[0]); e.target.value = ''; }} />
            </label>
            <a className="text-emerald-400 underline" href="/sample-players.csv" download><Download size={14} className="mr-1 inline" />sample.csv</a>
            <span className="text-slate-400">{poolSize} players in pool</span>
          </div>
          <button className="btn-primary w-full py-3 text-lg" disabled={claimed === 0 && !settings.botsEnabled} onClick={room.start}>
            <Play size={20} /> Start auction
          </button>
          <p className="flex items-center gap-2 text-xs text-slate-400"><Bot size={14} /> {claimed} human team(s) joined. Empty seats become bots at start{settings.botsEnabled ? '' : ' (bots are off: empty seats are removed)'}.</p>
        </div>
      ) : (
        <div className="card p-5 text-center text-slate-300">Waiting for the auctioneer to start… {hasTeam ? 'You are in!' : 'Pick an open team above to join, or just watch.'}</div>
      )}
    </div>
  );
}
