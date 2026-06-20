import { useEffect } from 'react';

function playRingBurst(ctx: AudioContext, startAt: number) {
  const tones = [440, 480];
  tones.forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.12, startAt + 0.05);
    gain.gain.setValueAtTime(0.12, startAt + 0.35);
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

    const ctx = new AudioContext();
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const start = async () => {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
      } catch {
        /* autoplay may stay blocked until user interacts */
      }
      if (cancelled) return;

      playRingBurst(ctx, ctx.currentTime);
      intervalId = setInterval(() => {
        playRingBurst(ctx, ctx.currentTime);
      }, 2200);
    };

    void start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      void ctx.close();
    };
  }, [active]);
}
