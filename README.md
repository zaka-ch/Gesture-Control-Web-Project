# GestureFlow — Gesture-Controlled Browser Tool

A fully working prototype that lets you control your browser using hand gestures detected in real time via your webcam. **No mouse or keyboard needed.**

## Tech Stack

- **Vite + React + TypeScript** — fast dev tooling
- **Tailwind CSS v4** — utility-first styling
- **MediaPipe Hands** (CDN) — 21-point hand landmark detection
- Runs **100% in the browser** — no backend required

## Features

| Gesture | Action |
|---|---|
| ☝️ Index Up | Scroll Up |
| ✊ Fist | Scroll Down |
| 🤏 Pinch | Click element under fingertip |
| 👉 Swipe Right | Next page (alert placeholder) |
| 🖐️ Open Hand | Idle / Neutral |

### Gesture Stabiliser
A rolling buffer (configurable 3–12 frames) prevents jitter — a gesture is only "confirmed" when all frames in the buffer agree.

### Settings Panel
- **Sensitivity** slider — buffer size (3–12 frames)
- **Scroll Speed** slider — px per frame (1–10)
- **Pinch Threshold** slider — max distance in px (10–60)
- Per-gesture **enable/disable** toggles
- **Reset to Defaults** button

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, click **Start Camera**, and allow webcam access.

## File Structure

```
src/
├── components/
│   ├── CameraView.tsx      # Video feed + canvas landmark overlay
│   ├── GestureHUD.tsx      # Live gesture + confidence display
│   └── SettingsPanel.tsx   # Settings sliders & toggles
├── lib/
│   ├── mediapipe.ts        # MediaPipe init + camera loop
│   ├── classifier.ts       # Pure function: landmarks → gesture name
│   └── smoother.ts         # Rolling-buffer gesture stabiliser
├── hooks/
│   ├── useCamera.ts        # Camera lifecycle + RAF draw loop
│   └── useGesture.ts       # Classify → smooth → dispatch actions
├── types.ts                # Shared TypeScript types
├── global.d.ts             # window.Hands / window.Camera declarations
└── App.tsx                 # Root layout
```

## Implementation Notes

- MediaPipe loaded via CDN `<script>` tags in `index.html` to avoid Vite bundling issues
- Video is mirrored (`scaleX(-1)`) for natural feel; landmark x-coordinates are compensated accordingly
- All gesture logic is in pure functions in `classifier.ts` — easy to extend or unit test
- `requestAnimationFrame` loop drives the canvas drawing; MediaPipe camera utility drives inference
