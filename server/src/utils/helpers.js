const crypto = require('crypto');

/** Round to 2 decimals. Cr values are multiples of 0.25 */
const round2 = (n) => Math.round(n * 100) / 100;


const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomRoomCode(len = 5) {
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return out;
}

const randomToken = () => crypto.randomBytes(24).toString('hex');

/** Fisher-Yates shuffle */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const randBetween = (min, max) => min + Math.random() * (max - min);
const idEq = (a, b) => a != null && b != null && String(a) === String(b);

module.exports = { round2, randomRoomCode, randomToken, shuffle, randBetween, idEq };
