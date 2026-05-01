import React, { useState, useCallback } from 'react';
import CameraView from './components/CameraView';
import GestureHUD from './components/GestureHUD';
import SettingsPanel from './components/SettingsPanel';
import { useGesture } from './hooks/useGesture';
import { DEFAULT_SETTINGS } from './types';
import type { Settings } from './types';

const INITIAL_RESULT = {
  gesture: 'NONE',
  confidence: 0,
  confirmed: false,
  bufferSize: DEFAULT_SETTINGS.bufferSize,
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraRunning, setCameraRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { result, processLandmarks } = useGesture(settings);

  const handleLandmarks = useCallback(
    (lm: any[], w: number, h: number) => {
      processLandmarks(lm, w, h);
    },
    [processLandmarks],
  );

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setCameraRunning(false);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030712] flex flex-col">

      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 z-10"
        style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center glow-indigo">
            <span className="text-sm">🖐️</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              GestureFlow
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Hands-Free Browser Control</p>
          </div>
        </div>

        {/* Camera toggle */}
        <button
          id="camera-toggle-btn"
          onClick={() => {
            setError(null);
            setCameraRunning((r) => !r);
          }}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
            ${cameraRunning
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 glow-indigo'}
          `}
        >
          {cameraRunning ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              Stop Camera
            </>
          ) : (
            <>
              <span>📷</span>
              Start Camera
            </>
          )}
        </button>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="flex-1 relative flex gap-4 p-4 overflow-hidden">

        {/* Camera feed — takes most of the space */}
        <div className="flex-1 relative min-w-0">
          <CameraView
            onLandmarks={handleLandmarks}
            onError={handleError}
            isRunning={cameraRunning}
          />

          {/* Splash when not running */}
          {!cameraRunning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 rounded-2xl"
              style={{ background: 'rgba(3,7,18,0.85)' }}>
              <div className="text-6xl animate-bounce">🖐️</div>
              <div className="text-center">
                <p className="text-xl font-semibold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Ready to go hands-free?
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  Click <span className="text-indigo-400 font-medium">Start Camera</span> and allow webcam access
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-sm">
                {[
                  { icon: '☝️', label: 'Index Up', action: 'Scroll Up' },
                  { icon: '✊', label: 'Fist',      action: 'Scroll Down' },
                  { icon: '🤏', label: 'Pinch',     action: 'Click' },
                  { icon: '🖐️', label: 'Open Hand', action: 'Idle' },
                  { icon: '👉', label: 'Swipe',     action: 'Next Page' },
                  { icon: '—',  label: 'No Hand',   action: 'Waiting…' },
                ].map((g) => (
                  <div key={g.label} className="glass rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{g.icon}</div>
                    <p className="text-[11px] font-medium text-slate-300">{g.label}</p>
                    <p className="text-[10px] text-slate-500">{g.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{ background: 'rgba(3,7,18,0.9)' }}>
              <div className="glass rounded-2xl p-6 max-w-sm text-center space-y-3">
                <div className="text-4xl">⚠️</div>
                <p className="text-white font-semibold">Camera Error</p>
                <p className="text-sm text-slate-400">{error}</p>
                <button
                  onClick={() => { setError(null); setCameraRunning(true); }}
                  className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right side panel */}
        <div className="flex-shrink-0 w-56 flex flex-col gap-4 justify-start">

          {/* Gesture HUD — top right */}
          <GestureHUD result={cameraRunning ? result : INITIAL_RESULT} />

          {/* Gesture reference card */}
          <div className="glass rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-2">
              Gesture Guide
            </p>
            {[
              { icon: '☝️', g: 'INDEX UP',    a: '↑ Scroll Up'   },
              { icon: '✊', g: 'FIST',         a: '↓ Scroll Down' },
              { icon: '🤏', g: 'PINCH',        a: '🖱 Click'       },
              { icon: '👉', g: 'SWIPE RIGHT',  a: '→ Next Page'   },
              { icon: '🖐️', g: 'OPEN HAND',   a: 'Idle'          },
            ].map((r) => (
              <div key={r.g} className="flex items-center gap-2 text-[12px]">
                <span className="text-base w-6 text-center">{r.icon}</span>
                <span className="text-slate-400 flex-1">{r.g}</span>
                <span className="text-indigo-400 font-medium">{r.a}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Gear button (bottom right, outside right panel) ── */}
      <button
        id="settings-gear-btn"
        onClick={() => setSettingsOpen((o) => !o)}
        className={`
          fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center
          text-xl transition-all duration-300 z-40
          ${settingsOpen
            ? 'bg-indigo-600 text-white rotate-45 glow-indigo'
            : 'glass text-slate-400 hover:text-white hover:border-indigo-500/50'}
        `}
        title="Settings"
        style={{ transform: settingsOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
      >
        ⚙
      </button>

      {/* ── Settings panel ────────────────────────────────── */}
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          visible={settingsOpen}
        />
      )}
    </div>
  );
}
