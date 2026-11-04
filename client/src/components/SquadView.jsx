import { Check, AlertTriangle } from 'lucide-react';
import { ROLE_META, fmtCr } from '../lib/format';

const REQUIRED = ['WK', 'BAT', 'BOWL'];


export default function SquadView({ team, size = 5, mine = false }) {
  const slotsLeft = size - team.squadCount;
  return (
    <div className="card p-4" style={{ borderColor: mine ? team.color : undefined }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="h-3 w-3 rounded-full" style={{ background: team.color }} />{team.emoji} {team.name}
          {mine && <span className="rounded bg-emerald-500/20 px-1.5 text-xs text-emerald-300">YOU</span>}
        </div>
        <div className="text-right text-sm">
          <div className="font-extrabold">{fmtCr(team.purse)} left</div>
          <div className="text-slate-400">{team.squadCount}/{size} players</div>
        </div>
      </div>

      {team.squad == null ? (
        <p className="mt-3 text-sm text-slate-400">Squad hidden by the auctioneer.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {REQUIRED.map((r) => {
              const have = team.roleCounts[r] > 0;
              return (
                <span key={r} className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${have ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/50 bg-amber-500/10 text-amber-300'}`}>
                  {have ? <Check size={12} /> : <AlertTriangle size={12} />} {r} {team.roleCounts[r]}
                </span>
              );
            })}
            <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-xs font-bold text-slate-300">AR {team.roleCounts.AR}</span>
          </div>
          {team.missingRoles.length > 0 && slotsLeft > 0 && (
            <p className="mt-2 text-sm text-amber-300">Still need: {team.missingRoles.map((r) => ROLE_META[r].label).join(', ')} ({slotsLeft} slot{slotsLeft > 1 ? 's' : ''} left)</p>
          )}
          <ul className="mt-3 divide-y divide-slate-800">
            {team.squad.map((p) => (
              <li key={p.playerId} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2"><span className={`rounded border px-1.5 text-[11px] font-bold ${ROLE_META[p.role].cls}`}>{p.role}</span>{p.name}</span>
                <span className="font-bold tabular-nums">{fmtCr(p.price)}</span>
              </li>
            ))}
            {Array.from({ length: Math.max(0, slotsLeft) }).map((_, i) => (
              <li key={`e${i}`} className="py-2 text-sm text-slate-600">Empty slot</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
