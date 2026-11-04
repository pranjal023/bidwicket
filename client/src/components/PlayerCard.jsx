import { ROLE_META, fmtCr } from '../lib/format';


export default function PlayerCard({ player, big = false, flash = false }) {
  if (!player) {
    return <div className={`card flex items-center justify-center text-slate-500 ${big ? 'h-[28rem] text-3xl' : 'h-72'}`}>Waiting for the next player…</div>;
  }
  const meta = ROLE_META[player.role];
  const initials = player.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <div key={flash ? player.id + '-flash' : player.id} className={`card relative overflow-hidden p-5 ${flash ? 'animate-cardFlash' : ''} ${big ? 'p-8' : ''}`}>
      <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${meta.grad} opacity-20 blur-2xl`} />
      <div className="flex items-center gap-4">
        <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.grad} font-black text-white shadow-lg ${big ? 'h-32 w-32 text-5xl' : 'h-20 w-20 text-3xl'}`}>{initials}</div>
        <div className="min-w-0">
          <div className={`truncate font-extrabold ${big ? 'text-5xl' : 'text-2xl'}`}>{player.name}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-0.5 font-bold ${meta.cls} ${big ? 'text-xl' : 'text-xs'}`}>{meta.label}</span>
            <span className={`rounded-full border border-slate-700 bg-slate-800 px-3 py-0.5 font-bold ${big ? 'text-xl' : 'text-xs'}`}>{player.nationality}</span>
          </div>
        </div>
      </div>
      <div className={`mt-4 grid grid-cols-2 gap-3 ${big ? 'text-2xl' : 'text-sm'}`}>
        <div>
          <div className="text-slate-400">Rating</div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full bg-gradient-to-r ${meta.grad}`} style={{ width: `${player.rating}%` }} /></div>
          <div className="mt-1 font-bold">{player.rating}/100</div>
        </div>
        <div>
          <div className="text-slate-400">Base price</div>
          <div className="mt-1 font-extrabold">{fmtCr(player.basePrice)}</div>
        </div>
      </div>
    </div>
  );
}
