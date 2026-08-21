import ringAsset from "@/assets/phone_call.mp3.asset.json";

/** Looping voice/phone message used for task 2. */
export type PhoneRing = {
  start: () => void;
  stop: () => void;
  dispose: () => void;
  readonly playing: boolean;
};

export function createPhoneRing(): PhoneRing {
  let audio: HTMLAudioElement | null = null;
  let playing = false;
  let pauseTimeout: ReturnType<typeof setTimeout> | null = null;

  return {
    get playing() {
      return playing;
    },
    start() {
      if (playing) return;
      playing = true;
      audio ??= new Audio(ringAsset.url);
      audio.loop = false;
      audio.volume = 1;
      audio.currentTime = 0;

      const playAgain = () => {
        if (!playing || !audio) return;

        pauseTimeout = setTimeout(() => {
          if (!playing || !audio) return;
          audio.currentTime = 0;
          void audio.play().catch(() => undefined);
        }, 2200);
      };

      audio.onended = playAgain;
      void audio.play().catch(() => undefined);
    },
    stop() {
      playing = false;
      if (pauseTimeout !== null) {
        clearTimeout(pauseTimeout);
        pauseTimeout = null;
      }
      audio?.pause();
      if (audio) audio.currentTime = 0;
    },
    dispose() {
      playing = false;
      if (pauseTimeout !== null) {
        clearTimeout(pauseTimeout);
        pauseTimeout = null;
      }
      audio?.pause();
      audio = null;
    },
  };
}
