export interface LocalPlaybackEventHandlers {
  onPlay?: (positionSeconds: number, playbackRate: number) => void;
  onPause?: (positionSeconds: number) => void;
}

export interface UnifiedPlayerAdapter {
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(timeSeconds: number): Promise<void>;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number | null>;
  setPlaybackRate?(rate: number): Promise<void>;
  subscribeToPlaybackEvents?(handlers: LocalPlaybackEventHandlers): () => void;
  destroy?(): void;
}
