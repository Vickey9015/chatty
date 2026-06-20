let sharedCtx: AudioContext | null = null;
let unlocked = false;

export function unlockAppAudio(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume();
  }
  unlocked = true;
  return sharedCtx;
}

export function getAppAudioContext(): AudioContext | null {
  return sharedCtx;
}

export function isAppAudioUnlocked(): boolean {
  return unlocked && sharedCtx?.state === 'running';
}

export function bindAppAudioUnlock(): () => void {
  const unlock = () => {
    unlockAppAudio();
  };

  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });

  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
}
