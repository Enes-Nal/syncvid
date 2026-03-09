import { loadScript } from "../lib/script-loader";
import type { LocalPlaybackEventHandlers, UnifiedPlayerAdapter } from "./types";

declare global {
  interface Window {
    Twitch?: {
      Player: new (
        element: HTMLElement,
        options: {
          width: string;
          height: string;
          channel?: string;
          video?: string;
          parent: string[];
          autoplay?: boolean;
        }
      ) => TwitchPlayer;
    };
  }
}

interface TwitchPlayer {
  addEventListener(event: string, handler: () => void): void;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
}

function parseTwitchTarget(embedUrl: string) {
  const url = new URL(embedUrl);
  return {
    channel: url.searchParams.get("channel") ?? undefined,
    video: url.searchParams.get("video") ?? undefined
  };
}

export async function createTwitchAdapter(element: HTMLElement, embedUrl: string): Promise<UnifiedPlayerAdapter> {
  await loadScript("https://player.twitch.tv/js/embed/v1.js");
  const target = parseTwitchTarget(embedUrl);

  const player = new window.Twitch!.Player(element, {
    width: "100%",
    height: "100%",
    parent: [window.location.hostname || "localhost"],
    autoplay: false,
    ...target
  });

  player.setVolume(0.5);

  return {
    async play() {
      player.play();
    },
    async pause() {
      player.pause();
    },
    async seek(timeSeconds: number) {
      player.seek(timeSeconds);
    },
    async getCurrentTime() {
      return player.getCurrentTime() || 0;
    },
    async getDuration() {
      const duration = player.getDuration();
      return Number.isFinite(duration) ? duration : null;
    },
    subscribeToPlaybackEvents(handlers: LocalPlaybackEventHandlers) {
      const onPlay = () => handlers.onPlay?.(player.getCurrentTime() || 0, 1);
      const onPause = () => handlers.onPause?.(player.getCurrentTime() || 0);

      player.addEventListener("PLAY", onPlay);
      player.addEventListener("PAUSE", onPause);

      return () => {};
    }
  };
}
