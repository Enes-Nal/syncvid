import { loadScript } from "../lib/script-loader";
import type { LocalPlaybackEventHandlers, UnifiedPlayerAdapter } from "./types";

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onStateChange?: () => void;
            onPlaybackRateChange?: () => void;
          };
        }
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

function extractVideoId(embedUrl: string) {
  const url = new URL(embedUrl);
  return url.pathname.split("/").filter(Boolean).pop() ?? "";
}

async function loadYouTubeApi() {
  if (window.YT?.Player) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    void loadScript("https://www.youtube.com/iframe_api").catch(reject);
  });
}

export async function createYouTubeAdapter(element: HTMLElement, embedUrl: string): Promise<UnifiedPlayerAdapter> {
  await loadYouTubeApi();

  const player = await new Promise<YouTubePlayer>((resolve) => {
    const instance = new window.YT!.Player(element, {
      videoId: extractVideoId(embedUrl),
      playerVars: {
        autoplay: 0,
        controls: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onReady: () => resolve(instance)
      }
    });
  });

  return {
    async play() {
      player.playVideo();
    },
    async pause() {
      player.pauseVideo();
    },
    async seek(timeSeconds: number) {
      player.seekTo(timeSeconds, true);
    },
    async getCurrentTime() {
      return player.getCurrentTime() || 0;
    },
    async getDuration() {
      const duration = player.getDuration();
      return Number.isFinite(duration) ? duration : null;
    },
    async setPlaybackRate(rate: number) {
      player.setPlaybackRate(rate);
    },
    subscribeToPlaybackEvents(handlers: LocalPlaybackEventHandlers) {
      const ytPlayer = player as unknown as {
        addEventListener?: (event: string, listener: () => void) => void;
        removeEventListener?: (event: string, listener: () => void) => void;
        getPlayerState?: () => number;
      };

      const emitState = () => {
        const state = ytPlayer.getPlayerState?.();
        if (state === 1) {
          handlers.onPlay?.(player.getCurrentTime() || 0, player.getPlaybackRate?.() || 1);
        } else if (state === 2) {
          handlers.onPause?.(player.getCurrentTime() || 0);
        }
      };

      ytPlayer.addEventListener?.("onStateChange", emitState);
      ytPlayer.addEventListener?.("onPlaybackRateChange", emitState);

      return () => {
        ytPlayer.removeEventListener?.("onStateChange", emitState);
        ytPlayer.removeEventListener?.("onPlaybackRateChange", emitState);
      };
    },
    destroy() {
      player.destroy();
    }
  };
}
