const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';
const key = id => `dandan.progress.${id}`;

export function localProgress(id) {
  try {
    const saved = JSON.parse(localStorage.getItem(key(id)) || 'null');
    return saved && Number.isFinite(saved.position) && Number.isFinite(saved.duration) && saved.position >= 0 && saved.duration > 0 ? saved : null;
  } catch { return null; }
}

export async function readProgress(id, signal) {
  const local = localProgress(id);
  try {
    const response = await fetch(`${apiHost}/api/progress/${id}?user_id=1`, { signal });
    if (!response.ok) return local;
    const remote = await response.json();
    if (!remote || !(remote.duration > 0)) return local;
    return local && local.updated_at > remote.updated_at ? local : remote;
  } catch { return local; }
}

export function saveProgress(id, position, duration, { remote = true, keepalive = false } = {}) {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || position < 0 || duration <= 0) return Promise.resolve(false);
  const progress = { episode_id: Number(id), user_id: 1, position: Math.min(position, duration), duration, updated_at: Date.now() };
  try { localStorage.setItem(key(id), JSON.stringify(progress)); } catch { /* Server persistence can still work. */ }
  if (!remote) return Promise.resolve(true);
  return fetch(`${apiHost}/api/progress`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(progress), keepalive }).then(response => response.ok).catch(() => false);
}
