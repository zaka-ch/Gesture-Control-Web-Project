import React from 'react';
import { Settings, GestureName, DEFAULT_SETTINGS } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  visible: boolean;
}

const GESTURE_NAMES: GestureName[] = [
  'INDEX_UP',
  'FIST',
  'OPEN_HAND',
  'SWIPE_RIGHT',
  'PINCH',
];

const GESTURE_LABELS: Record<GestureName, string> = {
  INDEX_UP:    '☝️ Index Up — Scroll Up',
  FIST:        '✊ Fist — Scroll Down',
  OPEN_HAND:   '🖐️ Open Hand — Idle',
  SWIPE_RIGHT: '👉 Swipe Right — Next Page',
  PINCH:       '🤏 Pinch — Click Element',
  NONE:        '— None',
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onChange,
  onClose,
  visible,
}) => {
  const set = <K extends keyof Settings>(key: K, val: Settings[K]) =>
    onChange({ ...settings, [key]: val });

  const toggleGesture = (g: GestureName) =>
    onChange({
      ...settings,
      enabledGestures: {
        ...settings.enabledGestures,
        [g]: !settings.enabledGestures[g],
      },
    });

  return (
    <div
      className={`
        absolute top-0 right-0 bottom-0 w-72 glass-bright rounded-l-2xl
        flex flex-col overflow-hidden z-50
        ${visible ? 'slide-in' : 'slide-out'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div>
          <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Settings
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Tune gesture detection</p>
        </div>
        <button
          id="settings-close-btn"
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

        {/* Sensitivity / buffer size */}
        <SliderRow
          id="slider-buffer"
          label="Sensitivity"
          hint={`Buffer size: ${settings.bufferSize} frames`}
          min={3}
          max={12}
          step={1}
          value={settings.bufferSize}
          onChange={(v) => set('bufferSize', v)}
        />

        {/* Scroll speed */}
        <SliderRow
          id="slider-scroll"
          label="Scroll Speed"
          hint={`${settings.scrollSpeed * 5} px/frame`}
          min={1}
          max={10}
          step={1}
          value={settings.scrollSpeed}
          onChange={(v) => set('scrollSpeed', v)}
        />

        {/* Pinch threshold */}
        <SliderRow
          id="slider-pinch"
          label="Pinch Threshold"
          hint={`≤ ${settings.pinchThreshold} px between tips`}
          min={10}
          max={60}
          step={5}
          value={settings.pinchThreshold}
          onChange={(v) => set('pinchThreshold', v)}
        />

        {/* Gesture toggles */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-3">
            Enabled Gestures
          </p>
          <div className="space-y-2.5">
            {GESTURE_NAMES.map((g) => (
              <ToggleRow
                key={g}
                id={`toggle-${g}`}
                label={GESTURE_LABELS[g]}
                enabled={settings.enabledGestures[g]}
                onToggle={() => toggleGesture(g)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer — reset */}
      <div className="px-5 py-4 border-t border-slate-700/50">
        <button
          id="settings-reset-btn"
          onClick={() => onChange({ ...DEFAULT_SETTINGS })}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-slate-600 hover:border-indigo-500 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all duration-200"
        >
          ↺ Reset to Defaults
        </button>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SliderRowProps {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ id, label, hint, min, max, step, value, onChange }) => (
  <div>
    <div className="flex justify-between mb-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-200">{label}</label>
      <span className="text-xs text-indigo-400 font-mono">{hint}</span>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
      style={{
        background: `linear-gradient(to right, #6366f1 ${((value - min) / (max - min)) * 100}%, #1e293b ${((value - min) / (max - min)) * 100}%)`,
      }}
    />
    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
      <span>{min}</span>
      <span>{max}</span>
    </div>
  </div>
);

interface ToggleRowProps {
  id: string;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ id, label, enabled, onToggle }) => (
  <div className="flex items-center justify-between">
    <label htmlFor={id} className="text-[13px] text-slate-300 cursor-pointer select-none">
      {label}
    </label>
    <button
      id={id}
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full toggle-track flex-shrink-0 transition-colors duration-200 ${
        enabled ? 'bg-indigo-600' : 'bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow toggle-thumb ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export default SettingsPanel;
