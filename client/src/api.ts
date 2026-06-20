const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

export interface UnlockResult {
  ok: boolean;
  lock?: string;
  created?: boolean;
  error?: string;
}

export async function unlockLock(lock: string, key: string): Promise<UnlockResult> {
  const res = await fetch(`${SERVER_URL}/api/lock/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lock: lock.trim(), key: key.trim() }),
  });

  let data: UnlockResult;
  try {
    data = (await res.json()) as UnlockResult;
  } catch {
    return { ok: false, error: res.ok ? 'Invalid server response' : `Server error (${res.status})` };
  }

  if (!res.ok && !data.error) {
    return { ok: false, error: `Unlock failed (${res.status})` };
  }
  return data;
}
