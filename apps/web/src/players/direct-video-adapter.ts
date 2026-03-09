import type { LocalPlaybackEventHandlers, UnifiedPlayerAdapter } from "./types";

export class DirectVideoAdapter implements UnifiedPlayerAdapter {
  constructor(private readonly video: HTMLVideoElement) {}

  async play() {
    await this.video.play();
  }

  async pause() {
    this.video.pause();
  }

  async seek(timeSeconds: number) {
    this.video.currentTime = timeSeconds;
  }

  async getCurrentTime() {
    return this.video.currentTime;
  }

  async getDuration() {
    return Number.isFinite(this.video.duration) ? this.video.duration : null;
  }

  async setPlaybackRate(rate: number) {
    this.video.playbackRate = rate;
  }

  subscribeToPlaybackEvents(handlers: LocalPlaybackEventHandlers) {
    const onPlay = () => handlers.onPlay?.(this.video.currentTime, this.video.playbackRate);
    const onPause = () => handlers.onPause?.(this.video.currentTime);

    this.video.addEventListener("play", onPlay);
    this.video.addEventListener("pause", onPause);
    this.video.addEventListener("ratechange", onPlay);

    return () => {
      this.video.removeEventListener("play", onPlay);
      this.video.removeEventListener("pause", onPause);
      this.video.removeEventListener("ratechange", onPlay);
    };
  }
}
