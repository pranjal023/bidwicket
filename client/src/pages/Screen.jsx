import { useParams } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';
import AuctionBoard from '../components/AuctionBoard';
import Toast from '../components/Toast';
import SoundToggle from '../components/SoundToggle';
import { ReactionLayer } from '../components/Reactions';
import { fmtCr } from '../lib/format';


export default function Screen() {
  const code = useParams().code.toUpperCase();
  const room = useRoom(code, { screen: true });
  const { snap, teams } = room;

  if (!snap) return <div className="flex min-h-screen items-center justify-center text-4xl text-slate-400">{room.error ? 'Room not found' : 'Connecting…'}</div>;
  const { auction } = snap;
  const joinUrl = `${window.location.host}/room/${code}`;

  return (
    <div className="min-h-screen p-8">
      <Toast toast={room.toast} onDismiss={room.dismissToast} />
      <ReactionLayer reactions={room.reactions} big />
      <div className="fixed right-4 top-4 z-30 opacity-60 hover:opacity-100"><SoundToggle big /></div>

      {auction.state === 'lobby' && (
        <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 text-center">
          <div className="text-4xl text-slate-400">Join at <span className="font-bold text-white">{joinUrl}</span></div>
          <div className="text-[10rem] font-black leading-none tracking-[0.25em] text-emerald-400">{code}</div>
          <div className="flex flex-wrap justify-center gap-4">
            {teams.map((t) => (
              <div key={t.id} className={`rounded-2xl px-6 py-4 text-3xl font-bold ${t.claimed ? 'text-white' : 'bg-slate-800 text-slate-500'}`} style={t.claimed ? { background: t.color } : undefined}>
                {t.emoji} {t.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {(auction.state === 'player_live' || auction.state === 'sold' || auction.state === 'unsold') && <AuctionBoard room={room} big />}

      {auction.state === 'completed' && (
        <div className="space-y-8 text-center">
          <h1 className="text-7xl font-black">🏆 Auction complete</h1>
          <div className="grid grid-cols-5 gap-6">
            {teams.map((t) => (
              <div key={t.id} className="card p-6 text-left" style={{ borderColor: t.color }}>
                <div className="text-3xl font-bold">{t.emoji} {t.name}</div>
                <div className="mt-2 text-2xl text-slate-400">{t.squadCount}/5 players · {fmtCr(t.purse)} left</div>
                <ul className="mt-4 space-y-1 text-2xl">{t.squad?.map((p) => <li key={p.playerId}>{p.name} <span className="text-slate-400">{fmtCr(p.price)}</span></li>)}</ul>
              </div>
            ))}
          </div>
          {auction.highestSale && <div className="text-4xl text-amber-300">Record sale: {auction.highestSale.playerName} for {fmtCr(auction.highestSale.amount)} ({auction.highestSale.teamName})</div>}
        </div>
      )}
    </div>
  );
}
