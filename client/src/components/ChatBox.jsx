import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

/**
 * Room chat. Floating button (with unread badge) opens a small panel.
 * Teams and the auctioneer can write; spectators can read. Text is rendered as plain
 * text (React escapes it), and the server resolves the sender, so names cannot be faked.
 */
export default function ChatBox({ chat, chatReady, onSend, canSend, myTeamId }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [seen, setSeen] = useState(null); 
  const endRef = useRef(null);

  useEffect(() => {
    if (seen === null && chatReady) setSeen(chat.length);
    if (open) setSeen(chat.length);
  }, [chat.length, chatReady, open]); 

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: 'end' }); }, [open, chat.length]);

  const unread = open || seen === null ? 0 : Math.max(0, chat.length - seen);

  const submit = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !canSend) return;
    setText('');
    const ack = await onSend(t);
    if (ack && !ack.ok) setText(t); 
  };

  return (
    <div className="fixed bottom-20 right-3 z-30 flex flex-col items-end gap-2">
      {open && (
        <div className="flex h-80 w-[min(92vw,22rem)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-sm font-bold">
            <span>💬 Room chat</span>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm">
            {chat.length === 0 && <p className="pt-6 text-center text-slate-500">No messages yet. Say hi! 👋</p>}
            {chat.map((m) => {
              const mine = myTeamId && m.teamId === String(myTeamId);
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: m.color }}>
                    {m.emoji} {m.name}{m.isHost && <span className="rounded bg-white/10 px-1 text-[10px] text-slate-200">AUCTIONEER</span>}
                  </span>
                  <span className={`max-w-[85%] break-words rounded-2xl px-3 py-1.5 ${mine ? 'bg-emerald-600 text-white' : 'bg-slate-800'}`}>{m.text}</span>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-slate-800 p-2">
            <input className="input py-1.5 text-sm" value={text} maxLength={200} disabled={!canSend} aria-label="Chat message"
              onChange={(e) => setText(e.target.value)} placeholder={canSend ? 'Type a message…' : 'Join a team to chat'} />
            <button className="btn-primary px-3" disabled={!canSend || !text.trim()} aria-label="Send"><Send size={16} /></button>
          </form>
        </div>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Toggle chat"
        className="btn relative h-12 w-12 rounded-full bg-slate-800 p-0 shadow-xl hover:bg-slate-700">
        <MessageCircle size={22} />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-black">{unread > 9 ? '9+' : unread}</span>}
      </button>
    </div>
  );
}
