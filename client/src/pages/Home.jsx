import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, LogIn, PlusCircle } from 'lucide-react';
import { api } from '../lib/api';
import { saveIdentity } from '../lib/storage';

export default function Home() {
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true); setError('');
    try {
      const res = await api.createRoom({});
      saveIdentity(res.roomCode, { hostToken: res.hostToken }); 
      nav(`/room/${res.roomCode}`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const join = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setError('');
    try { await api.roomInfo(c); nav(`/room/${c}`); } catch (err) { setError(err.message); }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500 text-slate-950"><Gavel size={44} /></div>
        <h1 className="text-4xl font-black sm:text-6xl">BidWicket</h1>
        <p className="mt-3 text-slate-400">Create a room, invite 5 friends with a code, and bid in real time. Virtual money, fictional players, zero sign-up.</p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <div className="card flex flex-col gap-3 p-6 text-left">
          <h2 className="text-lg font-bold">I'm the auctioneer</h2>
          <p className="text-sm text-slate-400">Create a room, share the code, start when everyone is in.</p>
          <button className="btn-primary mt-auto" onClick={create} disabled={busy}><PlusCircle size={18} /> Create room</button>
        </div>
        <form onSubmit={join} className="card flex flex-col gap-3 p-6 text-left">
          <h2 className="text-lg font-bold">I have a code</h2>
          <input className="input text-center text-2xl font-bold uppercase tracking-[0.3em]" value={code} maxLength={8} onChange={(e) => setCode(e.target.value)} placeholder="ABCDE" aria-label="Room code" />
          <button className="btn-ghost mt-auto"><LogIn size={18} /> Join / watch</button>
        </form>
      </div>
      {error && <div className="rounded-xl border border-rose-500 bg-rose-500/10 px-4 py-2 text-rose-200">{error}</div>}
    </main>
  );
}
