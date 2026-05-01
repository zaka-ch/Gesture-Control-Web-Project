import type { GestureName, GestureResult } from '../types';

// ─────────────────────────────────────────────
// Rolling-buffer gesture smoother
// Prevents jitter by only confirming a gesture
// when ALL frames in the buffer agree.
// ─────────────────────────────────────────────

export class GestureSmoother {
  private buffer: GestureName[] = [];
  private _bufferSize: number;

  constructor(bufferSize: number = 6) {
    this._bufferSize = bufferSize;
  }

  /** Update the buffer size (e.g. from settings slider). Clears existing buffer. */
  setBufferSize(size: number): void {
    this._bufferSize = size;
    this.buffer = [];
  }

  get bufferSize(): number {
    return this._bufferSize;
  }

  /**
   * Push a new raw gesture into the rolling buffer and return the
   * current smoothed result.
   */
  push(gesture: GestureName): GestureResult {
    this.buffer.push(gesture);
    if (this.buffer.length > this._bufferSize) {
      this.buffer.shift();
    }

    // Count how many frames match the most-recent gesture
    const candidate = this.buffer[this.buffer.length - 1];
    const confidence = this.buffer.filter((g) => g === candidate).length;
    const confirmed = this.buffer.length === this._bufferSize && confidence === this._bufferSize;

    return {
      gesture: candidate,
      confidence,
      confirmed,
      bufferSize: this._bufferSize,
    };
  }

  /** Reset the buffer */
  reset(): void {
    this.buffer = [];
  }
}
