import { X } from 'lucide-react';

const TONES = {
  info: 'bg-slate-800 border-slate-600', bid: 'bg-slate-800 border-emerald-600', sold: 'bg-emerald-700 border-emerald-400',
  warn: 'bg-amber-700 border-amber-400', error: 'bg-rose-700 border-rose-400', outbid: 'bg-rose-800 border-rose-400',
};


export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <div key={toast.id} className={`pointer-events-auto flex max-w-md animate-toastIn items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-2xl ${TONES[toast.tone] || TONES.info}`} role="status">
        <span>{toast.text}</span>
        {toast.action && (
          <button type="button" className="rounded-lg bg-white px-3 py-1 font-black text-slate-900 active:scale-95" onClick={() => { toast.action.run(); onDismiss(); }}>
            {toast.action.label}
          </button>
        )}
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="opacity-70 hover:opacity-100"><X size={16} /></button>
      </div>
    </div>
  );
}
