import Player from "@vimeo/player";
import type { LocalPlaybackEventHandlers, UnifiedPlayerAdapter } from "./types";

export function createVimeoAdapter(iframe: HTMLIFrameElement): UnifiedPlayerAdapter {
  const player = new Player(iframe);

  return {
    async play() {
      await player.play();
    },
    async pause() {
      await player.pause();
    },
    async seek(timeSeconds: number) {
      await player.setCurrentTime(timeSeconds);
    },
    async getCurrentTime() {
      return player.getCurrentTime();
    },
    async getDuration() {
      return player.getDuration();
    },
    async setPlaybackRate(rate: number) {
      await player.setPlaybackRate(rate);
    },
    subscribeToPlaybackEvents(handlers: LocalPlaybackEventHandlers) {
      const onPlay = async () => {
        handlers.onPlay?.(await player.getCurrentTime(), await player.getPlaybackRate());
      };
      const onPause = async () => {
        handlers.onPause?.(await player.getCurrentTime());
      };

      player.on("play", onPlay);
      player.on("pause", onPause);
      player.on("playbackratechange", onPlay);

      return () => {
        player.off("play", onPlay);
        player.off("pause", onPause);
        player.off("playbackratechange", onPlay);
      };
    },
    destroy() {
      void player.destroy();
    }
  };
}
