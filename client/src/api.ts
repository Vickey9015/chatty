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
    body: JSON.stringify({ lock, key }),
  });

  const data = (await res.json()) as UnlockResult;
  if (!res.ok && !data.error) {
    return { ok: false, error: 'Could not reach server' };
  }
  return data;
}
