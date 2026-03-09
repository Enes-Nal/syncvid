import type { UnifiedPlayerAdapter } from "./types";

export class PassiveIframeAdapter implements UnifiedPlayerAdapter {
  async play() {}
  async pause() {}
  async seek(_timeSeconds: number) {}
  async getCurrentTime() {
    return 0;
  }
  async getDuration() {
    return null;
  }
}
