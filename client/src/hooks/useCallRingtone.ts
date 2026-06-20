import { useEffect } from 'react';
import { getAppAudioContext, unlockAppAudio } from '../lib/audioUnlock';

function playRingBurst(ctx: AudioContext, startAt: number) {
  const tones = [440, 480];
  tones.forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.15, startAt + 0.05);
    gain.gain.setValueAtTime(0.15, startAt + 0.35);
    gain.gain.linearRampToValueAtTime(0, startAt + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt + index * 0.45);
    osc.stop(startAt + index * 0.45 + 0.4);
  });
}

export function useCallRingtone(active: boolean) {
  useEffect(() => {
    if (!active) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    let ownedCtx: AudioContext | null = null;

    const start = async () => {
      const existing = getAppAudioContext();
      const ctx = existing ?? unlockAppAudio();
      ownedCtx = existing ? null : ctx;

      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
      } catch {
        return;
      }
      if (cancelled || ctx.state !== 'running') return;

      playRingBurst(ctx, ctx.currentTime);
      intervalId = setInterval(() => {
        if (ctx.state === 'running') {
          playRingBurst(ctx, ctx.currentTime);
        }
      }, 2200);
    };

    void start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (ownedCtx) void ownedCtx.close();
    };
  }, [active]);
}
