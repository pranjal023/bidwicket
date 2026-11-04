import { Bot, WifiOff } from 'lucide-react';
import { fmtCr } from '../lib/format';


export default function TeamStrip({ teams, leadingId, myTeamId, big = false }) {
  return (
    <div className={`grid gap-2 ${big ? 'grid-cols-5 gap-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>
      {teams.map((t) => {
        const leading = String(t.id) === String(leadingId);
        const mine = String(t.id) === String(myTeamId);
        return (
          <div key={t.id} className={`card relative p-3 transition ${big ? 'p-5' : ''} ${leading ? 'ring-2' : ''}`} style={leading ? { '--tw-ring-color': t.color, boxShadow: `0 0 24px ${t.color}55` } : undefined}>
            <div className="flex items-center justify-between gap-1">
              <div className={`flex min-w-0 items-center gap-2 font-bold ${big ? 'text-2xl' : 'text-sm'}`}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.color }} />
                <span className="truncate">{t.emoji} {t.name}</span>
              </div>
              {t.isBot && <Bot size={big ? 26 : 14} className="shrink-0 text-slate-400" />}
              {!t.connected && !t.isBot && <WifiOff size={big ? 26 : 14} className="shrink-0 text-amber-400" />}
            </div>
            <div className={`mt-1 flex items-end justify-between ${big ? 'text-xl' : 'text-xs'}`}>
              <span className="text-slate-400">{t.squadCount}/5 players</span>
              {mine && <span className="rounded bg-emerald-500/20 px-1.5 font-bold text-emerald-300">YOU</span>}
              {leading && !mine && <span className="rounded bg-white/10 px-1.5 font-bold">LEADING</span>}
            </div>
            <div className={`font-extrabold tabular-nums ${big ? 'mt-2 text-4xl' : 'text-lg'}`}>{fmtCr(t.purse)}</div>
          </div>
        );
      })}
    </div>
  );
}
