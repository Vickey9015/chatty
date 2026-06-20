import { useState, type FormEvent } from 'react';
import { unlockLock } from '../api';
import { unlockAppAudio } from '../lib/audioUnlock';

interface Props {
  onJoin: (lock: string, key: string) => void;
}

export function LoginScreen({ onJoin }: Props) {
  const [lock, setLock] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    unlockAppAudio();

    try {
      const result = await unlockLock(lock, key);
      if (!result.ok || !result.lock) {
        setError(result.error ?? 'Could not unlock');
        return;
      }
      onJoin(result.lock, key);
    } catch {
      setError('Could not reach server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <img
          src="/lockychat-logo.png"
          alt="LockyChat"
          className="logo"
          width={150}
          height={150}
        />
        <p className="subtitle">Secure real-time chat with photos, videos & video calls</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="lock">Lock</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">
                🔒
              </span>
              <input
                id="lock"
                type="text"
                className="input-modern"
                value={lock}
                onChange={(e) => setLock(e.target.value)}
                maxLength={32}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <span className="field-hint">2–32 chars: letters, numbers, hyphens. Key: 4+ chars.</span>
          </div>

          <div className="field">
            <label htmlFor="key">Key</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">
                🔑
              </span>
              <input
                id="key"
                type={showKey ? 'text' : 'password'}
                className="input-modern input-modern-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                maxLength={64}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary btn-unlock" disabled={loading}>
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
