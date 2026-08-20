/** Simple synthesized alarm clock beeping, no audio asset required. */
export type AlarmSound = {
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

export function createAlarmSound(): AlarmSound {
  let ctx: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const beep = (at: number, freq: number) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.13);
  };

  const burst = () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) beep(t + i * 0.16, 1760);
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx ??= new Ctor();
      void ctx.resume();
      burst();
      timer = setInterval(burst, 1200);
    },
    stop: () => {
      running = false;
      if (timer) clearInterval(timer);
      timer = null;
    },
    dispose: () => {
      running = false;
      if (timer) clearInterval(timer);
      timer = null;
      void ctx?.close();
      ctx = null;
    },
  };
}
