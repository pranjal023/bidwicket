import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Trophy } from 'lucide-react';
import { api } from '../lib/api';
import { ROLE_META, fmtCr } from '../lib/format';


export default function Results() {
  const code = useParams().code.toUpperCase();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stop = false; let timer;
    const load = async () => {
      try {
        const d = await api.results(code);
        if (stop) return;
        setData(d);
        if (!d.completed) timer = setTimeout(load, 5000); 
      } catch (e) { if (!stop) setError(e.message); }
    };
    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [code]);

  if (error) return <div className="flex min-h-screen items-center justify-center text-slate-300">{error} · <Link className="ml-2 text-emerald-400 underline" to="/">Home</Link></div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading results…</div>;

  const ranked = [...data.teams].sort((a, b) => b.spent - a.spent);
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-3 py-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-black">🏆 Results <span className="font-mono text-slate-400">{code}</span></h1>
        <Link className="btn-ghost" to={`/room/${code}`}>Back to room</Link>
      </header>

      {!data.completed && <div className="rounded-xl border border-amber-500 bg-amber-500/10 px-4 py-2 text-amber-200">Auction in progress ({data.state.replace('_', ' ')}). This page refreshes automatically.</div>}

      <div className="grid gap-3 sm:grid-cols-4">
        {[['Sold', data.totals.sold], ['Unsold', data.totals.unsold], ['Pool', data.totals.pool], ['Teams', data.teams.length]].map(([l, v]) => (
          <div key={l} className="card p-4 text-center"><div className="text-3xl font-black">{v}</div><div className="text-sm text-slate-400">{l}</div></div>
        ))}
      </div>
      {data.highestSale && (
        <div className="card flex items-center gap-3 border-amber-500/60 p-4"><Trophy className="text-amber-300" /> Highest sale: <b>{data.highestSale.playerName}</b> to {data.highestSale.teamName} for <b>{fmtCr(data.highestSale.amount)}</b></div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {ranked.map((t) => (
          <section key={t.id} className="card p-4" style={{ borderColor: t.color }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t.emoji} {t.name} {t.isBot && <span className="text-xs text-slate-400">(bot)</span>}</h2>
              <div className="text-right text-sm"><div>Spent <b>{fmtCr(t.spent)}</b></div><div className="text-slate-400">Left {fmtCr(t.purseLeft)}</div></div>
            </div>
            <div className={`mt-2 flex items-start gap-2 text-sm ${t.complete ? 'text-emerald-300' : 'text-amber-300'}`}>
              {t.complete ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
              {t.complete ? 'Legal, complete squad' : `Could not complete a legal squad: ${t.flags.join(', ')}`}
            </div>
            <ul className="mt-3 divide-y divide-slate-800">
              {t.squad.map((p) => (
                <li key={p.playerId} className="flex justify-between py-2 text-sm">
                  <span className="flex items-center gap-2"><span className={`rounded border px-1.5 text-[11px] font-bold ${ROLE_META[p.role].cls}`}>{p.role}</span>{p.name}</span>
                  <b className="tabular-nums">{fmtCr(p.price)}</b>
                </li>
              ))}
              {t.squad.length === 0 && <li className="py-2 text-sm text-slate-500">No players</li>}
            </ul>
          </section>
        ))}
      </div>

      {data.unsold.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-bold">Unsold ({data.unsold.length})</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {data.unsold.map((p) => <span key={p.name} className={`rounded-full border px-3 py-1 ${ROLE_META[p.role].cls}`}>{p.name} · {p.role}</span>)}
          </div>
        </section>
      )}
    </main>
  );
}
