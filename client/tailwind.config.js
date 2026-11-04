/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        floatUp: { '0%': { transform: 'translateY(0) scale(0.6)', opacity: '0' }, '10%': { opacity: '1' }, '100%': { transform: 'translateY(-85vh) scale(1.6)', opacity: '0' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%': { transform: 'translateX(-8px) rotate(-2deg)' }, '40%': { transform: 'translateX(8px) rotate(2deg)' }, '60%': { transform: 'translateX(-6px)' }, '80%': { transform: 'translateX(6px)' } },
        flashFade: { '0%': { opacity: '0', transform: 'scale(0.6)' }, '15%': { opacity: '1', transform: 'scale(1.15)' }, '100%': { opacity: '0', transform: 'scale(1)' } },
        cardFlash: { '0%': { filter: 'brightness(2.2)' }, '100%': { filter: 'brightness(1)' } },
        bannerIn: { '0%': { transform: 'translateY(30px) scale(0.9)', opacity: '0' }, '100%': { transform: 'translateY(0) scale(1)', opacity: '1' } },
        urgentPulse: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.06)' } },
        toastIn: { '0%': { transform: 'translateY(-12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        bump: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.18)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        floatUp: 'floatUp 3s ease-out forwards',
        shake: 'shake 0.6s ease-in-out',
        flashFade: 'flashFade 1.4s ease-out forwards',
        cardFlash: 'cardFlash 0.9s ease-out',
        bannerIn: 'bannerIn 0.5s cubic-bezier(.2,1.4,.4,1) both',
        urgentPulse: 'urgentPulse 0.7s ease-in-out infinite',
        toastIn: 'toastIn 0.25s ease-out',
        bump: 'bump 0.35s ease-out',
      },
    },
  },
  plugins: [],
};
