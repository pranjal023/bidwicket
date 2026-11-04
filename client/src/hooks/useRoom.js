
import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocket } from '../lib/socket';
import { getClientId, loadIdentity } from '../lib/storage';
import { sound } from '../lib/sound';
import { fmtCr, uid } from '../lib/format';

export function useRoom(code, { screen = false } = {}) {
  const [snap, setSnap] = useState(null);
  const [status, setStatus] = useState('connecting'); 
  const [error, setError] = useState(null);
  const [ticker, setTicker] = useState([]);
  const [soldInfo, setSoldInfo] = useState(null); 
  const [toast, setToast] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [extendedAt, setExtendedAt] = useState(0);
  const [bidState, setBidState] = useState(null);
  const [sending, setSending] = useState(false);
  const [chat, setChat] = useState([]);
  const [chatReady, setChatReady] = useState(false);

  const offsetRef = useRef(0); 
  const socketRef = useRef(null);
  const bidStateRef = useRef(null);
  const toastTimer = useRef(null);
  const teamsRef = useRef([]);

  const updateBidState = useCallback((b) => { bidStateRef.current = b; setBidState(b); }, []);


  const showToast = useCallback((t, ms = 3500) => {
    clearTimeout(toastTimer.current);
    setToast({ ...t, id: uid() });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  const placeBid = useCallback(() => {
    const bs = bidStateRef.current; const s = socketRef.current;
    if (!bs?.canBid || !s) return;
    setSending(true);
    
    s.emit('bid:place', { clientBidId: uid(), amount: bs.nextBid }, (ack) => {
      setSending(false);
      if (ack && !ack.ok) showToast({ tone: 'error', text: ack.error.message });
    });
  }, [showToast]);

  const join = useCallback(() => {
    const s = socketRef.current; if (!s) return;
    const id = screen ? {} : loadIdentity(code);
    s.emit('room:join', { roomCode: code, hostToken: id.hostToken, teamToken: id.teamToken, clientId: getClientId() }, (ack) => {
      if (ack && !ack.ok) setError(ack.error);
    });
  }, [code, screen]);

  useEffect(() => {
    const s = createSocket();
    socketRef.current = s;
    const cleanups = [];
    const on = (ev, fn) => { s.on(ev, fn); cleanups.push(() => s.off(ev, fn)); };

    on('connect', () => { setStatus('online'); join(); });
    on('disconnect', () => setStatus('offline'));
    on('connect_error', () => setStatus('offline'));

    on('room:snapshot', (p) => {
      offsetRef.current = p.serverNow - Date.now();
      teamsRef.current = p.teams;
      setSnap(p);
      setTicker(p.recentBids);
      updateBidState(p.me.bidState);
      setError(null);
      const { state, lastResult } = p.auction;
      if (state === 'player_live') setSoldInfo(null);
      else if ((state === 'sold' || state === 'unsold') && lastResult) {
        setSoldInfo((prev) => (prev && String(prev.result.playerId) === String(lastResult.playerId) ? prev : { result: lastResult, fresh: false, key: uid() }));
      }
    });

    on('lot:started', () => { setSoldInfo(null); setTicker([]); showToast({ tone: 'info', text: 'Next player is up!' }, 2000); });

    on('bid:new', (p) => {
      offsetRef.current = p.serverNow - Date.now();
      setSnap((prev) => prev && { ...prev, auction: { ...prev.auction, currentBid: p.currentBid, currentTeamId: p.teamId, timerEndsAt: p.timerEndsAt } });
      setTicker((t) => [{ teamId: p.teamId, amount: p.amount, at: p.at }, ...t].slice(0, 8));
      showToast({ tone: 'bid', text: `${p.teamName} bids ${fmtCr(p.amount)}` }, 2200);
      sound.play('bid');
    });

    on('timer:extended', (p) => {
      offsetRef.current = p.serverNow - Date.now();
      setExtendedAt(Date.now());
      setSnap((prev) => prev && { ...prev, auction: { ...prev.auction, timerEndsAt: p.timerEndsAt } });
      sound.play('extended');
    });

    on('lot:sold', (result) => {
      setSoldInfo({ result, fresh: true, key: uid() });
      sound.play('gavel'); if (result.isRecord) sound.play('record');
      showToast({ tone: 'sold', text: `SOLD: ${result.playerName} to ${result.teamName} for ${fmtCr(result.amount)}` }, 4000);
    });
    on('lot:unsold', (result) => {
      setSoldInfo({ result, fresh: true, key: uid() });
      sound.play('unsold');
      showToast({ tone: 'info', text: `UNSOLD: ${result.playerName}` }, 3000);
    });

    on('team:presence', (p) => {
      setSnap((prev) => prev && { ...prev, teams: prev.teams.map((t) => (String(t.id) === String(p.teamId) ? { ...t, connected: p.connected } : t)) });
      showToast({ tone: p.connected ? 'info' : 'warn', text: `${p.name} ${p.connected ? 'reconnected' : 'disconnected'}` });
    });

   
    on('me:bidState', updateBidState);
    on('me:outbid', (p) => {
      updateBidState(p.bidState);
      navigator.vibrate?.(80); 
      sound.play('outbid');
      showToast({ tone: 'outbid', text: `Outbid by ${p.byTeamName} at ${fmtCr(p.amount)}`, action: p.bidState.canBid ? { label: `Bid ${fmtCr(p.bidState.nextBid)}`, run: () => placeBid() } : null }, 5000);
    });
    on('me:targetNext', (p) => showToast({ tone: 'info', text: `Your target is next: ${p.playerName} (${p.role})` }, 3500));

    on('reaction:new', (r) => {
      setReactions((list) => [...list.slice(-40), { ...r, left: 8 + Math.random() * 84 }]);
      setTimeout(() => setReactions((list) => list.filter((x) => x.id !== r.id)), 3200);
    });

    on('auction:paused', () => showToast({ tone: 'warn', text: 'Auction paused by the auctioneer' }, 3000));
    on('auction:resumed', () => showToast({ tone: 'info', text: 'Auction resumed. Bidding is live!' }, 2500));

    on('chat:history', (list) => { setChat(list); setChatReady(true); });
    on('chat:new', (m) => setChat((c) => [...c.slice(-99), m]));

    on('auction:completed', () => showToast({ tone: 'sold', text: 'Auction complete! Check the results.' }, 6000));

    return () => { cleanups.forEach((f) => f()); clearTimeout(toastTimer.current); s.close(); };
    
  }, [code, screen]);

  const emitAck = (ev, data = {}) =>
    new Promise((resolve) => socketRef.current?.emit(ev, data, (ack) => {
      if (ack && !ack.ok) showToast({ tone: 'error', text: ack.error.message });
      resolve(ack);
    }));

  return {
    snap, status, error, ticker, soldInfo, toast, reactions, extendedAt, bidState, sending, offsetRef,
    me: snap?.me, teams: snap?.teams || [],
    rejoin: join, 
    placeBid,
    start: () => emitAck('auction:start'),
    next: () => emitAck('auction:next'),
    stop: () => emitAck('auction:stop'),
    pause: () => emitAck('auction:pause'),
    resume: () => emitAck('auction:resume'),
    chat, chatReady,
    sendChat: (text) => emitAck('chat:send', { text }),
    react: (emoji) => socketRef.current?.emit('reaction:send', { emoji }, () => {}),
    dismissToast: () => setToast(null),
  };
}
