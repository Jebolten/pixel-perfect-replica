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

  return {
    get playing() {
      return playing;
    },
    start() {
      if (playing) return;
      playing = true;
      audio ??= new Audio(ringAsset.url);
      audio.loop = true;
      audio.volume = 1;
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    },
    stop() {
      playing = false;
      audio?.pause();
      if (audio) audio.currentTime = 0;
    },
    dispose() {
      playing = false;
      audio?.pause();
      audio = null;
    },
  };
}
