import type { Landmark } from '../types';

// ─────────────────────────────────────────────
// MediaPipe Hands initialisation + camera loop
// Uses window.Hands and window.Camera injected
// from the CDN <script> tags in index.html.
// ─────────────────────────────────────────────

export interface MediaPipeCallbacks {
  onResults: (landmarks: Landmark[], worldLandmarks: Landmark[]) => void;
}

// Keep as singletons to prevent Emscripten FileSystem crashes (ErrnoError EEXIST)
let handsInstance: any = null;
let cameraInstance: any = null;
let isInitializing = false;

/** Initialise MediaPipe Hands and start the camera loop. */
export async function initMediaPipe(
  videoEl: HTMLVideoElement,
  callbacks: MediaPipeCallbacks,
): Promise<void> {
  if (isInitializing) return;
  isInitializing = true;
  
  try {
    // Wait for MediaPipe globals to be available
    await waitForMediaPipe();

    // Stop existing camera if running, but KEEP handsInstance alive!
    if (cameraInstance) {
      try { cameraInstance.stop(); } catch (_) {}
      cameraInstance = null;
    }

    // Only instantiate Hands once per page load to avoid WASM aborts
    if (!handsInstance) {
      handsInstance = new window.Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      await handsInstance.initialize();
    }

    // Always update the callback to the latest one
    handsInstance.onResults((results: any) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const lm: Landmark[] = results.multiHandLandmarks[0];
        const wlm: Landmark[] = results.multiHandWorldLandmarks?.[0] ?? [];
        callbacks.onResults(lm, wlm);
      } else {
        callbacks.onResults([], []);
      }
    });

    let isProcessing = false;
    cameraInstance = new window.Camera(videoEl, {
      onFrame: async () => {
        if (handsInstance && !isProcessing) {
          isProcessing = true;
          try {
            await handsInstance.send({ image: videoEl });
          } catch (e) {
            console.error('MediaPipe Error:', e);
          } finally {
            isProcessing = false;
          }
        }
      },
      width: 1280,
      height: 720,
    });

    await cameraInstance.start();
  } finally {
    isInitializing = false;
  }
}

/** Stop the camera and MediaPipe loop. */
export function stopMediaPipe(): void {
  // Only stop the camera, leave handsInstance initialized to prevent WASM FS errors
  if (cameraInstance) {
    try { cameraInstance.stop(); } catch (_) {}
    cameraInstance = null;
  }
}

/** Poll until window.Hands and window.Camera are available from CDN. */
function waitForMediaPipe(timeout = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.Hands && window.Camera) return resolve();
      if (Date.now() - start > timeout)
        return reject(new Error('MediaPipe CDN scripts did not load in time.'));
      setTimeout(check, 200);
    };
    check();
  });
}
