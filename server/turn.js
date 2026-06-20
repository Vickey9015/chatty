/** Fetch TURN credentials from Metered Open Relay API (cached). */

const CACHE_MS = 55 * 60 * 1000;

let cached = null;
let cachedAt = 0;

const STATIC_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:80',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

function normalizeIceServers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.iceServers)) return data.iceServers;
  return STATIC_ICE_SERVERS;
}

export async function getTurnCredentials() {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_MS) {
    return cached;
  }

  const apiKey = process.env.METERED_TURN_API_KEY?.trim();
  if (apiKey) {
    const base =
      process.env.METERED_TURN_API_URL?.trim() || 'https://openrelayproject.metered.ca';
    const url = `${base.replace(/\/$/, '')}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const iceServers = normalizeIceServers(data);
        cached = {
          iceServers,
          iceTransportPolicy: 'relay',
          source: 'metered',
        };
        cachedAt = now;
        return cached;
      }
      console.warn('[turn] Metered API returned', res.status);
    } catch (err) {
      console.warn('[turn] Metered API fetch failed:', err.message);
    }
  }

  // Without API key, static free TURN is often blocked — use direct paths (mobile data).
  cached = {
    iceServers: STATIC_ICE_SERVERS,
    iceTransportPolicy: 'all',
    source: 'static',
  };
  cachedAt = now;
  return cached;
}
