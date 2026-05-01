import React, { useEffect, useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { Landmark } from '../types';

interface CameraViewProps {
  onLandmarks: (lm: Landmark[], w: number, h: number) => void;
  onError: (msg: string) => void;
  isRunning: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ onLandmarks, onError, isRunning }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLandmarks = (lm: Landmark[]) => {
    const video = videoRef.current;
    const w = video?.videoWidth || 640;
    const h = video?.videoHeight || 480;
    onLandmarks(lm, w, h);
  };

  const { videoRef, canvasRef, start, stop } = useCamera({
    onLandmarks: handleLandmarks,
    onError,
  });

  useEffect(() => {
    if (isRunning) {
      start();
    } else {
      stop();
    }
  }, [isRunning, start, stop]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-2xl bg-black">
      {/* Live video — mirrored */}
      <video
        ref={videoRef}
        className="mirrored absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Canvas overlay for landmarks */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Corner decorators */}
      <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg opacity-70" />
      <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg opacity-70" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg opacity-70" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br-lg opacity-70" />

      {/* Status badge */}
      {isRunning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-indigo-300">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </div>
      )}
    </div>
  );
};

export default CameraView;
