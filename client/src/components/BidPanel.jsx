import { Gavel } from 'lucide-react';
import { fmtCr } from '../lib/format';


export default function BidPanel({ bidState, sending, onBid, isTeam }) {
  if (!isTeam) return <div className="card p-4 text-center text-slate-400">You are watching. Pick a team in the lobby to bid.</div>;
  const can = bidState?.canBid && !sending;
  return (
    <div className="card p-4">
      <button type="button" onClick={onBid} disabled={!can}
        className={`btn w-full py-5 text-2xl ${can ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
        <Gavel size={26} />
        {bidState?.nextBid != null && bidState.canBid ? `Bid + ${fmtCr(bidState.nextBid)}` : 'Bid +'}
      </button>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className={bidState?.canBid ? 'text-emerald-300' : 'font-semibold text-amber-300'}>{bidState?.canBid ? 'You can bid' : bidState?.reason}</span>
        {bidState?.maxBid != null && <span className="text-slate-400">Max you can bid: {fmtCr(bidState.maxBid)}</span>}
      </div>
    </div>
  );
}
