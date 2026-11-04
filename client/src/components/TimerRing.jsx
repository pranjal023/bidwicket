import { useCountdown } from '../hooks/useCountdown';


export default function TimerRing({ timerEndsAt, offsetRef, totalSeconds = 15, extendedAt = 0, size = 180, frozenMs = null, children }) {
  const liveMs = useCountdown(timerEndsAt, offsetRef);
  const ms = frozenMs != null ? frozenMs : liveMs; 
  const secs = ms / 1000;
  const color = secs > 8 ? '#22c55e' : secs > 5 ? '#f59e0b' : '#ef4444';
  const urgent = frozenMs == null && timerEndsAt && secs <= 5 && secs > 0;
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, ms / (totalSeconds * 1000));

  return (
    <div key={`shake-${extendedAt}`} className={`relative ${extendedAt ? 'animate-shake' : ''}`} style={{ width: size, height: size }}>
      <div className={`absolute inset-0 ${urgent ? 'animate-urgentPulse' : ''}`}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e293b" strokeWidth="10" fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke 0.3s, stroke-dashoffset 0.1s linear', filter: urgent ? `drop-shadow(0 0 8px ${color})` : 'none' }}
          />
        </svg>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-black tabular-nums leading-none" style={{ color, fontSize: size * 0.3 }}>{timerEndsAt ? Math.ceil(secs) : '-'}</div>
        {children}
      </div>
      {extendedAt > 0 && (
        <div key={`ext-${extendedAt}`} className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 animate-flashFade whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-sm font-black uppercase text-slate-950 shadow-lg">
          Extended!
        </div>
      )}
    </div>
  );
}
