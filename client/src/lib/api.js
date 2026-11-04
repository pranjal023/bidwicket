
export const SERVER_URL = (import.meta.env.VITE_SERVER_URL || '').trim().replace(/\/+$/, '');
const BASE = `${SERVER_URL}/api`;

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const err = new Error(data?.error?.message || 'Request failed');
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

export const api = {
  createRoom: (settings) => request('/rooms', { method: 'POST', body: { settings } }),
  roomInfo: (code) => request(`/rooms/${code}`),
  results: (code) => request(`/rooms/${code}/results`),
  claimTeam: (code, teamId, body) => request(`/rooms/${code}/teams/${teamId}/claim`, { method: 'POST', body }),
  updateTeam: (code, teamId, body, ident) =>
    request(`/rooms/${code}/teams/${teamId}`, { method: 'PATCH', body, headers: { 'x-host-token': ident.hostToken || '', 'x-team-token': ident.teamToken || '' } }),
  updateSettings: (code, body, ident) =>
    request(`/rooms/${code}/settings`, { method: 'PATCH', body, headers: { 'x-host-token': ident.hostToken || '' } }),
  uploadPool: (code, body, ident) =>
    request(`/rooms/${code}/pool`, { method: 'POST', body, headers: { 'x-host-token': ident.hostToken || '' } }),
};
