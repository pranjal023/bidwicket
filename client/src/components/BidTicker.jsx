import { fmtCr } from '../lib/format';

export default function BidTicker({ bids, teams, big = false }) {
  const byId = Object.fromEntries(teams.map((t) => [String(t.id), t]));
  return (
    <div className={`card p-4 ${big ? 'text-2xl' : 'text-sm'}`}>
      <div className="mb-2 font-bold uppercase tracking-wide text-slate-400">Recent bids</div>
      {bids.length === 0 && <div className="text-slate-500">No bids yet</div>}
      <ul className="space-y-1.5">
        {bids.slice(0, big ? 6 : 5).map((b, i) => {
          const t = byId[String(b.teamId)];
          return (
            <li key={`${b.at}-${i}`} className={`flex items-center justify-between gap-2 ${i === 0 ? 'font-bold' : 'text-slate-300'}`}>
              <span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t?.color }} />{t?.emoji} {t?.name}</span>
              <span className="tabular-nums">{fmtCr(b.amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
