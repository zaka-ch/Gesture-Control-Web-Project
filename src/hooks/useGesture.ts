import { useRef, useState, useCallback } from 'react';
import { classifyGesture } from '../lib/classifier';
import { GestureSmoother } from '../lib/smoother';
import { Landmark, GestureResult, GestureName, Settings } from '../types';

export function useGesture(settings: Settings) {
  const smootherRef = useRef(new GestureSmoother(settings.bufferSize));
  const prevWristXRef = useRef<number | null>(null);
  const lastPinchActionRef = useRef<number>(0);
  const [result, setResult] = useState<GestureResult>({
    gesture: 'NONE',
    confidence: 0,
    confirmed: false,
    bufferSize: settings.bufferSize,
  });

  // Keep smoother in sync when bufferSize changes
  const smootherBuffer = smootherRef.current.bufferSize;
  if (smootherBuffer !== settings.bufferSize) {
    smootherRef.current.setBufferSize(settings.bufferSize);
  }

  const processLandmarks = useCallback(
    (landmarks: Landmark[], videoWidth: number, videoHeight: number) => {
      if (!landmarks || landmarks.length < 21) {
        const r = smootherRef.current.push('NONE');
        setResult(r);
        prevWristXRef.current = null;
        return;
      }

      // Compute wrist x velocity (normalised, then scaled to pixels)
      const wristX = landmarks[0].x * videoWidth;
      const xVelocity =
        prevWristXRef.current !== null ? wristX - prevWristXRef.current : 0;
      prevWristXRef.current = wristX;

      const raw: GestureName = classifyGesture(
        landmarks,
        settings.pinchThreshold,
        videoWidth,
        videoHeight,
        // Velocity is mirrored (we flip video), so negate it
        -xVelocity,
      );

      const r = smootherRef.current.push(raw);
      setResult(r);

      // Execute actions only when gesture is confirmed AND enabled
      if (!r.confirmed) return;
      if (!settings.enabledGestures[r.gesture]) return;

      switch (r.gesture) {
        case 'INDEX_UP':
          window.scrollBy({ top: -settings.scrollSpeed * 5, behavior: 'auto' });
          break;

        case 'FIST':
          window.scrollBy({ top: settings.scrollSpeed * 5, behavior: 'auto' });
          break;

        case 'PINCH': {
          const now = Date.now();
          // Throttle pinch clicks to once every 800 ms
          if (now - lastPinchActionRef.current > 800) {
            lastPinchActionRef.current = now;
            // Convert normalised landmark[8] position to screen coords
            const tip = landmarks[8];
            // Mirror x for the flipped video
            const screenX = (1 - tip.x) * window.innerWidth;
            const screenY = tip.y * window.innerHeight;
            const el = document.elementFromPoint(screenX, screenY) as HTMLElement | null;
            if (el) el.click();
          }
          break;
        }

        case 'SWIPE_RIGHT':
          alert('Next page →');
          // Reset buffer so alert doesn't keep firing
          smootherRef.current.reset();
          break;

        case 'OPEN_HAND':
        case 'NONE':
        default:
          break;
      }
    },
    [settings],
  );

  return { result, processLandmarks };
}
