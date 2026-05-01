import { useRef, useCallback, useEffect } from 'react';
import { initMediaPipe, stopMediaPipe } from '../lib/mediapipe';
import { Landmark } from '../types';

interface UseCameraOptions {
  onLandmarks: (lm: Landmark[]) => void;
  onError: (err: string) => void;
}

export function useCamera({ onLandmarks, onError }: UseCameraOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const landmarksRef = useRef<Landmark[]>([]);

  // Draw landmarks onto canvas using requestAnimationFrame
  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video display size
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth || canvas.offsetWidth;
      canvas.height = video.videoHeight || canvas.offsetHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lm = landmarksRef.current;
    if (lm.length === 21) {
      drawHand(ctx, lm, canvas.width, canvas.height);
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  const start = useCallback(async () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    try {
      await initMediaPipe(videoEl, {
        onResults: (landmarks) => {
          landmarksRef.current = landmarks;
          onLandmarks(landmarks);
        },
      });
      rafRef.current = requestAnimationFrame(drawLoop);
    } catch (err: any) {
      onError(err?.message ?? 'Failed to start camera or MediaPipe.');
    }
  }, [drawLoop, onLandmarks, onError]);

  const stop = useCallback(() => {
    stopMediaPipe();
    cancelAnimationFrame(rafRef.current);
    landmarksRef.current = [];
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, canvasRef, start, stop };
}

// ─── Hand drawing helpers ────────────────────────────────────────────────────

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],           // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],           // Index
  [5, 9], [9, 10], [10, 11], [11, 12],      // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],    // Ring
  [13, 17], [17, 18], [18, 19], [19, 20],   // Pinky
  [0, 17],                                   // Palm base
];

function px(lm: Landmark, w: number, h: number): { x: number; y: number } {
  // Video is mirrored via CSS, so we mirror x here too
  return { x: (1 - lm.x) * w, y: lm.y * h };
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  w: number,
  h: number,
) {
  // Draw connections
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#6366f1';
  ctx.shadowBlur = 8;

  for (const [a, b] of CONNECTIONS) {
    const pA = px(lm[a], w, h);
    const pB = px(lm[b], w, h);
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  // Draw landmark dots
  for (let i = 0; i < lm.length; i++) {
    const p = px(lm[i], w, h);
    const isTip = [4, 8, 12, 16, 20].includes(i);

    ctx.beginPath();
    ctx.arc(p.x, p.y, isTip ? 7 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? '#a5b4fc' : '#e0e7ff';
    ctx.shadowColor = isTip ? '#6366f1' : 'transparent';
    ctx.shadowBlur = isTip ? 12 : 0;
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}
