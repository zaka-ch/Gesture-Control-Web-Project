import type { Landmark, GestureName } from '../types';

// ─────────────────────────────────────────────
// Pure gesture classifier — landmarks → GestureName
// All functions are side-effect free and easy to unit test.
// ─────────────────────────────────────────────

/** Euclidean pixel distance between two normalised landmarks */
function dist(a: Landmark, b: Landmark, width: number, height: number): number {
  const dx = (a.x - b.x) * width;
  const dy = (a.y - b.y) * height;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Returns true when a finger is extended.
 * Uses tip (tipIdx) vs the PIP joint (pipIdx) — tip must be above (lower y) PIP.
 */
function isFingerExtended(lm: Landmark[], tipIdx: number, pipIdx: number): boolean {
  return lm[tipIdx].y < lm[pipIdx].y;
}

/**
 * Classify hand landmarks into a GestureName.
 * @param landmarks   - Array of 21 normalised landmarks from MediaPipe
 * @param pinchThreshold - Max pixel distance for pinch (default 30)
 * @param videoWidth  - Pixel width of the video element (for distance calc)
 * @param videoHeight - Pixel height of the video element
 * @param xVelocity   - Lateral velocity of the wrist (px/frame, positive = right)
 * @param swipeThreshold - Min velocity to trigger SWIPE_RIGHT (default 12)
 */
export function classifyGesture(
  landmarks: Landmark[],
  pinchThreshold: number = 30,
  videoWidth: number = 640,
  videoHeight: number = 480,
  xVelocity: number = 0,
  swipeThreshold: number = 12,
): GestureName {
  if (!landmarks || landmarks.length < 21) return 'NONE';

  // Finger tip and PIP landmark indices
  // Thumb: tip=4, IP=3 (use x axis for thumb)
  // Index: tip=8, pip=6
  // Middle: tip=12, pip=10
  // Ring: tip=16, pip=14
  // Pinky: tip=20, pip=18

  const indexExtended  = isFingerExtended(landmarks, 8, 6);
  const middleExtended = isFingerExtended(landmarks, 12, 10);
  const ringExtended   = isFingerExtended(landmarks, 16, 14);
  const pinkyExtended  = isFingerExtended(landmarks, 20, 18);

  // PINCH — thumb tip (4) close to index tip (8)
  const pinchDist = dist(landmarks[4], landmarks[8], videoWidth, videoHeight);
  if (pinchDist < pinchThreshold) return 'PINCH';

  // OPEN_HAND — all four fingers extended
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    // SWIPE_RIGHT — open hand moving right fast enough
    if (xVelocity > swipeThreshold) return 'SWIPE_RIGHT';
    return 'OPEN_HAND';
  }

  // INDEX_UP — only index extended, others curled
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'INDEX_UP';
  }

  // FIST — all fingertips below their PIP joints
  const allCurled = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
  if (allCurled) return 'FIST';

  return 'NONE';
}
