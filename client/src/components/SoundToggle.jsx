import { Volume2, VolumeX } from 'lucide-react';
import { sound, useMuted } from '../lib/sound';

export default function SoundToggle({ big = false }) {
  const muted = useMuted();
  return (
    <button type="button" onClick={() => sound.toggle()} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      className={`btn ${muted ? 'bg-slate-800 text-slate-300' : 'bg-emerald-500 text-slate-950'} ${big ? 'px-5 py-3 text-xl' : 'px-3 py-1.5 text-sm'}`}>
      {muted ? <VolumeX size={big ? 24 : 16} /> : <Volume2 size={big ? 24 : 16} />}
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  );
}
