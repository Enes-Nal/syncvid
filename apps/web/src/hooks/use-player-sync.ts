import { useEffect, useRef } from "react";
import type { PlaybackState } from "@syncweb/shared";
import { resolveAuthoritativePosition } from "../lib/time";
import type { UnifiedPlayerAdapter } from "../players/types";

interface UsePlayerSyncArgs {
  adapter: UnifiedPlayerAdapter | null;
  canControl: boolean;
  playback: PlaybackState;
  onDriftReport: (positionSeconds: number) => void;
  onLocalPlay: (positionSeconds: number, playbackRate: number) => void;
  onLocalPause: (positionSeconds: number) => void;
  onLocalSeek: (positionSeconds: number) => void;
  onEnded?: () => void;
}

const DRIFT_THRESHOLD_SECONDS = 0.3;
const END_THRESHOLD_SECONDS = 0.75;
const LOCAL_SEEK_THRESHOLD_SECONDS = 1.2;
const REMOTE_SYNC_SUPPRESS_MS = 1200;

function isIgnorablePlayerError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /abort|interrupted|notallowed|not supported|play\(\) request/i.test(error.message);
}

async function runPlayerCommand(command: () => Promise<void>) {
  try {
    await command();
  } catch (error) {
    if (!isIgnorablePlayerError(error)) {
      console.error("Player command failed", error);
    }
  }
}

async function readPlayerValue<T>(reader: () => Promise<T>, fallback: T) {
  try {
    return await reader();
  } catch (error) {
    if (!isIgnorablePlayerError(error)) {
      console.error("Player read failed", error);
    }
    return fallback;
  }
}

export function usePlayerSync({
  adapter,
  canControl,
  playback,
  onDriftReport,
  onLocalPlay,
  onLocalPause,
  onLocalSeek,
  onEnded
}: UsePlayerSyncArgs) {
  const endNotifiedRef = useRef(false);
  const suppressLocalEventsUntilRef = useRef(0);
  const localPlaybackRef = useRef({
    status: playback.status,
    playbackRate: playback.playbackRate
  });
  const observedPositionRef = useRef<{ positionSeconds: number; observedAt: number } | null>(null);

  useEffect(() => {
    localPlaybackRef.current = {
      status: playback.status,
      playbackRate: playback.playbackRate
    };
  }, [playback.status, playback.playbackRate]);

  useEffect(() => {
    if (!adapter) {
      return;
    }
    const player: UnifiedPlayerAdapter = adapter;

    let cancelled = false;

    async function syncNow() {
      suppressLocalEventsUntilRef.current = Date.now() + REMOTE_SYNC_SUPPRESS_MS;

      const target = resolveAuthoritativePosition(playback);
      const current = await readPlayerValue(() => player.getCurrentTime(), 0);
      if (cancelled) {
        return;
      }

      const delta = Math.abs(current - target);
      if (delta > DRIFT_THRESHOLD_SECONDS) {
        await runPlayerCommand(() => player.seek(target));
      }

      if (playback.status === "playing") {
        await runPlayerCommand(() => player.play());
      } else {
        await runPlayerCommand(() => player.pause());
      }

      if (player.setPlaybackRate) {
        await runPlayerCommand(() => player.setPlaybackRate!(playback.playbackRate));
      }

      observedPositionRef.current = {
        positionSeconds: target,
        observedAt: performance.now()
      };
    }

    void syncNow();
    return () => {
      cancelled = true;
    };
  }, [adapter, playback]);

  useEffect(() => {
    if (!adapter || !canControl || !adapter.subscribeToPlaybackEvents) {
      return;
    }

    return adapter.subscribeToPlaybackEvents({
      onPlay: (positionSeconds, playbackRate) => {
        if (Date.now() < suppressLocalEventsUntilRef.current) {
          return;
        }

        localPlaybackRef.current = { status: "playing", playbackRate };
        onLocalPlay(positionSeconds, playbackRate);
      },
      onPause: (positionSeconds) => {
        if (Date.now() < suppressLocalEventsUntilRef.current) {
          return;
        }

        localPlaybackRef.current = {
          status: "paused",
          playbackRate: localPlaybackRef.current.playbackRate
        };
        onLocalPause(positionSeconds);
      }
    });
  }, [adapter, canControl, onLocalPause, onLocalPlay]);

  useEffect(() => {
    if (!adapter || !canControl) {
      observedPositionRef.current = null;
      return;
    }

    const player = adapter;
    const interval = window.setInterval(async () => {
      const current = await readPlayerValue(() => player.getCurrentTime(), 0);
      const now = performance.now();
      const previous = observedPositionRef.current;
      observedPositionRef.current = { positionSeconds: current, observedAt: now };

      if (!previous || Date.now() < suppressLocalEventsUntilRef.current) {
        return;
      }

      const elapsedSeconds = (now - previous.observedAt) / 1000;
      const expectedDelta =
        localPlaybackRef.current.status === "playing" ? elapsedSeconds * localPlaybackRef.current.playbackRate : 0;
      const actualDelta = current - previous.positionSeconds;

      if (Math.abs(actualDelta - expectedDelta) >= LOCAL_SEEK_THRESHOLD_SECONDS) {
        onLocalSeek(current);
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [adapter, canControl, onLocalSeek]);

  useEffect(() => {
    if (!adapter) {
      return;
    }
    const player: UnifiedPlayerAdapter = adapter;

    const interval = window.setInterval(async () => {
      const position = await readPlayerValue(() => player.getCurrentTime(), 0);
      onDriftReport(position);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [adapter, onDriftReport]);

  useEffect(() => {
    if (playback.status !== "playing") {
      endNotifiedRef.current = false;
    }
  }, [playback.status, playback.updatedAt]);

  useEffect(() => {
    if (!adapter || !onEnded || playback.status !== "playing") {
      return;
    }
    const player: UnifiedPlayerAdapter = adapter;

    const interval = window.setInterval(async () => {
      const [position, duration] = await Promise.all([
        readPlayerValue(() => player.getCurrentTime(), 0),
        readPlayerValue(() => player.getDuration(), null)
      ]);
      if (duration && duration > 0 && duration - position <= END_THRESHOLD_SECONDS && !endNotifiedRef.current) {
        endNotifiedRef.current = true;
        onEnded();
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [adapter, playback.status, onEnded]);
}
