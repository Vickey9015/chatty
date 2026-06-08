import bcrypt from 'bcryptjs';
import { getPool } from './db.js';

const LOCK_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$|^[a-z0-9]{1,2}$/;

export function normalizeLock(value) {
  return value.trim().toLowerCase();
}

function validateLock(lock) {
  if (lock.length < 2 || lock.length > 32) {
    return 'Lock must be 2–32 characters';
  }
  if (!LOCK_RE.test(lock)) {
    return 'Lock may only use letters, numbers, and hyphens';
  }
  return null;
}

function validateKey(key) {
  if (key.length < 4 || key.length > 64) {
    return 'Key must be 4–64 characters';
  }
  return null;
}

export async function unlockLock(lockRaw, keyRaw) {
  const lock = normalizeLock(lockRaw);
  const key = keyRaw.trim();

  const lockErr = validateLock(lock);
  if (lockErr) return { ok: false, error: lockErr };

  const keyErr = validateKey(key);
  if (keyErr) return { ok: false, error: keyErr };

  let pool;
  try {
    pool = getPool();
  } catch {
    return { ok: false, error: 'Database is temporarily unavailable. Try again shortly.' };
  }

  const [rows] = await pool.query('SELECT id, key_hash FROM locks WHERE lock_name = ?', [lock]);

  if (rows.length === 0) {
    const keyHash = await bcrypt.hash(key, 10);
    try {
      await pool.query('INSERT INTO locks (lock_name, key_hash) VALUES (?, ?)', [lock, keyHash]);
      return { ok: true, created: true, lock };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return unlockLock(lockRaw, keyRaw);
      }
      throw err;
    }
  }

  const match = await bcrypt.compare(key, rows[0].key_hash);
  if (!match) {
    return { ok: false, error: 'Invalid key for this lock' };
  }

  return { ok: true, created: false, lock };
}
