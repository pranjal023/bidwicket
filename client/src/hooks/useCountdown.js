import { useEffect, useState } from 'react';


export function useCountdown(timerEndsAt, offsetRef) {
  const calc = () => (timerEndsAt ? Math.max(0, timerEndsAt - (Date.now() + (offsetRef.current || 0))) : 0);
  const [ms, setMs] = useState(calc);
  useEffect(() => {
    setMs(calc());
    if (!timerEndsAt) return undefined;
    const id = setInterval(() => setMs(calc()), 100);
    return () => clearInterval(id);
    
  }, [timerEndsAt]);
  return ms;
}
