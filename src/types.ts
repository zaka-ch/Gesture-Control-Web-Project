// ─────────────────────────────────────────────
// Shared types for the gesture control system
// ─────────────────────────────────────────────

/** A single 3-D landmark point from MediaPipe Hands */
export interface Landmark {
  x: number; // normalized 0–1
  y: number; // normalized 0–1
  z: number; // relative depth
}

/** All 5 supported gesture names */
export type GestureName =
  | 'INDEX_UP'
  | 'FIST'
  | 'OPEN_HAND'
  | 'SWIPE_RIGHT'
  | 'PINCH'
  | 'NONE';

/** The confirmed output from the gesture smoother */
export interface GestureResult {
  /** The gesture that has been confirmed across N frames */
  gesture: GestureName;
  /** How many of the buffer frames agree (0 – bufferSize) */
  confidence: number;
  /** True when confidence === bufferSize */
  confirmed: boolean;
  /** Total frames in the rolling buffer */
  bufferSize: number;
}

/** User-configurable settings */
export interface Settings {
  /** Rolling buffer size for gesture stabilisation (3–12) */
  bufferSize: number;
  /** Pixels to scroll per frame (1–10) */
  scrollSpeed: number;
  /** Maximum pixel distance for pinch detection (10–60) */
  pinchThreshold: number;
  /** Which gestures are enabled */
  enabledGestures: Record<GestureName, boolean>;
}

/** Default settings */
export const DEFAULT_SETTINGS: Settings = {
  bufferSize: 6,
  scrollSpeed: 4,
  pinchThreshold: 30,
  enabledGestures: {
    INDEX_UP: true,
    FIST: true,
    OPEN_HAND: true,
    SWIPE_RIGHT: true,
    PINCH: true,
    NONE: true,
  },
};
