import type { PlaybackState } from "@syncweb/shared";

export function resolveAuthoritativePosition(playback: PlaybackState) {
  if (playback.status === "playing" && playback.videoStartedAt) {
    const elapsed = (Date.now() - playback.videoStartedAt) / 1000;
    return playback.positionSeconds + elapsed * playback.playbackRate;
  }
  return playback.positionSeconds;
}
