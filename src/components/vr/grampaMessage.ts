import msgAsset from "@/assets/grampa_message.mp3.asset.json";

/**
 * Plays the Grampa Werthers message exactly once (no looping).
 * Used after the player answers the ringing phone and then releases it.
 */
export type GrampaMessage = {
  playOnce: () => void;
  stop: () => void;
  dispose: () => void;
  readonly played: boolean;
};

export function createGrampaMessage(): GrampaMessage {
  let audio: HTMLAudioElement | null = null;
  let didPlay = false;

  return {
    get played() {
      return didPlay;
    },
    playOnce() {
      if (didPlay) return;
      didPlay = true;
      audio ??= new Audio(msgAsset.url);
      audio.loop = false;
      audio.volume = 1;
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    },
    stop() {
      audio?.pause();
      if (audio) audio.currentTime = 0;
    },
    dispose() {
      audio?.pause();
      audio = null;
    },
  };
}
