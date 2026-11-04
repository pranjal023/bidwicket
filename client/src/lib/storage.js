
import { uid } from './format';

const key = (code) => `bidwicket:${String(code).toUpperCase()}`;

export function loadIdentity(code) {
  try { return JSON.parse(localStorage.getItem(key(code))) || {}; } catch { return {}; }
}
export function saveIdentity(code, patch) {
  try { localStorage.setItem(key(code), JSON.stringify({ ...loadIdentity(code), ...patch })); } catch { /* private mode */ }
}

export function getClientId() {
  try {
    let id = localStorage.getItem('bidwicket:clientId');
    if (!id) { id = uid(); localStorage.setItem('bidwicket:clientId', id); }
    return id;
  } catch { return uid(); }
}
