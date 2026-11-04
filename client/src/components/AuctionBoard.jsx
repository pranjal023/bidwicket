import { Trophy, SkipForward, Square, Pause, Play } from 'lucide-react';
import PlayerCard from './PlayerCard';
import TimerRing from './TimerRing';
import BidTicker from './BidTicker';
import TeamStrip from './TeamStrip';
import BidPanel from './BidPanel';
import SoldOverlay from './SoldOverlay';
import { fmtCr } from '../lib/format';


export default function AuctionBoard({ room, big = false }) {
  const { snap, ticker, soldInfo, extendedAt, offsetRef, bidState, sending, placeBid, next, stop, pause, resume, me } = room;
  const { auction, player, teams } = snap;
  const live = auction.state === 'player_live';
  const between = auction.state === 'sold' || auction.state === 'unsold';
  const leader = teams.find((t) => String(t.id) === String(auction.currentTeamId));
  const paused = !!auction.paused;
  const inMarquee = auction.marqueeCount > 0 && auction.lotNumber <= auction.marqueeCount;
  const flash = soldInfo?.fresh && soldInfo.result.outcome === 'sold';

  return (
    <div className={`space-y-4 ${big ? 'space-y-8' : ''}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${big ? 'text-3xl' : 'text-sm'}`}>
        <span className="flex items-center gap-2 font-bold text-slate-300">
          {inMarquee && <span className="rounded-full bg-amber-400 px-3 py-0.5 font-black uppercase text-slate-950">⭐ Marquee set {auction.lotNumber}/{auction.marqueeCount}</span>}
          <span>Lot {Math.min(auction.lotNumber, auction.lotsTotal)} / {auction.lotsTotal}</span>
        </span>
        {auction.highestSale && (
          <span className="flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 font-bold text-amber-300">
            <Trophy size={big ? 30 : 14} /> Record: {auction.highestSale.playerName} {fmtCr(auction.highestSale.amount)} ({auction.highestSale.teamName})
          </span>
        )}
      </div>

      {paused && (
        <div className={`rounded-xl border border-amber-500 bg-amber-500/15 px-4 py-2 text-center font-bold text-amber-200 ${big ? 'py-4 text-4xl' : ''}`}>
          ⏸ Auction paused by the auctioneer. Bidding is frozen.
        </div>
      )}

      <div className={`grid gap-4 ${big ? 'grid-cols-[1.3fr_1fr_0.9fr] gap-8' : 'md:grid-cols-[1.2fr_1fr]'}`}>
        <div className="relative">
          <PlayerCard player={player} big={big} flash={flash} />
          <SoldOverlay soldInfo={between ? soldInfo : null} big={big} />
        </div>

        <div className={`card flex flex-col items-center justify-center gap-3 p-5 ${big ? 'p-8' : ''}`}>
          {live ? (
            <TimerRing timerEndsAt={auction.timerEndsAt} offsetRef={offsetRef} totalSeconds={auction.settings.timerSeconds} extendedAt={extendedAt} size={big ? 300 : 170} frozenMs={paused ? auction.pausedRemainingMs : null} />
          ) : (
            <div className={`font-bold text-slate-400 ${big ? 'text-4xl' : 'text-lg'}`}>{between ? (paused ? 'Paused' : 'Next player shortly…') : ''}</div>
          )}
          <div className="text-center">
            <div className={`uppercase tracking-wide text-slate-400 ${big ? 'text-2xl' : 'text-xs'}`}>{auction.currentBid > 0 ? 'Current bid' : 'Opening price'}</div>
            <div key={auction.currentBid} className={`animate-bump font-black tabular-nums ${big ? 'text-8xl' : 'text-5xl'}`}>
              {fmtCr(auction.currentBid > 0 ? auction.currentBid : player?.basePrice)}
            </div>
            <div className={`mt-1 font-bold ${big ? 'text-4xl' : 'text-base'}`} style={{ color: leader?.color }}>
              {live && (leader ? `${leader.emoji} ${leader.name}` : 'No bids yet')}
            </div>
          </div>
        </div>

        {big && <BidTicker bids={ticker} teams={teams} big />}
      </div>

      {!big && (
        <div className="grid gap-4 md:grid-cols-2">
          <BidPanel bidState={bidState} sending={sending} onBid={placeBid} isTeam={!!me?.teamId} />
          <BidTicker bids={ticker} teams={teams} />
        </div>
      )}

      {!big && me?.isHost && (live || between) && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400" onClick={paused ? resume : pause}>
            {paused ? <Play size={18} /> : <Pause size={18} />} {paused ? 'Resume' : 'Pause'}
          </button>
          {between && (
            <button type="button" className="btn-ghost flex-1" disabled={paused} onClick={next}><SkipForward size={18} /> Next player now</button>
          )}
          <button
            type="button"
            className="btn flex-1 bg-rose-600 text-white hover:bg-rose-500"
            onClick={() => { if (window.confirm('Stop the auction now? Sold players stay sold; any open bid is discarded.')) stop(); }}
          >
            <Square size={18} /> Stop auction
          </button>
        </div>
      )}

      <TeamStrip teams={teams} leadingId={live ? auction.currentTeamId : null} myTeamId={me?.teamId} big={big} />
    </div>
  );
}
