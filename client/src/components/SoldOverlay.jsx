import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy } from 'lucide-react';
import { fmtCr } from '../lib/format';


 
export default function SoldOverlay({ soldInfo, big = false }) {
  const r = soldInfo?.result;

  useEffect(() => {
    if (!soldInfo?.fresh || r?.outcome !== 'sold') return undefined;
    const colors = [r.teamColor, '#ffffff', '#fbbf24'];
    const count = r.isRecord ? 220 : 120;
    confetti({ particleCount: count, spread: 80, origin: { y: 0.6 }, colors });
    const t1 = setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250);
    const t2 = setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [soldInfo?.key]); 

  if (!r) return null;
  const sold = r.outcome === 'sold';
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-950/75 p-4 text-center backdrop-blur-sm">
      <div key={soldInfo.key} className="flex animate-bannerIn flex-col items-center gap-3">
        {sold ? (
          <>
            <div className={`font-black uppercase tracking-widest text-white/80 ${big ? 'text-5xl' : 'text-2xl'}`}>Sold!</div>
            <div className={`rounded-2xl px-6 py-3 font-black text-white shadow-2xl ${big ? 'text-6xl' : 'text-2xl sm:text-3xl'}`} style={{ background: r.teamColor }}>
              {r.teamEmoji} {r.teamName}
            </div>
            <div className={`font-extrabold ${big ? 'text-7xl' : 'text-4xl'}`}>for {fmtCr(r.amount)}</div>
            {r.isRecord && (
              <div className={`flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 font-black uppercase text-slate-950 ${big ? 'text-3xl' : 'text-sm'}`}>
                <Trophy size={big ? 32 : 16} /> Highest sale so far!
              </div>
            )}
          </>
        ) : (
          <div className={`font-black uppercase tracking-widest text-slate-300 ${big ? 'text-7xl' : 'text-4xl'}`}>Unsold</div>
        )}
      </div>
    </div>
  );
}
