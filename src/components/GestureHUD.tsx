import React from 'react';
import { GestureResult, GestureName } from '../types';

interface GestureHUDProps {
  result: GestureResult;
}

const GESTURE_META: Record<GestureName, { label: string; icon: string; color: string }> = {
  INDEX_UP:   { label: 'Index Up',    icon: '☝️',  color: 'text-indigo-400' },
  FIST:       { label: 'Fist',        icon: '✊',  color: 'text-red-400'    },
  OPEN_HAND:  { label: 'Open Hand',   icon: '🖐️',  color: 'text-emerald-400'},
  SWIPE_RIGHT:{ label: 'Swipe Right', icon: '👉',  color: 'text-amber-400'  },
  PINCH:      { label: 'Pinch',       icon: '🤏',  color: 'text-purple-400' },
  NONE:       { label: 'No Gesture',  icon: '—',   color: 'text-slate-500'  },
};

const GestureHUD: React.FC<GestureHUDProps> = ({ result }) => {
  const meta = GESTURE_META[result.gesture];
  const confirmed = result.confirmed;
  const pct = Math.round((result.confidence / result.bufferSize) * 100);

  return (
    <div
      className={`
        glass rounded-2xl p-4 w-52 fade-in
        ${confirmed ? 'glow-green border-green-500/40' : ''}
        transition-all duration-300
      `}
      style={{ border: confirmed ? '1px solid rgba(34,197,94,0.4)' : undefined }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
          Gesture HUD
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            confirmed
              ? 'bg-green-500/20 text-green-400'
              : 'bg-slate-700/50 text-slate-500'
          }`}
        >
          {confirmed ? '● CONFIRMED' : '○ PENDING'}
        </span>
      </div>

      {/* Gesture name + icon */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl leading-none">{meta.icon}</span>
        <div>
          <p className={`text-base font-semibold leading-tight ${meta.color}`}>
            {meta.label}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {result.gesture === 'NONE' ? 'Show hand to camera' : 'Detected'}
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Confidence</span>
          <span className={confirmed ? 'text-green-400 font-semibold' : ''}>
            {result.confidence}/{result.bufferSize}
          </span>
        </div>

        {/* Segmented bar */}
        <div className="flex gap-1">
          {Array.from({ length: result.bufferSize }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-2 rounded-full transition-all duration-150"
              style={{
                background:
                  i < result.confidence
                    ? confirmed
                      ? 'rgb(34 197 94)'
                      : 'rgb(99 102 241)'
                    : 'rgb(30 41 59)',
              }}
            />
          ))}
        </div>

        {/* Percentage */}
        <p className="text-right text-[10px] text-slate-500">{pct}%</p>
      </div>

      {/* Action hint */}
      {confirmed && result.gesture !== 'NONE' && result.gesture !== 'OPEN_HAND' && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <ActionHint gesture={result.gesture} />
        </div>
      )}
    </div>
  );
};

function ActionHint({ gesture }: { gesture: GestureName }) {
  const hints: Partial<Record<GestureName, string>> = {
    INDEX_UP:    '↑ Scrolling up',
    FIST:        '↓ Scrolling down',
    PINCH:       '🖱 Clicking element',
    SWIPE_RIGHT: '→ Next page',
  };
  const hint = hints[gesture];
  if (!hint) return null;
  return (
    <p className="text-[11px] text-green-400 font-medium text-center animate-pulse">
      {hint}
    </p>
  );
}

export default GestureHUD;
