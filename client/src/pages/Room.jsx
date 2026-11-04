import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Monitor, Trophy, Wifi, WifiOff } from 'lucide-react';
import { useRoom } from '../hooks/useRoom';
import Lobby from '../components/Lobby';
import AuctionBoard from '../components/AuctionBoard';
import SquadView from '../components/SquadView';
import Toast from '../components/Toast';
import SoundToggle from '../components/SoundToggle';
import ChatBox from '../components/ChatBox';
import { ReactionBar, ReactionLayer } from '../components/Reactions';

export default function Room() {
  const code = useParams().code.toUpperCase();
  const room = useRoom(code);
  const { snap, status, error, me, teams } = room;
  const [tab, setTab] = useState('board');

  if (error?.code === 'ROOM_NOT_FOUND') {
    return <Centered>Room <b>{code}</b> was not found. <Link className="text-emerald-400 underline" to="/">Back home</Link></Centered>;
  }
  if (!snap) return <Centered>{status === 'offline' ? 'Cannot reach the server… retrying' : 'Connecting…'}</Centered>;

  const { auction } = snap;
  const myTeam = teams.find((t) => String(t.id) === String(me.teamId));
  const role = me.isHost ? 'Auctioneer' : myTeam ? 'Team' : 'Spectator';
  const showSquads = auction.settings.publicSquads || me.isHost || auction.state === 'completed';
  const tabs = [['board', 'Auction'], ...(myTeam ? [['mine', 'My Squad']] : []), ...(showSquads ? [['teams', 'All Squads']] : [])];

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 pb-28">
      <Toast toast={room.toast} onDismiss={room.dismissToast} />
      <ReactionLayer reactions={room.reactions} />

      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xl font-black">🏏 BidWicket</Link>
          <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono text-sm font-bold tracking-widest">{code}</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300">{role}</span>
          <span className={`flex items-center gap-1 text-xs ${status === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {status === 'online' ? <Wifi size={14} /> : <WifiOff size={14} />}{status === 'online' ? 'Live' : 'Reconnecting…'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <a className="btn-ghost px-3 py-1.5 text-sm" href={`/room/${code}/screen`} target="_blank" rel="noreferrer"><Monitor size={16} /> Big screen</a>
          <Link className="btn-ghost px-3 py-1.5 text-sm" to={`/room/${code}/results`}><Trophy size={16} /> Results</Link>
        </div>
      </header>

      {auction.state === 'lobby' ? (
        <Lobby room={room} code={code} />
      ) : (
        <>
          {auction.state === 'completed' && (
            <div className="card flex flex-wrap items-center justify-between gap-3 border-emerald-500 p-4">
              <span className="font-bold">🏆 The auction is complete!</span>
              <Link className="btn-primary" to={`/room/${code}/results`}>View results</Link>
            </div>
          )}
          <nav className="flex gap-2">
            {tabs.map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`btn px-4 py-1.5 text-sm ${tab === k ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>{label}</button>
            ))}
          </nav>
          {tab === 'board' && auction.state !== 'completed' && <AuctionBoard room={room} />}
          {tab === 'board' && auction.state === 'completed' && <p className="text-slate-400">Open the results page for the final squads.</p>}
          {tab === 'mine' && myTeam && <SquadView team={myTeam} size={auction.settings.squadSize} mine />}
          {tab === 'teams' && (
            <div className="grid gap-3 md:grid-cols-2">
              {teams.map((t) => <SquadView key={t.id} team={t} size={auction.settings.squadSize} mine={String(t.id) === String(me.teamId)} />)}
            </div>
          )}
        </>
      )}

      <ChatBox chat={room.chat} chatReady={room.chatReady} onSend={room.sendChat} canSend={me.isHost || !!me.teamId} myTeamId={me.teamId} />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/90 p-3 backdrop-blur">
        <ReactionBar onReact={room.react} />
      </div>
    </div>
  );
}

function Centered({ children }) {
  return <div className="flex min-h-screen items-center justify-center px-4 text-center text-lg text-slate-300">{children}</div>;
}
